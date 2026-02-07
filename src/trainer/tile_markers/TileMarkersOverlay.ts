import {GL_FLOAT, GL_UNSIGNED_BYTE, positionMatrix, UniformSnapshotBuilder} from "../../lib/alt1gl/ts/overlays";
import {chunksize, fragshadermouse, tilesize, vertshadermousealpha} from "../../lib/alt1gl/ts/overlays/tilemarkers";
import {getUniformValue} from "../../lib/alt1gl/ts/render/renderprogram";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import {GlOverlay} from "../../lib/alt1gl/ts/util/patchrs_napi";
import {floor_t, TileCoordinates} from "../../lib/runescape/coordinates";
import {Path} from "../../lib/runescape/pathing";
import {buildPathMesh, getPathLevels} from "./PathRender";

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;
const SKIP_PROGRAM_MASK = 1 << 5;
const KNOWN_CHUNK_MASK = 1 << 6;

class PathOverlayChunk {
  overlayHandle: GlOverlay | null = null;
  stopped = false;
  loaded = false;
  chunkX: number;
  chunkZ: number;

  constructor(
    private targetVertexObject: number,
    chunkX: number,
    chunkZ: number,
    private levels: Set<floor_t>,
    private paths: Path[],
    private program: patchrs.GlProgram,
    private uniformSources: patchrs.OverlayUniformSource[]
  ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.load();
  }

  async load() {
    const meshes: { pos: Uint8Array, color: Uint8Array, index: Uint8Array }[] = [];

    // Build meshes for all levels needed
    for (const path of this.paths) {
      const mesh = await buildPathMesh(path);

      if (mesh) {
        // Move mesh to be relative to chunk origin
        mesh.move({x: -this.chunkX * CHUNK_SIZE - CHUNK_SIZE / 2, z: -this.chunkZ * CHUNK_SIZE - CHUNK_SIZE / 2, y: 0})

        // Scale from tile coordinate system to rendering coordinate system
        mesh.scale(TILE_SIZE)

        if (mesh.triangleCount() > 0) {
          meshes.push(mesh.finalize())
        }
      } else {
        console.log("buildPathMesh returned null")
      }
    }


    if (meshes.length === 0) {
      this.loaded = true;
      return;
    }

    const combined = combineMeshes(meshes);

    const vertex = patchrs.native.createVertexArray(combined.index, [
      {location: 0, buffer: combined.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3},
      {location: 6, buffer: combined.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 4},
    ]);

    const uniforms = new UniformSnapshotBuilder({
      uModelMatrix: "mat4",
      uViewProjMatrix: "mat4"
    });

    uniforms.mappings.uModelMatrix.write(
      positionMatrix(
        (this.chunkX + 0.5) * TILE_SIZE * CHUNK_SIZE,
        TILE_SIZE / 16,
        (this.chunkZ + 0.5) * TILE_SIZE * CHUNK_SIZE
      )
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
  private pathChunkLevels = new Map<string, Set<floor_t>>();   // Key: "chunkX,chunkZ" -> Set of levels needed
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
    this.pathChunkLevels.clear();

    // Build map of chunks -> levels needed
    for (const path of this.paths) {
      for (const level of getPathLevels(path)) {
        for (const tile of extractPathTiles(path, level)) {
          const chunkX = Math.floor(tile.x / CHUNK_SIZE);
          const chunkZ = Math.floor(tile.y / CHUNK_SIZE);
          const key = `${chunkX},${chunkZ}`;
          if (!this.pathChunkLevels.has(key)) {
            this.pathChunkLevels.set(key, new Set());
          }
          this.pathChunkLevels.get(key)!.add(level);
        }
      }
    }
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
        const levelsNeeded = this.pathChunkLevels.get(chunkKey);
        if (!levelsNeeded || levelsNeeded.size === 0) continue;

        // Create overlay for each VAO seen for this chunk
        if (!this.chunks.has(chunkKey)) {
          this.chunks.set(chunkKey, new Map());
        }
        const vaoMap = this.chunks.get(chunkKey)!;
        if (!vaoMap.has(render.vertexObjectId)) {
          vaoMap.set(render.vertexObjectId,
            new PathOverlayChunk(
              render.vertexObjectId,
              chunkX, chunkZ, levelsNeeded,
              this.paths, this.program!, this.uniformSources
            )
          );
        }
      }
    });
  }
}

function combineMeshes(meshes: { pos: Uint8Array, color: Uint8Array, index: Uint8Array }[]): { pos: Uint8Array, color: Uint8Array, index: Uint8Array } {
  if (meshes.length === 1) return meshes[0];

  let totalPos = 0, totalColor = 0, totalIndex = 0;
  for (const m of meshes) {
    totalPos += m.pos.length;
    totalColor += m.color.length;
    totalIndex += m.index.length;
  }

  const pos = new Uint8Array(totalPos);
  const color = new Uint8Array(totalColor);
  const index = new Uint8Array(totalIndex);

  let posOff = 0, colorOff = 0, indexOff = 0, vertexOff = 0;
  for (const m of meshes) {
    pos.set(m.pos, posOff);
    color.set(m.color, colorOff);

    const indices = new Uint16Array(m.index.buffer, m.index.byteOffset, m.index.length / 2);
    const adjusted = new Uint16Array(indices.length);
    for (let i = 0; i < indices.length; i++) adjusted[i] = indices[i] + vertexOff;
    index.set(new Uint8Array(adjusted.buffer), indexOff);

    posOff += m.pos.length;
    colorOff += m.color.length;
    indexOff += m.index.length;
    vertexOff += m.pos.length / 12;
  }

  return {pos, color, index};
}

function extractPathTiles(path: Path, level: number): TileCoordinates[] {
  const tiles: TileCoordinates[] = [];

  for (const step of path) {
    switch (step.type) {
      case "ability":
        if (step.from?.level === level) tiles.push(step.from);
        if (step.to?.level === level) tiles.push(step.to);
        break;
      case "run":
        if (step.waypoints) tiles.push(...step.waypoints.filter(wp => wp.level === level));
        break;
      case "teleport":
        if (step.spot?.level === level) tiles.push(step.spot);
        break;
      case "transport":
        if (step.assumed_start?.level === level) tiles.push(step.assumed_start);
        break;
      case "powerburst":
        if (step.where?.level === level) tiles.push(step.where);
        break;
      case "redclick":
        if (step.where?.level === level) tiles.push(step.where);
        break;
    }
  }

  return tiles;
}