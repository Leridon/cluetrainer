import { BufferCache, FilteredGameState } from "lib/alt1gl/ts/programs/filteredstate";

export type PlayerPosition = {x: number, y: number, z: number};

export class PlayerPositionReader {
    private cache: BufferCache;
    private state: FilteredGameState;
    
    private lastX: number;
    private lastZ: number;
    private lastY: number;

    constructor(cache: BufferCache) {
        this.cache = cache;
        this.state = new FilteredGameState(this.cache);
    }

    public async getPosition(): Promise<PlayerPosition | null> {
        try {
            await this.state.fullCapture(false);
            const pos = this.state.lastreflect?.playergroup?.master?.position2d;
            if (pos) {
                const x = Math.round(pos.xnew);
                const z = Math.round(pos.znew);
                const y = Math.round(pos.ynew);
                if (x !== this.lastX || z !== this.lastZ || y !== this.lastY) {
                    this.lastX = x;
                    this.lastZ = z;
                    this.lastY = y;
                }

                return { x: this.lastX, y: this.lastY, z: this.lastZ };
            }
            return null;
        } catch (e) {
            console.error('Player position capture error:', e);
        }
    }
}