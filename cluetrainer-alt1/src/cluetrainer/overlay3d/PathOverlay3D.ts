import {SimpleGLOverlay} from "./SimpleGLOverlay";
import {Path} from "../../lib/runescape/pathing";
import {Mesh} from "./meshes/Mesh";
import {buildPathsMesh} from "./PathRender";

export class PathOverlay3d extends SimpleGLOverlay {
  constructor(public readonly paths: Path[], mesh: Mesh) {
    super(mesh);
  }

  static async forPaths(paths: Path[]): Promise<PathOverlay3d> {
    return new PathOverlay3d(paths, (await buildPathsMesh(paths)).finalize())
  }
}