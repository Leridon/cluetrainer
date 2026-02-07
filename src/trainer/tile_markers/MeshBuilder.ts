import {Vector2} from "../../lib/math";

export class MeshBuilder {
  private vertices: MeshBuilder.Vertex[] = []
  private indices: number[] = []

  vertexCount(): number {
    return this.vertices.length;
  }

  triangleCount(): number {
    return this.indices.length / 3;
  }

  createVertex(pos: MeshBuilder.Vector3, color: MeshBuilder.ColorRGBA): MeshBuilder.Vertex {
    const vertex: MeshBuilder.Vertex = {pos, color_rgba: color, index: this.vertices.length};
    this.vertices.push(vertex);
    return vertex;
  }

  triangle(v0: MeshBuilder.Vertex, v1: MeshBuilder.Vertex, v2: MeshBuilder.Vertex): void {
    this.indices.push(v0.index, v1.index, v2.index);
    this.indices.push(v0.index, v2.index, v1.index);
  }

  quad(v0: MeshBuilder.Vertex, v1: MeshBuilder.Vertex, v2: MeshBuilder.Vertex, v3: MeshBuilder.Vertex): void {
    this.indices.push(v0.index, v1.index, v2.index, v0.index, v2.index, v3.index);
    this.indices.push(v0.index, v2.index, v1.index, v0.index, v3.index, v2.index);
  }

  move(offset: MeshBuilder.Vector3): void {
    this.vertices.forEach(v => {
      v.pos.x += offset.x;
      v.pos.y += offset.y;
      v.pos.z += offset.z;
    })
  }

  scale(scale: number): void {
    this.vertices.forEach(v => {
      v.pos.x *= scale;
      v.pos.y *= scale;
      v.pos.z *= scale;
    })
  }

  finalize(): MeshBuilder.MeshData {
    return {
      pos: new Uint8Array(Float32Array.from(this.vertices.flatMap(v => [v.pos.x, v.pos.y, v.pos.z])).buffer),
      color: new Uint8Array(Uint8Array.from(this.vertices.flatMap(v => v.color_rgba)).buffer),
      index: new Uint8Array(Uint16Array.from(this.indices).buffer)
    };
  }
}

export namespace MeshBuilder {
  export type ColorRGBA = [number, number, number, number];

  export type Vector3 = { x: number, y: number, z: number };

  export namespace Vector3 {
    export function add(...a: Vector3[]): Vector3 {
      return {
        x: a.map(v => v.x).reduce((c, d) => c + d, 0),
        y: a.map(v => v.y).reduce((c, d) => c + d, 0),
        z: a.map(v => v.z).reduce((c, d) => c + d, 0),
      }
    }
  }

  export type Vertex = {
    pos: Vector3,
    color_rgba: ColorRGBA,
    index: number | undefined
  }

  export type MeshData = {
    pos: Uint8Array,
    color: Uint8Array,
    index: Uint8Array,
  }
}