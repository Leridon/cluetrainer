import {MeshBuilder} from "../../../trainer/tile_markers/MeshBuilder";
import {Alt1GL} from "../Alt1GL";
import {GL_FLOAT, GL_UNSIGNED_BYTE} from "../ts/overlays";
import {VertexArraySnapshot} from "../ts/util/patchrs_napi";

export class Alt1GLVertexArray {
  public readonly vertex_array: VertexArraySnapshot

  constructor(mesh: MeshBuilder) {
    console.log(`Creating vertex array ${mesh.triangleCount()}`)

    const combined = mesh.finalize();

    this.vertex_array = Alt1GL.instance().native.createVertexArray(combined.index, [
      {location: 0, buffer: combined.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3},
      {location: 6, buffer: combined.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 4},
    ]);
  }
}
