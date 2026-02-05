import { getProgramMeta, getUniformValue } from "../../../../lib/alt1gl/ts/render/renderprogram";
import * as patchrs from "../../../../lib/alt1gl/ts/util/patchrs_napi";

export interface PlayerPosition { 
  x: number;
  y: number; 
  z: number;
  level: number;
}

export class PlayerPositionReader {
  private stream: any;

  constructor(private callback: (position: PlayerPosition | null) => void) {
    this.startStream();
  }

  private startStream(): void {
    this.stream = patchrs.native.streamRenderCalls({
      features: ["vertexarray", "uniforms"],
      framecooldown: 600,
    }, (renders) => {
      const position = this.findPlayerFromRenders(renders);
      this.callback(position);
    });
  }

  public stop(): void {
    if (this.stream) {
      this.stream.close();
    }
  }

  private findPlayerFromRenders(renders: any[]): PlayerPosition | null {
    const TILESIZE = 512;
    
    for (const render of renders) {
      if (!render.program || !render.uniformState) continue;

      const hasFrag = typeof render.program.fragmentShader?.source === 'string';
      const hasVert = typeof render.program.vertexShader?.source === 'string';
      if (!hasFrag || !hasVert) continue;

      let progmeta;
      try {
        progmeta = getProgramMeta(render.program);
      } catch {
        continue;
      }

      if (!progmeta.isTinted || !progmeta.uTint || !progmeta.uModelMatrix) continue;
      if (!progmeta.isAnimated) continue;

      try {
        const tint = getUniformValue(render.uniformState, progmeta.uTint)[0] as number[];
        if (!tint || tint.length < 4) continue;

        const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
        if (rgbSum > 0.1 || tint[3] > 0.6) continue;

        const matrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as number[];
        if (!matrix || matrix.length < 16) continue;

        const x = Math.round(matrix[12] / TILESIZE) - 2;
        const y = matrix[13] / TILESIZE;
        const z = Math.round(matrix[14] / TILESIZE) - 1;

        if (x === 0 && z === 0) continue;

        const level = Math.max(0, Math.round(y / 3));

        return { x, y, z, level };
      } catch (error) {
        continue;
      }
    }

    return null;
  }
}