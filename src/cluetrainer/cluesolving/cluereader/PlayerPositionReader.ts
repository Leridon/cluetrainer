import * as patchrs from "../../../lib/alt1gl/ts/util/patchrs_napi";
import {StreamRenderObject} from "../../../lib/alt1gl/ts/util/patchrs_napi";
import {getProgramMeta, getRenderFunc, getUniformValue} from "../../../lib/alt1gl/ts/render/renderprogram";
import {Observable, observe} from "../../../lib/reactive";
import {Scans} from "../../model/clues/Scans";
import {MeshBuilder} from "../../overlay3d/meshes/MeshBuilder";
import Behaviour from "../../../lib/ui/Behaviour";
import {Alt1GL} from "../../../lib/alt1gl/Alt1GL";
import {BufferCache} from "../../../lib/alt1gl/ts/programs/filteredstate";
import {Angles} from "../../../lib/math/Angles";
import Vector3 = MeshBuilder.Vector3;
import radiansToDegrees = Angles.radiansToDegrees;

export class PlayerStateTracking extends Behaviour {
  public player_position: Observable<Vector3 | null> = observe(null);
  public pulse_type: Observable<Scans.PulseRing | null> = observe(null);

  private cache: BufferCache = new BufferCache();
  private stream: StreamRenderObject | undefined;

  constructor() {
    super()
  }

  protected begin() {
    console.log("Starting player state tracking")

    this.stream = Alt1GL.instance().native.streamRenderCalls({
      features: ["full"],
      framecooldown: 600,
    }, (renders) => {
      this.parsePlayerState(renders);
    });
  }

  protected end() {
    this.stream?.close();
    this.stream = null
  }

  private parsePlayerState(renders: patchrs.RenderInvocation[]): void {
    console.log("Parsing player state from renders")
    let position: Vector3 | null = null;
    let pulseRing: Scans.PulseRing | null = null;

    this.detectCompassAngle(renders);

    for (const render of renders) {
      if (!render.program || !render.uniformState) continue;

      let progmeta: ReturnType<typeof getProgramMeta>;

      try {
        progmeta = getProgramMeta(render.program);
      } catch {
        continue;
      }

      // Look for player position if we haven't found it yet
      position = position ?? this.detectPlayerPosition(render, progmeta)

      // Look for pulse ring if we haven't found it yet
      pulseRing = pulseRing ?? this.detectPulseRing(render, progmeta);

      // Exit if we found both
      if (position != null && pulseRing != null) {
        break;
      }
    }

    this.player_position.set(position)
    this.pulse_type.set(pulseRing)
  }

  private detectCompassAngle(renders: patchrs.RenderInvocation[]): number | null {
    for (const render of renders) {
      if (!render.program || !render.uniformState) continue;

      const mesh = this.cache.getMeshData(render)

      if (!mesh) continue

      if (mesh.cached.known.meshdatas[0].posbufferhash == 1998275936) {

        // The angle is very accurate but still needs to be calibrated. Seems off by up to multiple degrees
        const angle = Angles.normalizeAngle(Math.PI / 2 + mesh.position2d.yRotation)

        console.log(`Frame ${render.framenr}, Angle: ${radiansToDegrees(angle).toFixed(1)}°`)
      }
    }

    console.log("Compass not found")

    return null;
  }

  private detectPlayerPosition(render: patchrs.RenderInvocation, progmeta: ReturnType<typeof getProgramMeta>): Vector3 {
    const TILESIZE = 512;

    const hasFrag = typeof render.program.fragmentShader?.source === 'string';
    const hasVert = typeof render.program.vertexShader?.source === 'string';
    if (!hasFrag || !hasVert) return null;

    if (!progmeta.isTinted || !progmeta.uTint || !progmeta.uModelMatrix) return null;
    if (!progmeta.isAnimated) return null;

    try {
      const tint = getUniformValue(render.uniformState, progmeta.uTint)[0] as number[];
      if (!tint || tint.length < 4) return null;

      const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
      if (rgbSum > 0.1 || tint[3] > 0.6) return null;

      const matrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as number[];
      if (!matrix || matrix.length < 16) return null;

      const x = Math.round(matrix[12] / TILESIZE) - 2;
      const y = matrix[13] / TILESIZE;
      const z = Math.round(matrix[14] / TILESIZE) - 1;

      if (x === 0 && z === 0) return null;
      return {x, y, z};
    } catch (error) {
      // ignore errors
    }
    return null;
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
}