import {TileCoordinates} from "./coordinates";
import {direction} from "./movement";
import pako from "pako";

export type TileCollisionData = number

export namespace TileCollisionData {
  export function isFree(tile: TileCollisionData, d: direction): boolean {
    const t = [1, 2, 4, 8, 16, 32, 64, 128]

    return (Math.floor(tile / t[d - 1]) % 2) != 0
  }
}


export interface MapCollisionData {
  getTile(coordinate: TileCoordinates): Promise<TileCollisionData>

  isAccessible(coordinates: TileCoordinates): Promise<boolean>

  canMove(pos: TileCoordinates, d: direction): Promise<boolean>
}

abstract class AbstractMapCollisionData implements MapCollisionData {
  async isAccessible(coordinates: TileCoordinates): Promise<boolean> {
    for (const dir of direction.all) {
      if (await this.canMove(
        TileCoordinates.move(coordinates, direction.toVector(dir)),
        direction.invert(dir)
      )) return true
    }

    return false
  }

  abstract getTile(coordinate: TileCoordinates): Promise<TileCollisionData>

  async canMove(pos: TileCoordinates, d: direction): Promise<boolean> {
    // Data is preprocessed so for every tile there are 8 bit signalling in which directions the player can move.
    return TileCollisionData.isFree(await this.getTile(pos), d)
  }
}

type file = Uint8Array

export class HostedMapCollisionData extends AbstractMapCollisionData {

  meta = {
    chunks_per_file: 20,
    chunks_x: 100,
    chunks_z: 200,
    chunk_size: 64
  }

  chunks: (file | Promise<file>)[][]

  private async fetch(file_x: number, file_z: number, floor: number): Promise<Uint8Array> {
    const a = await fetch(`/map/collision/collision-${file_x}-${file_z}-${floor}.bin`)

    return new Uint8Array(pako.inflate(await a.arrayBuffer()))
  }

  private constructor() {
    super()
    // For every floor (0 to 3), create enough slots in the data cache.
    this.chunks = [null, null, null, null].map(() => Array(this.meta.chunks_x * this.meta.chunks_z / (this.meta.chunks_per_file * this.meta.chunks_per_file)))
  }

  private static _instance: HostedMapCollisionData = new HostedMapCollisionData()

  static get() {
    return HostedMapCollisionData._instance
  }

  async getTile(coordinate: TileCoordinates): Promise<TileCollisionData> {
    const file_x = ~~(coordinate.x / (this.meta.chunk_size * this.meta.chunks_per_file))
    const file_y = ~~(coordinate.y / (this.meta.chunk_size * this.meta.chunks_per_file))
    const file_i = file_y * this.meta.chunks_per_file + file_x

    if (!this.chunks[coordinate.level][file_i]) {
      let promise = this.fetch(file_x, file_y, coordinate.level)

      this.chunks[coordinate.level][file_i] = promise

      promise.then((a) => this.chunks[coordinate.level][file_i] = a)
    }

    const tile_x = coordinate.x % (this.meta.chunk_size * this.meta.chunks_per_file)
    const tile_y = coordinate.y % (this.meta.chunk_size * this.meta.chunks_per_file)
    const tile_i = tile_y * (this.meta.chunk_size * this.meta.chunks_per_file) + tile_x

    return (await this.chunks[coordinate.level][file_i])[tile_i]
  }
}

export class ClearCollisionData extends AbstractMapCollisionData {
  getTile(coordinate: TileCoordinates): Promise<TileCollisionData> {
    return Promise.resolve(255);
  }
}