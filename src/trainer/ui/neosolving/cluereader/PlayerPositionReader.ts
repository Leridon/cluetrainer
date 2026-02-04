import {FilteredGameState} from "lib/alt1gl/ts/programs/filteredstate";

export type PlayerPosition = { x: number, y: number, z: number };

export class PlayerPositionReader {
  private lastX: number;
  private lastZ: number;
  private lastY: number;

  constructor(private state: FilteredGameState) {
    this.state.on("update", async () => {
      console.log(`Player position update: ${JSON.stringify(await this.getPosition())}`)
    })
  }

  public async getPosition(): Promise<PlayerPosition | null> {
    try {
      //return {x: this.state.player.char.x, y: this.state.player.char.z, z: 0}
      return {
        x: this.state.player.meshpos.xnew,
        y: this.state.player.meshpos.ynew,
        z: this.state.player.meshpos.znew,
      }

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

        return {x: this.lastX, y: this.lastY, z: this.lastZ};
      }
      return null;
    } catch (e) {
      console.error('Player position capture error:', e);
    }
  }
}