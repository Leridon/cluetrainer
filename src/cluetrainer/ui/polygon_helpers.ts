import {Raster} from "lib/util/raster";
import {Rectangle, Vector2} from "lib/math";
import * as leaflet from "leaflet";
import {LatLngExpression} from "leaflet";
import {TileArea} from "../../lib/runescape/coordinates/TileArea";
import {TileCoordinates} from "../../lib/runescape/coordinates";
import {direction} from "../../lib/runescape/movement";
import {util} from "../../lib/util/util";
import activate = TileArea.activate;
import index = util.index;

export function areaToPolygon<T>(raster: Raster<T>,
                                 f: (_: T) => boolean,
                                 s: number) {
  type corner = 0 | 1 | 2 | 3
  type TileCorner = { tile: number, corner: corner }

  function area(i: number) {
    let a = raster.data[i]
    return a && f(a)
  }

  function toCoords(point: TileCorner): Vector2 {
    let xy = raster.iToXY(point.tile)

    return {
      x: xy.x - 0.5 + Math.floor(point.corner / 2),
      y: xy.y - 0.5 + (point.corner % 2)
    }
  }

  // Find a start point that is on the border of the shape. Assumes there are no holes in the shape
  let startpoint = s
  while (area(startpoint - 1)) startpoint -= 1
  while (area(startpoint - raster.size.x)) startpoint -= raster.size.x

  let start: TileCorner = {tile: startpoint, corner: 0}
  let current: TileCorner = {tile: startpoint, corner: 0}

  function done() {
    return start.tile == current.tile && start.corner == current.corner;
  }

  let polygon: Vector2[] = []

  do {
    switch (current.corner) {
      case 0: // Bottom left, going up
      {
        let i: number = current.tile

        while (area(i + raster.size.x) && !area(i + raster.size.x - 1)) i += raster.size.x

        polygon.push(toCoords({tile: i, corner: 1}))

        if (area(i + raster.size.x - 1)) current = {tile: i + raster.size.x - 1, corner: 2} // Go left
        else current = {tile: i, corner: 1} // Go right
      }
        break;
      case 1: { // Top left, going right
        let i = current.tile

        while (area(i + 1) && !area(i + raster.size.x + 1)) i += 1

        polygon.push(toCoords({tile: i, corner: 3}))

        if (area(i + raster.size.x + 1)) current = {tile: i + raster.size.x + 1, corner: 0}  // Go up
        else current = {tile: i, corner: 3} // Go down

        break;
      }

      case 2: { // Bottom right, going left
        let i = current.tile

        while (area(i - 1) && !area(i - raster.size.x - 1)) i -= 1

        polygon.push(toCoords({tile: i, corner: 0}))

        if (area(i - raster.size.x - 1)) current = {tile: i - raster.size.x - 1, corner: 3}  // Go down
        else current = {tile: i, corner: 0} // Go up

        break;
      }
      case 3: {// Top right, going down
        let i = current.tile

        while (area(i - raster.size.x) && !area(i - raster.size.x + 1)) i -= raster.size.x

        polygon.push(toCoords({tile: i, corner: 2}))

        if (area(i - raster.size.x + 1)) current = {tile: i - raster.size.x + 1, corner: 1}  // Go right
        else current = {tile: i, corner: 2} // Go left

        break;
      }

    }

  } while (!done())

  return leaflet.polygon(polygon.map(Vector2.toLatLong))
}

export function tilePolygon(tile: Vector2, options: leaflet.PolylineOptions = {}) {
  return leaflet.polygon([
    {x: tile.x - 0.5, y: tile.y - 0.5},
    {x: tile.x - 0.5, y: tile.y + 0.5},
    {x: tile.x + 0.5, y: tile.y + 0.5},
    {x: tile.x + 0.5, y: tile.y - 0.5},
  ].map(Vector2.toLatLong), options)
}

export function tileHalfPolygons(tile: Vector2, styles: [leaflet.PolylineOptions, leaflet.PolylineOptions] = [{}, {}]): [leaflet.Polygon, leaflet.Polygon] {
  return [
    leaflet.polygon([
      {x: tile.x - 0.5, y: tile.y - 0.5},
      {x: tile.x - 0.5, y: tile.y + 0.5},
      {x: tile.x + 0.5, y: tile.y + 0.5},
    ].map(Vector2.toLatLong), styles[0]),
    leaflet.polygon([
      {x: tile.x - 0.5, y: tile.y - 0.5},
      {x: tile.x + 0.5, y: tile.y + 0.5},
      {x: tile.x + 0.5, y: tile.y - 0.5},
    ].map(Vector2.toLatLong), styles[1]),
  ]
}

export function boxPolygon(tile: Rectangle): leaflet.Polygon {
  return leaflet.polygon([
    {x: tile.topleft.x - 0.5, y: tile.topleft.y + 0.5},
    {x: tile.botright.x + 0.5, y: tile.topleft.y + 0.5},
    {x: tile.botright.x + 0.5, y: tile.botright.y - 0.5},
    {x: tile.topleft.x - 0.5, y: tile.botright.y - 0.5},
  ].map(Vector2.toLatLong))
}

export function areaPolygon(area: TileArea): leaflet.Polygon {
  if (!area.data && !area.size) return tilePolygon(area.origin)
  if (!area.data) return boxPolygon(TileArea.toRect(area))

  const active = activate(area)

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

  for (let dx = 0; dx < area.size.x; dx++) {
    for (let dy = 0; dy < area.size.y; dy++) {
      const tile = TileCoordinates.move(area.origin, {x: dx, y: dy})

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

    while (segments.length > 0) {
      const cursor = index(line, -1)

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

  return leaflet.polygon(lines.map(l => l.map(Vector2.toLatLong)))
}

/**
 * This function creates a polygon from a rectangle, interpreting the coordinates
 * as real coordinates instead of tile indices. This means, that a rectangle
 * where topleft equals botright has a width of zero instead of one.
 * @param rect
 */
export function boxPolygon2(rect: Rectangle): LatLngExpression[] {
  return [
    rect.topleft,
    {x: rect.botright.x, y: rect.topleft.y},
    rect.botright,
    {x: rect.topleft.x, y: rect.botright.y},
  ].map(Vector2.toLatLong)
}

export function linePolygon(...points: Vector2[]): leaflet.Polyline {
  return leaflet.polyline(points.map(Vector2.toLatLong))
}
