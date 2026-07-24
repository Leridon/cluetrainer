import {Vector2} from "../math";
import {TileCoordinates} from "../runescape/coordinates";

export class ChunkedData<T> {

  private _data: T[][] = []

  constructor() {
    this._data = new Array(ChunkedData.CHUNK_DIMENSIONS.x * ChunkedData.CHUNK_DIMENSIONS.y)
  }

  get(coords: ChunkedData.coordinates): T {
    return this._data[coords.chunk_i]?.[coords.tile_i]
  }

  set(coords: ChunkedData.coordinates, v: T): void {
    if (!this._data[coords.chunk_i]) this._data[coords.chunk_i] = new Array(ChunkedData.CHUNK_SIZE * ChunkedData.CHUNK_SIZE)

    this._data[coords.chunk_i][coords.tile_i] = v
  }
}

export namespace ChunkedData {

  export const CHUNK_SIZE = 64

  export const CHUNK_DIMENSIONS: Vector2 = {
    x: 100,
    y: 200
  }

  export function split(coords: TileCoordinates): ChunkedData.coordinates {
    let c: Vector2 = {
      x: Math.floor(coords.x / ChunkedData.CHUNK_SIZE),
      y: Math.floor(coords.y / ChunkedData.CHUNK_SIZE),
    }

    let t: Vector2 = {
      x: coords.x % ChunkedData.CHUNK_SIZE,
      y: coords.y % ChunkedData.CHUNK_SIZE,
    }

    return {
      coords: coords,
      chunk: c,
      tile: t,
      chunk_i: c.y * ChunkedData.CHUNK_DIMENSIONS.x + c.x,
      tile_i: t.y * ChunkedData.CHUNK_SIZE + t.x
    }
  }

  export type coordinates = { coords: TileCoordinates, chunk: Vector2, tile: Vector2, chunk_i: number, tile_i: number }
}
