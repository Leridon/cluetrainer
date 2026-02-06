import {StreamRenderObject} from "../../../../lib/alt1gl/ts/util/patchrs_napi";
import * as patchrs from "../../../../lib/alt1gl/ts/util/patchrs_napi";
import {getProgramMeta, getRenderFunc, getUniformValue} from "../../../../lib/alt1gl/ts/render/renderprogram";

export type RingType = 'none' | 'blue' | 'orange' | 'red';
export type PlayerPosition = { x: number; y: number; z: number; } | null
export type PlayerSnapshot = { position: PlayerPosition, pulseRing: RingType }

export class PlayerState {
  private stream: StreamRenderObject | undefined;

  constructor(private callback: (state: PlayerSnapshot | null) => void) {
    this.startStream();
  }

  private startStream(): void {
    this.stream = patchrs.native.streamRenderCalls({
      features: ["full"],
      framecooldown: 600,
    }, (renders) => {
      const state = this.findPlayerState(renders);
      this.callback(state);
    });
  }

  public stop(): void {
    if (this.stream) {
      this.stream.close();
    }
  }

  private findPlayerState(renders: patchrs.RenderInvocation[]): PlayerSnapshot | null {
    let position: PlayerPosition = null;
    let pulseRing: RingType = 'none';

    for (const render of renders) {
      if (!render.program || !render.uniformState) continue;

      let progmeta: ReturnType<typeof getProgramMeta>;
      try {
        progmeta = getProgramMeta(render.program);
      } catch {
        continue;
      }

      // Look for player position if we haven't found it yet
      if (!position) {
        const possiblePosition = this.detectPlayerPosition(render, progmeta);
        if (possiblePosition) {
          position = possiblePosition;
        }
      }

      // Look for pulse ring if we haven't found it yet
      if (pulseRing === 'none') {
        const ring = this.detectPulseRing(render, progmeta);
        if (ring !== 'none') {
          pulseRing = ring;
        }
      }

      // Early exit if we atleast found the position, we may not have a ring active
      if (position) {
        break;
      }
    }

    return { position, pulseRing };
  }

  private detectPlayerPosition(render: patchrs.RenderInvocation, progmeta: ReturnType<typeof getProgramMeta>): PlayerPosition {
    const TILESIZE = 512;

    const hasFrag = typeof render.program.fragmentShader?.source === 'string';
    const hasVert = typeof render.program.vertexShader?.source === 'string';
    if (!hasFrag || !hasVert) return null;

    if (!progmeta.isTinted || !progmeta.uTint || !progmeta.uModelMatrix) return null;
    if (!progmeta.isAnimated) return null;

    try {
      const tint = getUniformValue(render.uniformState, progmeta.uTint)[0] as number[];
      if (!tint || tint.length < 4) return null;

      const rgbSum = Math.abs(tint[0]) + Math.abs(tint[1]) + Math.abs(tint[2]);
      if (rgbSum > 0.1 || tint[3] > 0.6) return null;

      const matrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as number[];
      if (!matrix || matrix.length < 16) return null;

      const x = Math.round(matrix[12] / TILESIZE) - 2;
      const y = matrix[13] / TILESIZE;
      const z = Math.round(matrix[14] / TILESIZE) - 1;

      if (x === 0 && z === 0) return null;
      return { x, y, z };
    } catch (error) {
      // ignore errors
    }
    return null;
  }

  private detectPulseRing(render: patchrs.RenderInvocation, progmeta: ReturnType<typeof getProgramMeta>): RingType {
    try {
      // get vertex count from render ranges
      const vertexCount = render.renderRanges?.reduce((sum: number, r: patchrs.RenderRange) => sum + r.length, 0) || 0;

      // Ring signature: the ring mesh has 576 verts, maybe we can find a better way ?
      // 576 blue
      // red 1728
      // orange 864
      if ((vertexCount === 576 || vertexCount === 1728 || vertexCount === 864) && progmeta.isAnimated && progmeta.isMainMesh) {
        // Sample vertex colors to determine ring type
        const renderfunc = getRenderFunc(render);
        if (renderfunc.progmeta.aColor) {
          const colorGetter = renderfunc.getters[renderfunc.progmeta.aColor.name];
          // Sample first few vertices
          let blueCount = 0;
          let orangeCount = 0;
          let redCount = 0;

          const samplesToCheck = Math.min(10, renderfunc.nvertices);

          for (let i = 0; i < samplesToCheck; i++) {
            const r = colorGetter(i, 0) / 255;
            const g = colorGetter(i, 1) / 255;
            const b = colorGetter(i, 2) / 255;

            // Blue ring: blue channel dominant
            if (b > 0.3 && b > r * 1.5 && b > g * 1.5) {
              blueCount++;
            }
            // Orange ring: red and green high, blue low
            else if (r > 0.3 && g > 0.2 && r > b * 1.5 && g > b * 1.2) {
              orangeCount++;
            }
            // Red ring: red channel dominant
            else if (r > 0.3 && r > g * 1.5 && r > b * 1.5) {
              redCount++;
            }
          }

          // Check which color is most prominent (at least 75% of samples)
          const threshold = samplesToCheck * 0.75;
          if (blueCount >= threshold) {
            console.info("[PlayerState] BLUE PULSE RING DETECTED: verts:", vertexCount, "blue samples:", blueCount + "/" + samplesToCheck);
            return 'blue';
          } else if (orangeCount >= threshold) {
            console.info("[PlayerState] ORANGE PULSE RING DETECTED: verts:", vertexCount, "orange samples:", orangeCount + "/" + samplesToCheck);
            return 'orange';
          } else if (redCount >= threshold) {
            console.info("[PlayerState] RED PULSE RING DETECTED: verts:", vertexCount, "red samples:", redCount + "/" + samplesToCheck);
            return 'red';
          }
        }
      }
    } catch {
      // ignore errors
    }

    return 'none';
  }
}