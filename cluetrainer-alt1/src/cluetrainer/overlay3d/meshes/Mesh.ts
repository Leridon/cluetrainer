import {Alt1GLVertexArray} from "../../../lib/alt1/alt1gl/overlay/Alt1GLVertexArray";
import {lazy} from "../../../lib/Lazy";

export class Mesh {
  private _vertexArray = lazy(() => new Alt1GLVertexArray(this))

  constructor(public readonly vertices: Mesh.Vertex[],
              public readonly indices: number[]
  ) { }

  public vertexArray(): Alt1GLVertexArray { return this._vertexArray.get() }
}

export namespace Mesh {
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

    export function scale(factor: number, vector: Vector3): Vector3 {
      return {
        x: vector.x * factor,
        y: vector.y * factor,
        z: vector.z * factor,
      }
    }

    export function toString(vector: Vector3): string {
      return `(${vector.x}, ${vector.y}, ${vector.z})`
    }
  }

  export type Vertex = {
    pos: Vector3,
    color_rgba: ColorRGBA,
  }
}