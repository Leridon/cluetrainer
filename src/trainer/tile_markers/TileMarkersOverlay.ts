import {GL_FLOAT, GL_UNSIGNED_BYTE, UniformSnapshotBuilder} from "../../lib/alt1gl/ts/overlays";
import {chunksize, fragshadermouse, tilesize, vertshadermousealpha} from "../../lib/alt1gl/ts/overlays/tilemarkers";
import {getUniformValue} from "../../lib/alt1gl/ts/render/renderprogram";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import {GlOverlay} from "../../lib/alt1gl/ts/util/patchrs_napi";
import {floor_t, TileCoordinates} from "../../lib/runescape/coordinates";
import {Path} from "../../lib/runescape/pathing";
import {buildPathMesh, getPathLevels} from "./PathRender";
import {mat4} from "gl-matrix";
import {MeshBuilder} from "./MeshBuilder";

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;
const SKIP_PROGRAM_MASK = 1 << 5;
const KNOWN_CHUNK_MASK = 1 << 6;

class PathOverlayChunk {
  overlayHandle: GlOverlay | null = null;
  stopped = false;
  loaded = false;

  constructor(
    private targetVertexObject: number,
    private paths: Path[],
    private program: patchrs.GlProgram,
    private uniformSources: patchrs.OverlayUniformSource[]
  ) {
    this.load();
  }

  async load() {
    const builder = new MeshBuilder();

    // Build meshes for all levels needed
    for (const path of this.paths) {
      await buildPathMesh(builder, path);
    }

    if (builder.triangleCount() === 0) {
      this.loaded = true;
      return;
    }

    const combined = builder.finalize();

    const vertex = patchrs.native.createVertexArray(combined.index, [
      {location: 0, buffer: combined.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3},
      {location: 6, buffer: combined.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 4},
    ]);

    const uniforms = new UniformSnapshotBuilder({
      uModelMatrix: "mat4",
      uViewProjMatrix: "mat4"
    });

    const world_matrix = mat4.create();

    mat4.fromScaling(world_matrix, [TILE_SIZE, TILE_SIZE, TILE_SIZE])

    uniforms.mappings.uModelMatrix.write(
      world_matrix as number[]
    );

    this.overlayHandle = patchrs.native.beginOverlay(
      {skipProgramMask: SKIP_PROGRAM_MASK, vertexObjectId: this.targetVertexObject},
      this.program,
      vertex,
      {
        uniformSources: this.uniformSources,
        uniformBuffer: uniforms.buffer
      }
    );

    this.loaded = true;
    if (this.stopped) {
      this.stop();
    }
  }

  stop() {
    this.stopped = true;
    this.overlayHandle?.stop();
  }
}

export class TileMarkersOverlay {
  private program: patchrs.GlProgram | null = null;
  private uniformSources: patchrs.OverlayUniformSource[] = [];
  private knownProgs = new WeakMap<patchrs.GlProgram, {}>();
  private chunks = new Map<string, Map<number, PathOverlayChunk>>();  // Key: "chunkX,chunkZ" -> vertexObjectId -> chunk
  private stream: patchrs.StreamRenderObject | null = null;
  private paths: Path[] = [];
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

  draw(paths: Path[]): void {
    this.setPaths(paths);
    this.start();
  }

  stop(): void {
    this.stopped = true;
    this.stream?.close();
    this.chunks.forEach(vaoMap => vaoMap.forEach(chunk => chunk.stop()));
    this.chunks.clear();
  }

  private setPaths(paths: Path[]): void {
    this.paths = paths.filter(p => p && p.length > 0);
  }

  private start(): void {
    if (!this.program || this.paths.length === 0) return;

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
          vaoMap.set(render.vertexObjectId,
            new PathOverlayChunk(
              render.vertexObjectId,
              this.paths, this.program!, this.uniformSources
            )
          );
        }
      }
    });
  }
}