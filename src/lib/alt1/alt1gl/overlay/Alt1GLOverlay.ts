import {Alt1GLVertexArray} from "./Alt1GLVertexArray";
import Behaviour from "../../../ui/Behaviour";
import {Alt1GLProgram} from "./Alt1GLProgram";
import {Alt1GLSession} from "../Alt1GLSession";
import {GlOverlay, GlOverlayOption, RenderFilter} from "../../alt1gllib/ts/util/alt1gltypes";

export class Alt1GLOverlay extends Behaviour {
  private overlayHandle: GlOverlay | null = null;

  constructor(
    private readonly session: Alt1GLSession,
    public readonly renderFilter: RenderFilter,
    public readonly program: Alt1GLProgram,
    public readonly vertexObjectId: Alt1GLVertexArray,
    public readonly overlayOptions: GlOverlayOption,
  ) {
    super()
  }

  protected begin() {
    if (!Alt1GLOverlay._pageunload_hook_created) {
      window.addEventListener("pagehide", () => {
        Alt1GLOverlay._active_overlays.forEach(overlay => overlay.stop())
      })
      Alt1GLOverlay._pageunload_hook_created = true
    }

    Alt1GLOverlay._active_overlays.push(this)

    console.log(`Starting overlay ${Alt1GLOverlay._active_overlays.length++}`)

    this.overlayHandle = this.session.raw().beginOverlay(
      this.renderFilter,
      this.program.get(),
      this.vertexObjectId.vertex_array,
      this.overlayOptions
    );
  }

  protected end() {
    Alt1GLOverlay._active_overlays.splice(Alt1GLOverlay._active_overlays.indexOf(this), 1)

    this.overlayHandle?.stop();
    this.overlayHandle = null;
  }

  private static _active_overlays: Alt1GLOverlay[] = []
  private static _pageunload_hook_created = false
}