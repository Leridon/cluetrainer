import {Mesh} from "../../../../cluetrainer/overlay3d/meshes/Mesh";
import {VertexArraySnapshot} from "../../alt1gllib/ts/util/alt1gltypes";
import {GL_FLOAT, GL_UNSIGNED_BYTE} from "../../alt1gllib/ts/overlays";
import {Alt1} from "../../Alt1";

export class Alt1GLVertexArray {
  public readonly vertex_array: VertexArraySnapshot

  constructor(mesh: Mesh) {
    const position_buffer = new Uint8Array(Float32Array.from(mesh.vertices.flatMap(v => [v.pos.x, v.pos.y, v.pos.z])).buffer)
    const color_buffer = new Uint8Array(Uint8Array.from(mesh.vertices.flatMap(v => v.color_rgba)).buffer)
    const index_buffer = new Uint8Array(Uint16Array.from(mesh.indices).buffer)

    this.vertex_array = Alt1.instance().opengl().get().createVertexArray(index_buffer, [
      {location: 0, buffer: position_buffer, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3},
      {location: 6, buffer: color_buffer, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 4},
    ]);
  }
}
