import {Rectangle, Transform, Vector2} from "../../math";
import {floor_t} from "./index";
import {TileCoordinates} from "./TileCoordinates";
import {TileTransform} from "./TileTransform";

export type TileRectangle = Rectangle & {
  level: floor_t
}

export namespace TileRectangle {
  export function contains(box: TileRectangle, tile: TileCoordinates) {
    return tile.level == box.level && Rectangle.containsTile(box, tile)
  }

  export function containsCoords(box: TileRectangle, tile: TileCoordinates) {
    return tile.level == box.level && Rectangle.contains(box, tile)
  }

  export function clampInto(pos: TileCoordinates, area: TileRectangle): TileCoordinates {
    return TileCoordinates.lift(Rectangle.clampInto(pos, area), pos.level)
  }

  export function extend(box: TileRectangle, padding: number | [number, number]): TileRectangle {
    return lift(Rectangle.extend(box, padding), box.level)
  }

  export function tl(rect: TileRectangle): TileCoordinates {
    return TileCoordinates.lift(rect.topleft, rect.level)
  }

  export function br(rect: TileRectangle): TileCoordinates {
    return TileCoordinates.lift(rect.botright, rect.level)
  }

  export function tr(rect: TileRectangle): TileCoordinates {
    return TileCoordinates.lift(Rectangle.topRight(rect), rect.level)
  }

  export function bl(rect: TileRectangle): TileCoordinates {
    return TileCoordinates.lift(Rectangle.bottomLeft(rect), rect.level)
  }

  export function center(rect: TileRectangle, snap: boolean = true): TileCoordinates {
    return TileCoordinates.lift(Rectangle.center(rect, snap), rect.level)
  }

  export function fromTile(tile: TileCoordinates): TileRectangle {
    if (!tile) return null

    return {
      level: tile.level,
      topleft: {x: tile.x, y: tile.y},
      botright: {x: tile.x, y: tile.y},
    }
  }

  export function isTile(rect: TileRectangle): boolean {
    return Vector2.eq(rect.topleft, rect.botright)
  }

  export function lift(v: Rectangle, level: floor_t): TileRectangle {
    return {...v, level: level}
  }


  export function left(rect: TileRectangle): TileRectangle {
    return lift(Rectangle.left(rect), rect.level)
  }

  export function right(rect: TileRectangle): TileRectangle {
    return lift(Rectangle.right(rect), rect.level)
  }

  export function top(rect: TileRectangle): TileRectangle {
    return lift(Rectangle.top(rect), rect.level)
  }

  export function bottom(rect: TileRectangle): TileRectangle {
    return lift(Rectangle.bottom(rect), rect.level)
  }

  export function from(...points: TileCoordinates[]): TileRectangle {
    return lift(Rectangle.from(...points), Math.min(...points.map(p => p.level)) as floor_t)
  }

  export function extendTo(rect: TileRectangle, tile: Vector2): Rectangle {
    return lift(Rectangle.extendTo(rect, tile), rect.level)
  }

  export function extendToRect(rect: TileRectangle, other: Rectangle): TileRectangle {
    return lift(Rectangle.extendToRect(rect, other), rect.level)
  }

  export function translate(rect: TileRectangle, off: Vector2): TileRectangle {
    return lift(Rectangle.translate(rect, off), rect.level)
  }

  export function transform(rect: TileRectangle, trans: TileTransform | Transform): TileRectangle {
    let norm = TileTransform.normalize(trans)

    return lift(Rectangle.transform(rect, norm.matrix), floor_t.clamp(rect.level + norm.level_offset))
  }

  export function equals(a: TileRectangle, b: TileRectangle): boolean {
    return (a == b) || (!!a && !!b && Rectangle.equals(a, b) && a.level == b.level)
  }
}