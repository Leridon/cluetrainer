import {GlOverlay, GlOverlayOption, GlProgram, RenderFilter} from "../ts/util/patchrs_napi";
import {Alt1GLVertexArray} from "./Alt1GLVertexArray";
import * as patchrs from "../ts/util/patchrs_napi";
import Behaviour from "../../ui/Behaviour";

export class Alt1GLOverlay extends Behaviour {
  private overlayHandle: GlOverlay | null = null;

  constructor(
    private readonly renderFilter: RenderFilter,
    private readonly program: GlProgram,
    private readonly vertexObjectId: Alt1GLVertexArray,
    private readonly overlayOptions: GlOverlayOption,
  ) {
    super()
  }

  protected begin() {
    this.overlayHandle = patchrs.native.beginOverlay(
      this.renderFilter,
      this.program,
      this.vertexObjectId.vertex_array,
      this.overlayOptions
    );
  }

  protected end() {
    this.overlayHandle?.stop();
    this.overlayHandle = null;
  }
}