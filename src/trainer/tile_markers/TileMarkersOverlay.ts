import {GL_FLOAT, GL_UNSIGNED_BYTE, UniformSnapshotBuilder} from "../../lib/alt1gl/ts/overlays";
import {chunksize, tilesize} from "../../lib/alt1gl/ts/overlays/tilemarkers";
import {getUniformValue} from "../../lib/alt1gl/ts/render/renderprogram";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import {Path} from "../../lib/runescape/pathing";
import {mat4} from "gl-matrix";
import {Alt1GLVertexArray} from "../../lib/alt1gl/overlay/Alt1GLVertexArray";
import {buildPathMesh} from "./PathRender";
import {MeshBuilder} from "./MeshBuilder";
import {Alt1GLOverlay} from "../../lib/alt1gl/overlay/Alt1GLOverlay";
import {lazy} from "../../lib/Lazy";
import {Alt1GLProgram} from "../../lib/alt1gl/overlay/Alt1GLProgram";

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;
const SKIP_PROGRAM_MASK = 1 << 5;
const KNOWN_CHUNK_MASK = 1 << 6;

function createPathOverlay(
  targetVertexObject: number,
  vertexArray: Alt1GLVertexArray,
  program: Alt1GLProgram,
  uniformSources: patchrs.OverlayUniformSource[]
): Alt1GLOverlay {
  // TODO: This is a temporary function to use while refactoring. Probably won't exist in the final version

  const uniforms = new UniformSnapshotBuilder({
    uModelMatrix: "mat4",
    uViewProjMatrix: "mat4"
  });

  const world_matrix = mat4.create();

  mat4.fromScaling(world_matrix, [TILE_SIZE, TILE_SIZE, TILE_SIZE])

  uniforms.mappings.uModelMatrix.write(
    world_matrix as number[]
  );

  return new Alt1GLOverlay(
    {skipProgramMask: SKIP_PROGRAM_MASK, vertexObjectId: targetVertexObject, maxPerFrame: 2},
    program,
    vertexArray,
    {
      uniformSources: uniformSources,
      uniformBuffer: uniforms.buffer
    }
  )
}

export class TileMarkersOverlay {
  private program = TileMarkersOverlay.program.get();

  private uniformSources: patchrs.OverlayUniformSource[] = [];
  private chunks = new Map<string, Map<number, Alt1GLOverlay>>();  // Key: "chunkX,chunkZ" -> vertexObjectId -> chunk
  private stream: patchrs.StreamRenderObject | null = null;

  private vertexArray: Alt1GLVertexArray | null = null;

  private stopped = false;

  constructor() {
    this.initializeProgram();
  }

  private initializeProgram(): void {
    this.uniformSources = [
      {type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix"}
    ];
  }

  async draw(paths: Path[]): Promise<void> {
    await this.setPaths(paths);
    this.start();
  }

  stop(): void {
    this.stopped = true;
    this.stream?.close();
    this.chunks.forEach(vaoMap => vaoMap.forEach(chunk => chunk.stop()));
    this.chunks.clear();
  }

  private async setPaths(paths: Path[]): Promise<void> {
    const builder = new MeshBuilder()

    for (let path of paths) {
      await buildPathMesh(path, builder)
    }

    this.vertexArray = new Alt1GLVertexArray(builder)
  }

  private start(): void {
    this.stopped = false;

    this.stream = patchrs.native.streamRenderCalls({
      features: ["uniforms"],
      framecooldown: 2000,
      skipProgramMask: SKIP_PROGRAM_MASK,
    }, renders => {
      console.log(renders.length)
      debugger

      if (this.stopped) return;

      for (const render of renders) {
        if (!render.program.inputs.find(q => q.name == "aMaterialSettingsSlotXY3")) {
          // Mark irrelevant programs with our skip mask
          render.program.skipmask |= SKIP_PROGRAM_MASK;
          continue;
        }

        const uniform = getUniformValue(render.uniformState, render.program.uniforms.find(q => q.name == "uModelMatrix")!);
        const chunkX = Math.floor(uniform[0][12] / CHUNK_SIZE / TILE_SIZE);
        const chunkZ = Math.floor(uniform[0][14] / CHUNK_SIZE / TILE_SIZE);

        const chunkKey = `${chunkX},${chunkZ}`;

        // Create overlay for each VAO seen for this chunk
        if (!this.chunks.has(chunkKey)) {
          this.chunks.set(chunkKey, new Map());
        }
        const vaoMap = this.chunks.get(chunkKey)!;
        if (!vaoMap.has(render.vertexObjectId)) {
          vaoMap.set(render.vertexObjectId,
            createPathOverlay(render.vertexObjectId, this.vertexArray!, this.program, this.uniformSources).start()
          );
        }
      }
    });
  }
}

export namespace TileMarkersOverlay {
  export const program = lazy(() => {
    const vertshader = `
    #version 330 core
    layout (location = 0) in vec3 aPos;
    layout (location = 6) in vec4 aColor;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    uniform highp vec2 uMouse;
    out vec4 ourColor;
    out vec3 FragPos;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        gl_Position = uViewProjMatrix * worldpos;
        FragPos = worldpos.xyz/worldpos.w;
        ourColor = aColor;
    }`;

    const fragshader = `
    #version 330 core
    in vec4 ourColor;
    out vec4 FragColor;
    void main() {
        FragColor = ourColor;
    }`;

    return new Alt1GLProgram(
      vertshader,
      fragshader,
      [
        {location: 0, name: "aPos", type: GL_FLOAT, length: 3},
        {location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4}
      ],
      new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4"
      }).args
    )
  })
}