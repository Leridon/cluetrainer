import {floor_t, TileCoordinates, TileRectangle} from "../runescape/coordinates";
import {Rectangle, Vector2} from "../math";
import {TileArea} from "../runescape/coordinates/TileArea";

export default class BoundsBuilder {
  private bounds: Rectangle = null
  private level: floor_t = null

  private distance_limit: {
    center: Vector2
    limit: number
  } = null

  private fixed_center: boolean = false
  private level_fixed: boolean = false

  constructor() {}

  setDistanceLimit(limit: number): this {
    if (limit != null) {
      this.distance_limit = {
        limit: limit,
        center: Rectangle.center(this.bounds)
      }
    } else {
      this.distance_limit = null
    }

    return this
  }

  fixCenter(v: boolean = true): this {
    this.fixed_center = v

    return this
  }

  fixLevel(v: boolean = true): this {
    this.level_fixed = v

    return this
  }

  addTile(...tiles: (TileCoordinates | Vector2)[]): void {
    for (let tile of tiles) {
      if (!tile) continue
      if (this.distance_limit != null && tiles.some(tile => Vector2.lengthSquared(Vector2.sub(this.distance_limit.center, tile)) > this.distance_limit.limit * this.distance_limit.limit)) continue

      if (!this.bounds) {
        this.bounds = {topleft: tile, botright: tile}
      } else {
        if (this.fixed_center) this.bounds = Rectangle.extendTo(this.bounds, Vector2.mirrorThroughPoint(tile, Rectangle.center(this.bounds)))

        this.bounds = Rectangle.extendTo(this.bounds, tile)
      }

      if ("level" in tile && !this.level_fixed) {
        if (this.level == null) this.level = tile.level
        else this.level = Math.min(this.level, tile.level) as floor_t
      }
    }
  }

  addRectangle(rect: TileRectangle | Rectangle): void {
    if (!rect) return

    if ("level" in rect) {
      this.addTile(TileRectangle.tl(rect))
      this.addTile(TileRectangle.br(rect))
    } else {
      this.addTile(rect.topleft)
      this.addTile(rect.botright)
    }
  }

  addArea(area: TileArea): void {
    if (!area) return
    this.addRectangle(TileArea.toRect(area))
  }

  get(): TileRectangle {
    if (!this.bounds) return null

    return {
      topleft: this.bounds.topleft,
      botright: this.bounds.botright,
      level: this.level || 0
    }
  }
}