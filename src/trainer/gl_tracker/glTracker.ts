import { BufferCache, FilteredGameState } from "lib/alt1gl/ts/programs/filteredstate";

export type PlayerPosition = { x: number; z: number; y: number };
export type PlayerPositionCallback = (pos: PlayerPosition) => void;

export class GlTracker {
    private cache: BufferCache | null = null;
    private state: FilteredGameState | null = null;
    private lastX: number | null = null;
    private lastZ: number | null = null;
    private lastY: number | null = null;

    public create(framecooldown?: number, onPlayerPosition?: PlayerPositionCallback) {
        const stream = window.alt1gl.streamRenderCalls({
            features: ["uniforms"],
            framecooldown: framecooldown ?? 600,
        }, async renders => {
            // if callback is provided we invoke the callback with the player position
            if (onPlayerPosition) await this.onPlayerPosition(onPlayerPosition);
        });

        return {
            stream
        }
    }

    private async onPlayerPosition(cb: PlayerPositionCallback) {
        try {
            if (!this.cache) {
                try {
                    this.cache = new BufferCache();
                    this.state = new FilteredGameState(this.cache);
                } catch(e) {
                    console.error('Cache not ready error:', e);
                }
            }

            if (this.state) {
                await this.state.fullCapture(false);
                const pos = this.state.lastreflect?.playergroup?.master?.position2d;
                if (pos) {
                    const x = Math.round(pos.xnew);
                    const z = Math.round(pos.znew);
                    const y = Math.round(pos.ynew);
                    if (x !== this.lastX || z !== this.lastZ || y !== this.lastY) {
                        this.lastX = x;
                        this.lastZ = z;
                        cb({ x, z, y });
                    }
                }
            }
        } catch (e) {
            console.error('Player position capture error:', e);
        }
    }
}