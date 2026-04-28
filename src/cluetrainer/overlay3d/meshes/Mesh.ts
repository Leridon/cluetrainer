import {MeshBuilder} from "./MeshBuilder";
import {Alt1GLVertexArray} from "../../../lib/alt1gl/overlay/Alt1GLVertexArray";
import {lazy} from "../../../lib/Lazy";

export class Mesh {
  private _vertexArray = lazy(() => new Alt1GLVertexArray(this))

  constructor(public readonly vertices: MeshBuilder.Vertex[],
              public readonly indices: number[]
  ) { }

  public vertexArray(): Alt1GLVertexArray { return this._vertexArray.get() }
}