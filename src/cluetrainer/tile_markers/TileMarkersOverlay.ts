import {chunksize} from "../../lib/alt1gl/ts/overlays/tilemarkers";
import {RenderInvocation} from "../../lib/alt1gl/ts/util/patchrs_napi";
import {getUniformValue} from "../../lib/alt1gl/ts/render/renderprogram";
import {WORLD_UNITS_PER_TILE} from "../overlay3d/SimpleGLOverlay";

const CHUNK_SIZE = chunksize;

export namespace TileMarkersOverlay {
  export function getChunkByRender(render: RenderInvocation) {
    const uniform = getUniformValue(render.uniformState, render.program.uniforms.find(q => q.name == "uModelMatrix")!);
    const chunkX = Math.floor(uniform[0][12] / CHUNK_SIZE / WORLD_UNITS_PER_TILE);
    const chunkZ = Math.floor(uniform[0][14] / CHUNK_SIZE / WORLD_UNITS_PER_TILE);

    return {chunkX, chunkZ};
  }
}