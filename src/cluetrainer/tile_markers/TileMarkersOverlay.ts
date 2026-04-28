import {WORLD_UNITS_PER_TILE} from "../overlay3d/SimpleGLOverlay";
import {chunksize} from "../../lib/alt1/alt1gllib/ts/overlays/tilemarkers";
import {RenderInvocation} from "../../lib/alt1/alt1gllib/ts/util/alt1gltypes";
import {getUniformValue} from "../../lib/alt1/alt1gllib/ts/render/renderprogram";

const CHUNK_SIZE = chunksize;

export namespace TileMarkersOverlay {
  export function getChunkByRender(render: RenderInvocation) {
    const uniform = getUniformValue(render.uniformState, render.program.uniforms.find(q => q.name == "uModelMatrix")!);
    const chunkX = Math.floor(uniform[0][12] / CHUNK_SIZE / WORLD_UNITS_PER_TILE);
    const chunkZ = Math.floor(uniform[0][14] / CHUNK_SIZE / WORLD_UNITS_PER_TILE);

    return {chunkX, chunkZ};
  }
}