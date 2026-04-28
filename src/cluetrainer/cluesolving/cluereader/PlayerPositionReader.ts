import * as patchrs from "../../../lib/alt1gl/ts/util/patchrs_napi";
import {getProgramMeta, getRenderFunc, getUniformValue} from "../../../lib/alt1gl/ts/render/renderprogram";
import {observe} from "../../../lib/reactive";
import {Scans} from "../../model/clues/Scans";
import {MeshBuilder} from "../../overlay3d/meshes/MeshBuilder";
import Behaviour from "../../../lib/ui/Behaviour";
import {Alt1GL} from "../../../lib/alt1gl/Alt1GL";
import {BufferCache} from "../../../lib/alt1gl/ts/programs/filteredstate";
import {lazy} from "../../../lib/Lazy";
import {Alt1GLCapturedFrame} from "../../../lib/alt1gl/Alt1GLCapturedFrame";
import {Alt1GLFrameStream} from "../../../lib/alt1gl/Alt1GLFrameStream";
import Vector3 = MeshBuilder.Vector3;
import PulseRing = Scans.PulseRing;

export type PlayerState = {
  position: Vector3;
  pulse_type: PulseRing;
}

export type FramedValue<T> = {
  frame: number;
  value: T;
};

export class PlayerStateTracking extends Behaviour {
  public framed_state = observe<FramedValue<PlayerState>>(null).structuralEquality()
  public state = this.framed_state.map(v => v?.value).structuralEquality()

  private cache: BufferCache = new BufferCache();
  private stream: Alt1GLFrameStream | undefined;

  constructor() {
    super()

    this.state.subscribe(v => {
      console.log(`Pos ${v.position.x.toFixed(2)}|${v.position.y.toFixed(2)}|${v.position.z.toFixed(2)}, Pulse ${v.pulse_type}`)
    })
  }

  protected begin() {

    if (Alt1GL.exists()) {
      console.log("Starting player state tracking")

      this.stream = Alt1GLCapturedFrame.subscribe({
        features: ["vertexarray", "uniforms"],
        framecooldown: 600,
      }, (frame) => {
        //console.log(`Got renders ${frame.renders.length}`)
        this.parsePlayerState(frame);
      });

      console.log(this.stream)
    } else {
      console.log("Alt1GL not available, skipping player state tracking")
    }
  }

  protected end() {
    console.log("Stopping player state tracking")
    this.stream?.endLifetime();
    this.stream = null
  }

  private parsePlayerState(frame: Alt1GLCapturedFrame): void {
    if (frame.renders.length == 0) {
      console.log("No renders")
      return;
    }

    // Look for player position
    let position: Vector3 | null = this.detectPlayerPosition(frame);

    let pulseRing: Scans.PulseRing | null = null;

    for (const render of frame.renders) {
      if (!render.raw.program || !render.raw.uniformState) continue;

      let progmeta: ReturnType<typeof getProgramMeta>;

      try {
        progmeta = getProgramMeta(render.raw.program);
      } catch {
        continue;
      }


      // Look for pulse ring if we haven't found it yet
      pulseRing = pulseRing ?? this.detectPulseRing(render.raw, progmeta);

      // Exit if we found both
      if (position != null && pulseRing != null) {
        break;
      }
    }

    this.framed_state.set({
      frame: frame.frame_number,
      value: {
        position: position,
        pulse_type: pulseRing,
      }
    })
  }

  private detectPlayerPosition(frame: Alt1GLCapturedFrame): Vector3 {
    const TILESIZE = 512;

    const candidates: { render: Alt1GLCapturedFrame.Render, position: Vector3 }[] = [];

    for (let render of frame.renders) {
      const hasFrag = typeof render.raw.program.fragmentShader?.source === 'string';
      const hasVert = typeof render.raw.program.vertexShader?.source === 'string';
      if (!hasFrag || !hasVert) return null;

      const progmeta = render.progmeta.get();

      if (!progmeta.isTinted || !progmeta.uTint || !progmeta.uModelMatrix) return null;
      if (!progmeta.isAnimated) return null;


      try {
        const tint = getUniformValue(render.raw.uniformState, progmeta.uTint)[0] as number[];
        if (!tint || tint.length < 4) return null;

        const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
        if (rgbSum > 0.1 || tint[3] > 0.6) return null;

        const matrix = getUniformValue(render.raw.uniformState, progmeta.uModelMatrix)[0] as number[];
        if (!matrix || matrix.length < 16) return null;

        const x = matrix[12] / TILESIZE - 0.5;
        const y = matrix[13] / TILESIZE;
        const z = matrix[14] / TILESIZE - 0.5; // Translate so that .0 = center of tile

        if (x === 0 && z === 0) continue;

        candidates.push({render: render, position: {x, y, z}})
      } catch (error) {
        // ignore errors
      }
    }

    console.log(candidates.length, "candidates found")
    console.log(candidates)

    return candidates[0]?.position ?? null;
  }

  private detectPulseRing(render: patchrs.RenderInvocation, progmeta: ReturnType<typeof getProgramMeta>): Scans.PulseRing {
    try {
      // get vertex count from render ranges
      const vertexCount = render.renderRanges?.reduce((sum: number, r: patchrs.RenderRange) => sum + r.length, 0) || 0;

      // Ring signature: the ring mesh has 576 verts, maybe we can find a better way ?
      // 576 blue
      // red 1728
      // orange 864
      if ((vertexCount === 576 || vertexCount === 1728 || vertexCount === 864) && progmeta.isAnimated && progmeta.isMainMesh) {
        // Sample vertex colors to determine ring type
        const renderfunc = getRenderFunc(render);
        if (renderfunc.progmeta.aColor) {
          const colorGetter = renderfunc.getters[renderfunc.progmeta.aColor.name];
          // Sample first few vertices
          let blueCount = 0;
          let orangeCount = 0;
          let redCount = 0;

          const samplesToCheck = Math.min(10, renderfunc.nvertices);

          for (let i = 0; i < samplesToCheck; i++) {
            const r = colorGetter(i, 0) / 255;
            const g = colorGetter(i, 1) / 255;
            const b = colorGetter(i, 2) / 255;

            // Blue ring: blue channel dominant
            if (b > 0.3 && b > r * 1.5 && b > g * 1.5) {
              blueCount++;
            }
            // Orange ring: red and green high, blue low
            else if (r > 0.3 && g > 0.2 && r > b * 1.5 && g > b * 1.2) {
              orangeCount++;
            }
            // Red ring: red channel dominant
            else if (r > 0.3 && r > g * 1.5 && r > b * 1.5) {
              redCount++;
            }
          }

          // Check which color is most prominent (at least 75% of samples)
          const threshold = samplesToCheck * 0.75;
          if (blueCount >= threshold) {
            console.info("[PlayerState] BLUE PULSE RING DETECTED: verts:", vertexCount, "blue samples:", blueCount + "/" + samplesToCheck);
            return 1;
          } else if (orangeCount >= threshold) {
            console.info("[PlayerState] ORANGE PULSE RING DETECTED: verts:", vertexCount, "orange samples:", orangeCount + "/" + samplesToCheck);
            return 2;
          } else if (redCount >= threshold) {
            console.info("[PlayerState] RED PULSE RING DETECTED: verts:", vertexCount, "red samples:", redCount + "/" + samplesToCheck);
            return 3;
          }
        }
      }
    } catch {
      // ignore errors
    }

    return null;
  }

  static _instance = lazy(() => new PlayerStateTracking().start())

  public static instance() {
    return PlayerStateTracking._instance.get()
  }
}