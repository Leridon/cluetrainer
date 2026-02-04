/**
 * Shared base functionality for chunk-based overlay trackers
 */
import { GL_FLOAT, GL_UNSIGNED_BYTE, positionMatrix } from "../../lib/alt1gl/ts/overlays";
import { chunksize, tilesize } from "../../lib/alt1gl/ts/overlays/tilemarkers";
import { getUniformValue } from "../../lib/alt1gl/ts/render/renderprogram";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import { getOrInsert } from "../../lib/alt1gl/ts/util/util";

// ============================================================================
// Constants
// ============================================================================

export const CHUNK_SIZE = chunksize;
export const TILE_SIZE = tilesize;
export const HEIGHT_ENDPOINT = "https://runeapps.org/maps/mapheightrender/";

// ============================================================================
// Types
// ============================================================================

export interface MeshData {
    pos: Uint8Array;
    color: Uint8Array;
    index: Uint8Array;
}

// ============================================================================
// Height Data
// ============================================================================

const heightCache = new Map<string, Promise<Uint16Array | null>>();

export async function fetchHeightData(chunkX: number, chunkZ: number, chunkLevel: number = 0): Promise<Uint16Array | null> {
    const key = `${chunkLevel}/${chunkX}-${chunkZ}`;

    const cached = heightCache.get(key);
    if (cached) return cached;

    const promise = (async () => {
        try {
            const res = await fetch(`${HEIGHT_ENDPOINT}height-${chunkLevel}/${chunkX}-${chunkZ}.bin.gz`);
            if (!res.ok) return null;
            return new Uint16Array(await res.arrayBuffer());
        } catch {
            return null;
        }
    })();

    heightCache.set(key, promise);
    return promise;
}

// ============================================================================
// Base Overlay Chunk
// ============================================================================

export abstract class BaseOverlayChunk {
    chunkx: number;
    chunkz: number;
    targetVertexObject: number;

    stopped = false;
    loaded = false;
    failed = false;
    protected updating = false; // Prevent concurrent async updates
    protected heightDataByLevel = new Map<number, Uint16Array>();

    constructor(render: patchrs.RenderInvocation) {
        const uniform = getUniformValue(render.uniformState, render.program.uniforms.find(q => q.name === "uModelMatrix")!);
        this.chunkx = Math.floor(uniform[0][12] / CHUNK_SIZE / TILE_SIZE);
        this.chunkz = Math.floor(uniform[0][14] / CHUNK_SIZE / TILE_SIZE);
        this.targetVertexObject = render.vertexObjectId;
    }

    protected async getHeightData(level: number): Promise<Uint16Array | null> {
        let data = this.heightDataByLevel.get(level);
        if (data) return data;

        const fetched = await fetchHeightData(this.chunkx, this.chunkz, level);
        if (fetched) {
            this.heightDataByLevel.set(level, fetched);
        }
        return fetched;
    }

    protected createOverlay(
        mesh: MeshData,
        program: patchrs.GlProgram,
        uniforms: { buffer: Uint8Array; mappings: { uModelMatrix: { write: (m: number[]) => void } } },
        uniformSources: patchrs.OverlayUniformSource[],
        skipProgramMask: number,
        colorVectorLength: number = 4
    ): patchrs.GlOverlay {
        const vertex = patchrs.native.createVertexArray(mesh.index, [
            { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
            { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: colorVectorLength, vectorlength: colorVectorLength },
        ]);

        uniforms.mappings.uModelMatrix.write(positionMatrix(
            (this.chunkx + 0.5) * TILE_SIZE * CHUNK_SIZE,
            TILE_SIZE / 32,
            (this.chunkz + 0.5) * TILE_SIZE * CHUNK_SIZE
        ));

        return patchrs.native.beginOverlay(
            { skipProgramMask, vertexObjectId: this.targetVertexObject },
            program,
            vertex,
            { uniformSources, uniformBuffer: uniforms.buffer, alphaBlend: true }
        );
    }

    abstract update(...args: any[]): Promise<void>;
    abstract stop(): void;
}

// ============================================================================
// Chunk Tracker
// ============================================================================

export interface TrackerOptions<TChunk extends BaseOverlayChunk> {
    skipProgramMask: number;
    framecooldown?: number;
    createChunk: (render: patchrs.RenderInvocation) => TChunk;
    onUpdate: (chunk: TChunk, render: patchrs.RenderInvocation) => void;
}

export interface TrackerResult<TChunk extends BaseOverlayChunk> {
    stream: patchrs.StreamRenderObject;
    close: () => void;
    chunks: Map<number, TChunk>;
}

export function createChunkTracker<TChunk extends BaseOverlayChunk>(
    options: TrackerOptions<TChunk>
): TrackerResult<TChunk> {
    const { skipProgramMask, framecooldown = 600, createChunk, onUpdate } = options;

    let stopped = false;
    const knownProgs = new WeakMap<patchrs.GlProgram, {}>();
    const chunks = new Map<number, TChunk>();

    const stream = patchrs.native.streamRenderCalls({
        features: ["uniforms"],
        framecooldown,
        skipProgramMask
    }, async renders => {
        if (stopped) return;

        const currentFrameVaos = new Set<number>();

        for (const render of renders) {
            if (!knownProgs.has(render.program)) {
                if (render.program.inputs.find(q => q.name === "aMaterialSettingsSlotXY3")) {
                    knownProgs.set(render.program, {});
                } else {
                    render.program.skipmask |= skipProgramMask;
                    continue;
                }
            }

            const chunk = getOrInsert(chunks, render.vertexObjectId, () => createChunk(render));
            currentFrameVaos.add(render.vertexObjectId);
            onUpdate(chunk, render);
        }

        // Cleanup chunks no longer visible
        for (const [vao, chunk] of chunks) {
            if (!currentFrameVaos.has(vao)) {
                chunk.stop();
                chunks.delete(vao);
            }
        }
    });

    const close = () => {
        stopped = true;
        stream.close();
        chunks.forEach(q => q.stop());
    };

    return { stream, close, chunks };
}

