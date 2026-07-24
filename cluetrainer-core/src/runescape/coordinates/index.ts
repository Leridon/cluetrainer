import {TileCoordinates} from "./TileCoordinates"

export {GieliCoordinates} from "./GieliCoordinates"
export {TileCoordinates} from "./TileCoordinates"
export {TileRectangle} from "./TileRectangle"

export type floor_t = 0 | 1 | 2 | 3

export type Area = { tiles: TileCoordinates[] }

export namespace floor_t {
  export const all: floor_t[] = [0, 1, 2, 3]

  export function clamp(n: number): floor_t {
    return Math.max(0, Math.min(3, n)) as floor_t
  }
}
