import {observe} from "../../../lib/reactive";
import {Scans} from "../../model/clues/Scans";
import {MutableMesh} from "../../overlay3d/meshes/MutableMesh";
import Behaviour from "../../../lib/ui/Behaviour";
import {lazy} from "../../../lib/Lazy";
import {Alt1GLCapturedFrame} from "../../../lib/alt1/alt1gl/Alt1GLCapturedFrame";
import {Alt1GLFrameStream} from "../../../lib/alt1/alt1gl/Alt1GLFrameStream";
import {getUniformValue} from "../../../lib/alt1/alt1gllib/ts/render/renderprogram";
import {Alt1} from "../../../lib/alt1/Alt1";
import {CompassReader} from "./CompassReader";
import {Vector2} from "../../../lib/math";
import lodash from "lodash";
import Vector3 = Mesh.Vector3;
import PulseRing = Scans.PulseRing;
import {Mesh} from "../../overlay3d/meshes/Mesh";

export type TrackedPlayerPosition = {
  position_3d: Vector3,
  tile: Vector2
}

export namespace TrackedPlayerPosition {
  export function fromPosition(pos: Vector3): TrackedPlayerPosition {
    if (!pos) return null
    return {
      position_3d: pos,
      tile: Vector2.snap({x: pos.x, y: pos.z})
    }
  }
}

export type PlayerState = {
  position: TrackedPlayerPosition;
  pulse_type: PulseRing | null;
  compass_angle: CompassReader.AngleResult.Success | null
}

export type FramedValue<T> = {
  frame: number;
  value: T;
};

export class PlayerStateTracking extends Behaviour {
  public framed_state = observe<FramedValue<PlayerState>>(null).structuralEquality()
  public state = this.framed_state.map(v => v?.value).structuralEquality()

  private stream: Alt1GLFrameStream | undefined;

  constructor() {
    super()

    this.state.subscribe(v => {

      //console.log(`Pos ${v.position.x.toFixed(2)}|${v.position.y.toFixed(2)}|${v.position.z.toFixed(2)}, Pulse ${v.pulse_type}`)
    })
  }

  protected begin() {

    if (Alt1.instance().featureGL()) {
      console.log("Starting player state tracking")

      this.stream = Alt1GLCapturedFrame.subscribe({
        features: [/*"vertexarray", */"uniforms"],
        framecooldown: 600,
      }, (frame) => {
        this.framed_state.set(PlayerStateTracking.parsePlayerState(frame));
      });

      this.lifetime_manager.bind(this.stream)
    } else {
      console.log("Alt1GL not available, skipping player state tracking")
    }
  }

  protected end() {
    console.log("Stopping player state tracking")
    this.stream?.endLifetime();
    this.stream = null
  }

  static _instance = lazy(() => new PlayerStateTracking().start())

  public static instance() {
    return PlayerStateTracking._instance.get()
  }
}

export namespace PlayerStateTracking {
  export function parsePlayerState(frame: Alt1GLCapturedFrame): FramedValue<PlayerState> {
    const position = PlayerStateTracking.detectPlayerPosition(frame);
    const scan_pulse = PlayerStateTracking.detectPulseRing(frame, position)
    const compass = null // CapturedCompassGl.findCompass(frame)

    return {
      frame: frame.frame_number,
      value: {
        position: TrackedPlayerPosition.fromPosition(position),
        pulse_type: scan_pulse,
        compass_angle: compass?.getAngle()
      }
    }
  }

  export function detectPlayerPosition(frame: Alt1GLCapturedFrame): Vector3 {
    const TILESIZE = 512;

    for (let render of frame.renders) {

      if (!render.progmeta.get().isTinted || !render.progmeta.get().uTint || !render.progmeta.get().uModelMatrix || !render.progmeta.get().isAnimated) continue;
      if (typeof render.raw.program.fragmentShader?.source !== 'string') continue;
      if (typeof render.raw.program.vertexShader?.source !== 'string') continue;
      try {
        const tint = getUniformValue(render.raw.uniformState, render.progmeta.get().uTint)[0] as number[];
        if (!tint || tint.length < 4) continue;
        if (Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]) > 0.1 || tint[3] > 0.6) continue;

        const m = getUniformValue(render.raw.uniformState, render.progmeta.get().uModelMatrix)[0] as number[];
        if (!m || m.length < 16) continue;
        const x = m[12] / TILESIZE - 0.5, y = m[13] / TILESIZE, z = m[14] / TILESIZE - 0.5;
        return (x === 0 && z === 0) ? null : {x, y, z};
      } catch { }
    }

    return null
  }

  function toTile(worldCoord: number) {
    return Math.floor(worldCoord / 512 + 1e-3);
  }

  /**
   * Detects the current pulse ring from a captured frame.
   * @param frame The frame to search in.
   * @param position The already known player position. Required for filtering false positives.
   */
  export function detectPulseRing(frame: Alt1GLCapturedFrame, position: Vector3): PulseRing | null {
    if (!position) return null

    for (let render of frame.renders) {
      if (!render.progmeta.get().isAnimated || !render.progmeta.get().isMainMesh) continue

      try {
        if (!render.raw.renderRanges) continue;

        const verts = lodash.sumBy(render.raw.renderRanges, r => r.length);
        const m = getUniformValue(render.raw.uniformState, render.progmeta.get().uModelMatrix)[0];
        if (toTile(m[12]) !== position.x || toTile(m[14]) !== position.z) continue;
        if (verts === 576) return 1;
        if (verts === 864) return 2;
        if (verts === 1728) return 3;
      } catch {}
    }
    return null;
  }
}