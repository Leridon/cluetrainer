import Behaviour from "../../lib/ui/Behaviour";
import {Alt1GL} from "../../lib/alt1gl/Alt1GL";
import {Path} from "../../lib/runescape/pathing";
import {SimpleGLOverlay} from "./SimpleGLOverlay";
import {buildPathMesh} from "../tile_markers/PathRender";

export class PathOverlayControl extends Behaviour {
  private _overlay: SimpleGLOverlay[] = [];

  public async setIngameOverlays(paths: Path[]): Promise<void> {
    if (!Alt1GL.exists()) return;

    this.reset()

    paths = paths.filter(p => !!p && p.length > 0);

    if (paths.length === 0) return;

    for (const path of paths) {
      this._overlay.push(
        new SimpleGLOverlay(
          (await buildPathMesh(path)).finalize()
        ).start()
      )
    }
  }

  protected begin() {
  }

  public reset() {
    if (this._overlay) {
      this._overlay.forEach(o => o.stop());
      this._overlay = [];
    }
  }

  protected end() {
    this.reset();
  }
}