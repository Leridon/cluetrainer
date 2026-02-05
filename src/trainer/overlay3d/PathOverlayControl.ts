import Behaviour from "../../lib/ui/Behaviour";
import {Alt1GL} from "../../lib/alt1gl/Alt1GL";
import {Path} from "../../lib/runescape/pathing";
import {TileMarkersOverlay} from "../tile_markers/TileMarkersOverlay";

export class PathOverlayControl extends Behaviour {
  private _overlay: TileMarkersOverlay | null = null;

  public setIngameOverlays(paths: Path[]): void {
    if (!Alt1GL.exists()) return;

    this.reset()

    paths = paths.filter(p => !!p && p.length > 0);
    if (paths.length === 0) return;

    this._overlay = new TileMarkersOverlay();
    this._overlay.draw(paths);
  }

  protected begin() {
  }

  public reset() {
    if (this._overlay) {
      this._overlay.stop();
      this._overlay = null;
    }
  }

  protected end() {
    this.reset();
  }
}