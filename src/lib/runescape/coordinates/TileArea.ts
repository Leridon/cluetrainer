import {TileCoordinates} from "./TileCoordinates";
import {Rectangle, Vector2} from "../../math";
import {base64ToBytes, bytesToBase64} from "byte-base64";
import {TileRectangle} from "./TileRectangle";
import lodash from "lodash";
import {direction} from "../movement";
import {TileTransform} from "./TileTransform";
import {util} from "../../util/util";
import {FakeLodash} from "../../coreutil/FakeLodash";

export type TileArea = {
  origin: TileCoordinates,
  size?: Vector2, // Default value {x: 1, y: 1}
  data?: string   // If not provided, the entire area is considered
  _active?: TileArea.ActiveTileArea
}

export namespace TileArea {


  export class ActiveTileArea {
    data: Uint8Array
    size: Vector2
    origin: TileCoordinates

    constructor(public parent: TileArea) {
      this.size = FakeLodash.cloneDeep(parent.size) ?? {x: 1, y: 1}

      if (parent.data) {
        this.data = base64ToBytes(parent.data)
      } else {
        this.data = new Uint8Array(Math.ceil(this.size.x * this.size.y / 8)).fill(255)
      }

      this.origin = FakeLodash.cloneDeep(parent.origin)
    }

    save(): this {
      const rect = TileRectangle.from(this.origin, TileCoordinates.move(
        this.origin,
        Vector2.sub(this.size, {x: 1, y: 1})
      ))

      const filled = (() => {
        for (let x = rect.topleft.x; x <= rect.botright.x; x++) {
          for (let y = rect.botright.y; y <= rect.topleft.y; y++) {

            if (!this.query({x, y, level: rect.level})) return false
          }
        }
        return true
      })()

      if (filled) {
        this.parent.data = undefined
      } else {
        this.parent.data = bytesToBase64(this.data)
      }

      if (this.size.x == 1 && this.size.y == 1) {
        this.parent.size = undefined
      } else {
        this.parent.size = FakeLodash.cloneDeep(this.size)
      }

      this.parent.origin = FakeLodash.cloneDeep(this.origin)

      return this
    }

    disconnect(): void {
      if (this.parent) {
        this.parent._active = null
        this.parent = null
      }
    }

    private index(tile: TileCoordinates): [number, number] {
      const off = Vector2.sub(tile, this.origin)

      // Assumes the input is valid and within bounds!

      const index = off.x + off.y * this.size.x

      return [Math.floor(index / 8), index % 8]
    }

    query(coords: TileCoordinates): boolean {
      const sz = this.size

      if (coords.x < this.origin.x || coords.y < this.origin.y
        || coords.x >= (this.origin.x + sz.x)
        || coords.y >= (this.origin.y + sz.y)
      ) return false

      const [element, shift] = this.index(coords)

      return ((this.data[element] >> shift) & 1) != 0
    }

    set(tile: TileCoordinates, value: boolean): this {
      const [element, shift] = this.index(tile)

      if (value) this.data[element] |= (1 << shift)
      else this.data[element] &= 255 - (1 << shift)

      return this
    }

    add(tile: TileCoordinates): this {
      this.set(tile, true)
      return this
    }

    remove(tile: TileCoordinates): this {
      this.set(tile, false)
      return this
    }

    setRectangle(rect: TileRectangle, value: boolean = true): this {
      for (let x = rect.topleft.x; x <= rect.botright.x; x++) {
        for (let y = rect.botright.y; y <= rect.topleft.y; y++) {
          this.set({x, y, level: rect.level}, value)
        }
      }

      return this
    }

    center(snap: boolean = true, ensure_contained_tile: boolean = true): TileCoordinates {
      const start = TileRectangle.center(TileArea.toRect(this.parent), snap)

      if (!ensure_contained_tile) return start

      let queue: { pos: TileCoordinates, dirs: direction[] }[] = [{pos: start, dirs: direction.all}]

      let i = 0

      while (i < queue.length && i < 50) {
        const el = queue[i]

        if (this.query(el.pos)) return el.pos

        for (let dir of el.dirs) {
          queue.push({pos: TileCoordinates.move(el.pos, direction.toVector(dir)), dirs: direction.continuations(dir)})
        }

        i++
      }

      return null
    }

    getTiles(): TileCoordinates[] {

      const tiles: TileCoordinates[] = []

      for (let dx = 0; dx < this.size.x; dx++) {
        for (let dy = 0; dy < this.size.y; dy++) {
          const tile = TileCoordinates.move(this.origin, {x: dx, y: dy})

          if (this.query(tile)) tiles.push(tile)
        }
      }

      return tiles
    }

    asMultipolygon(): { outer: Vector2[], cutouts: Vector2[][] }[] {
      if (!this.data) {
        const rect = TileArea.toRect(this.parent)

        return [{
          outer: [
            Vector2.add({x: -0.5, y: -0.5}, TileRectangle.bl(rect)),
            Vector2.add({x: -0.5, y: 0.5}, TileRectangle.tl(rect)),
            Vector2.add({x: 0.5, y: 0.5}, TileRectangle.tr(rect)),
            Vector2.add({x: 0.5, y: -0.5}, TileRectangle.br(rect)),
          ],
          cutouts: []
        }]
      }

      const active = this

      type LineSegment = Vector2[]

      const segment_table: LineSegment[][] = (() => {
        const tl = direction.northwest
        const tr = direction.northeast
        const br = direction.southeast
        const bl = direction.southwest

        const base: direction.ordinal[][][] = [
          /* ← ↓ → ↑ */
          /* 0 0 0 0 */ [],
          /* 0 0 0 1 */ [[tl, tr]],
          /* 0 0 1 0 */ [[tr, br]],
          /* 0 0 1 1 */ [[tl, tr, br]],
          /* 0 1 0 0 */ [[br, bl]],
          /* 0 1 0 1 */ [[tl, tr], [br, bl]],
          /* 0 1 1 0 */ [[tr, br, bl]],
          /* 0 1 1 1 */ [[tl, tr, br, bl]],
          /* 1 0 0 0 */ [[bl, tl]],
          /* 1 0 0 1 */ [[bl, tl, tr]],
          /* 1 0 1 0 */ [[bl, tl], [tr, br]],
          /* 1 0 1 1 */ [[bl, tl, tr, br]],
          /* 1 1 0 0 */ [[br, bl, tl]],
          /* 1 1 0 1 */ [[br, bl, tl, tr]],
          /* 1 1 1 0 */ [[tr, br, bl, tl]],
          /* 1 1 1 1 */ [[tl, tr, br, bl, tl]],
        ]

        return base.map(s => s.map(v => v.map(o => Vector2.scale(0.5, direction.toVector(o)))))
      })()

      const segments: LineSegment[] = []

      for (let dx = 0; dx < this.size.x; dx++) {
        for (let dy = 0; dy < this.size.y; dy++) {
          const tile = TileCoordinates.move(this.origin, {x: dx, y: dy})

          if (!active.query(tile)) continue

          const above = active.query(TileCoordinates.move(tile, {x: 0, y: 1}))
          const right = active.query(TileCoordinates.move(tile, {x: 1, y: 0}))
          const below = active.query(TileCoordinates.move(tile, {x: 0, y: -1}))
          const left = active.query(TileCoordinates.move(tile, {x: -1, y: 0}))

          const hash =
            (!above ? 1 : 0)
            + (!right ? 2 : 0)
            + (!below ? 4 : 0)
            + (!left ? 8 : 0)

          segments.push(...segment_table[hash]
            .map(s => s.map(o => TileCoordinates.move(tile, o)))
          )
        }
      }

      const lines: LineSegment[] = []

      while (segments.length > 0) {
        const [line] = segments.splice(0, 1)

        // TODO: Optimize line construction so that continuous segments going in the same direction are joined

        while (segments.length > 0) {
          const cursor = util.index(line, -1)

          if (Vector2.eq(line[0], cursor)) {
            line.pop()
            break
          }

          const next_index = segments.findIndex(
            segment => Vector2.eq(cursor, segment[0])
          )

          if (next_index < 0) break

          const [next_segment] = segments.splice(next_index, 1)

          line.push(...next_segment.slice(1))
        }

        lines.push(line)
      }

      return [{
        outer: lines[0],
        cutouts: lines.slice(1)
      }]
    }
  }

  export function activate(area: TileArea): ActiveTileArea {
    if (!area) return null

    if (area._active?.query) return area._active
    else return area._active = new ActiveTileArea(area)
  }

  export function init(origin: TileCoordinates, size: Vector2 = {x: 1, y: 1}, filled: boolean = true): TileArea {
    return {
      origin: origin,
      size: size,
      data: filled
        ? undefined
        : bytesToBase64(new Uint8Array(Math.ceil(size.x * size.y / 8)).fill(0))
    }
  }

  export function fromTiles(tiles: TileCoordinates[]): TileArea {
    if (tiles.length == 0) return TileArea.init({x: 0, y: 0, level: 0})

    const area = activate(fromRect(TileRectangle.from(...tiles), false))

    for (let tile of tiles) {
      area.add(tile)
    }

    area.save()

    return area.parent
  }

  export function fromRect(rect: TileRectangle, filled: boolean = true): TileArea {
    return init(TileRectangle.bl(rect), {x: Rectangle.tileWidth(rect), y: Rectangle.tileHeight(rect)}, filled)
  }

  export function toRect(area: TileArea): TileRectangle {
    return TileRectangle.from(area.origin, TileCoordinates.move(area.origin, Vector2.add(TileArea.size(area), {x: -1, y: -1})))
  }

  export function size(area: TileArea): Vector2 {
    return area.size ?? {x: 1, y: 1}
  }

  export function isSingleTile(area: TileArea): boolean {
    return !area.size || (area.size.x == 1 && area.size.y == 1)
  }

  export function isRectangle(area: TileArea): boolean {
    return !area.data
  }

  export function transform(area: TileArea, transform: TileTransform): TileArea {
    return TileArea.fromTiles(activate(area).getTiles().map(t => TileCoordinates.transform(t, transform)))
  }

  export function normalize(input: TileCoordinates | TileArea) {
    if ("x" in input) return TileArea.init(input)
    else return input
  }

  export function toString(self: TileArea): string {
    const size = TileArea.size(self)

    return `${size.x}x${size.y} @ ${self.origin.x}|${self.origin.y}`
  }
}