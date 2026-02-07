import {GL_FLOAT, GL_UNSIGNED_BYTE, UniformSnapshotBuilder} from "../../lib/alt1gl/ts/overlays";
import {chunksize, fragshadermouse, tilesize, vertshadermousealpha} from "../../lib/alt1gl/ts/overlays/tilemarkers";
import {getUniformValue} from "../../lib/alt1gl/ts/render/renderprogram";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import {Path} from "../../lib/runescape/pathing";
import {mat4} from "gl-matrix";
import {Alt1GLVertexArray} from "../../lib/alt1gl/overlay/Alt1GLVertexArray";
import {buildPathMesh} from "./PathRender";
import {MeshBuilder} from "./MeshBuilder";
import {Alt1GLOverlay} from "../../lib/alt1gl/overlay/Alt1GLOverlay";

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;
const SKIP_PROGRAM_MASK = 1 << 5;
const KNOWN_CHUNK_MASK = 1 << 6;

function createPathOverlay(
  targetVertexObject: number,
  vertexArray: Alt1GLVertexArray,
  program: patchrs.GlProgram,
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
    {skipProgramMask: SKIP_PROGRAM_MASK, vertexObjectId: targetVertexObject},
    program,
    vertexArray,
    {
      uniformSources: uniformSources,
      uniformBuffer: uniforms.buffer
    }
  )
}

export class TileMarkersOverlay {
  private program: patchrs.GlProgram | null = null;
  private uniformSources: patchrs.OverlayUniformSource[] = [];
  private knownProgs = new WeakMap<patchrs.GlProgram, {}>();
  private chunks = new Map<string, Map<number, Alt1GLOverlay>>();  // Key: "chunkX,chunkZ" -> vertexObjectId -> chunk
  private stream: patchrs.StreamRenderObject | null = null;

  private vertexArray: Alt1GLVertexArray | null = null;

  private stopped = false;

  constructor() {
    this.initializeProgram();
  }

  private initializeProgram(): void {
    const uniformsBuilder = new UniformSnapshotBuilder({
      uModelMatrix: "mat4",
      uViewProjMatrix: "mat4"
    });

    this.uniformSources = [
      {type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix"}
    ];

    this.program = patchrs.native.createProgram(
      vertshadermousealpha,
      fragshadermouse,
      [
        {location: 0, name: "aPos", type: GL_FLOAT, length: 3},
        {location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4}
      ],
      uniformsBuilder.args
    );
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
    if (!this.program) return;

    this.stopped = false;

    this.stream = patchrs.native.streamRenderCalls({
      features: ["uniforms"],
      framecooldown: 2000,
      skipProgramMask: SKIP_PROGRAM_MASK,
      skipVerticesMask: KNOWN_CHUNK_MASK
    }, renders => {
      if (this.stopped) return;

      for (const render of renders) {
        if (!this.knownProgs.has(render.program)) {
          if (render.program.inputs.find(q => q.name == "aMaterialSettingsSlotXY3")) {
            this.knownProgs.set(render.program, {});
          } else {
            render.program.skipmask |= SKIP_PROGRAM_MASK;
            continue;
          }
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
          console.log("Creating overlay for VAO", render.vertexObjectId);

          vaoMap.set(render.vertexObjectId,
            createPathOverlay(render.vertexObjectId, this.vertexArray!, this.program!, this.uniformSources).start()
          );
        }
      }
    });
  }
}