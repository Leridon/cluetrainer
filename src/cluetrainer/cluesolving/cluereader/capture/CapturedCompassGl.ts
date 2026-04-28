import {WorldMesh} from "../../../../lib/alt1gl/ts/render/reflect3d";
import {Alt1GLCapturedFrame} from "../../../../lib/alt1gl/Alt1GLCapturedFrame";
import {CapturedCompass} from "./CapturedCompass";
import {CompassReader} from "../CompassReader";
import {Angles} from "../../../../lib/math/Angles";

export class CapturedCompassGl implements CapturedCompass {
  constructor(private readonly mesh: WorldMesh) {

  }

  getAngle(): CompassReader.AngleResult {
    const angle = Angles.normalizeAngle(Math.PI / 2 + this.mesh.position2d.yRotation)

    return {
      type: "success",
      fingerprint: null,
      angle: Angles.UncertainAngle.fromAngle(angle),
      raw_angle: angle
    }
  }

  isArcCompass(): boolean {
    return false;
  }
}

export namespace CapturedCompassGl {
  const COMPASS_ARROW_HASH = 1998275936

  export function findCompass(frame: Alt1GLCapturedFrame): CapturedCompassGl | null {
    for (const render of frame.renders) {
      if (!render.raw.program || !render.raw.uniformState) continue;

      const mesh = render.mesh.get()

      if (!mesh) continue

      if (mesh.cached.known.meshdatas[0].posbufferhash == COMPASS_ARROW_HASH) {
        return new CapturedCompassGl(mesh)
      }
    }

    return null
  }
}