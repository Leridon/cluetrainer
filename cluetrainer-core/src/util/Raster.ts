import {Rectangle} from "../math";

export class Raster<T> {
  public data: T[]
  size: { x: number, y: number }

  constructor(public bounds: Rectangle, fill: () => T = null) {
    this.size = {x: bounds.botright.x - bounds.topleft.x + 1, y: bounds.topleft.y - bounds.botright.y + 1}
    this.data = new Array(this.size.x * this.size.y)

    if (fill) this.data = this.data.map(() => fill())
  }

  xyToI(tile: { x: number, y: number }) {
    // TODO: Simplify origin?
    return (tile.y - this.bounds.botright.y) * this.size.x + (tile.x - this.bounds.topleft.x)
  }

  iToXY(i: number) {
    return {
      x: i % this.size.x + this.bounds.topleft.x,
      y: Math.floor(i / this.size.x) + this.bounds.botright.y
    }
  }

  get(tile: { x: number, y: number }): T {
    return this.data[this.xyToI(tile)]
  }

  set(tile: { x: number, y: number }, value: T): void {
    this.data[this.xyToI(tile)] = value
  }
}