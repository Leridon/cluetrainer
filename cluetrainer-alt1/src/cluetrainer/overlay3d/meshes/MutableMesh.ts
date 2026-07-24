import {Mesh} from "./Mesh";

export class MutableMesh {
  private vertices: Mesh.Vertex[] = []
  private indices: number[] = []

  vertexCount(): number {
    return this.vertices.length;
  }

  triangleCount(): number {
    return this.indices.length / 3;
  }

  createVertex(pos: Mesh.Vector3, color: Mesh.ColorRGBA = undefined): MutableMesh.VertexRef {
    const vertex: Mesh.Vertex = {pos, color_rgba: color ?? [255, 255, 255, 255]};
    this.vertices.push(vertex);
    return {index: this.vertices.length - 1, vertex};
  }

  triangle(v0: MutableMesh.VertexRef, v1: MutableMesh.VertexRef, v2: MutableMesh.VertexRef): void {
    this.indices.push(v0.index, v1.index, v2.index);
    this.indices.push(v0.index, v2.index, v1.index);
  }

  quad(v0: MutableMesh.VertexRef, v1: MutableMesh.VertexRef, v2: MutableMesh.VertexRef, v3: MutableMesh.VertexRef): void {
    this.indices.push(v0.index, v1.index, v2.index, v0.index, v2.index, v3.index);
    this.indices.push(v0.index, v2.index, v1.index, v0.index, v3.index, v2.index);
  }

  translate(offset: Mesh.Vector3): this {
    this.vertices.forEach(v => {
      v.pos.x += offset.x;
      v.pos.y += offset.y;
      v.pos.z += offset.z;
    })

    return this
  }

  scale(scale: number): this {
    this.vertices.forEach(v => {
      v.pos.x *= scale;
      v.pos.y *= scale;
      v.pos.z *= scale;
    })

    return this
  }

  recolor(color: Mesh.ColorRGBA): this {
    this.vertices.forEach(v => v.color_rgba = color);
    return this
  }

  add(...meshes: MutableMesh[]): this {
    for (const mesh of meshes) {
      const mapped_indices = mesh.indices.map(i => i + this.vertices.length);

      this.vertices.push(...mesh.vertices);
      this.indices.push(...mapped_indices);
    }
    return this
  }

  finalize(): Mesh {
    return new Mesh([...this.vertices], [...this.indices]);
  }
}

export namespace MutableMesh {
  export type VertexRef = {
    vertex: Mesh.Vertex,
    index: number
  }
}