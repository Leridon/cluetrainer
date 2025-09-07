import * as lodash from "lodash";
import {Rectangle, Vector2} from "../math";

export type ScreenRectangle = {
  origin: Vector2,
  size: Vector2
}

export namespace ScreenRectangle {
  export function move(rect: ScreenRectangle, offset: Vector2, new_size: Vector2 = null): ScreenRectangle {
    return {
      origin: Vector2.add(rect.origin, offset),
      size: new_size ?? rect.size
    }
  }

  export function subRect(rect: ScreenRectangle, sub: ScreenRectangle): ScreenRectangle {
    return move(rect, sub.origin, sub.size)
  }

  export function relativeTo(parent: ScreenRectangle, child: ScreenRectangle): ScreenRectangle {
    return {
      origin: Vector2.sub(child.origin, parent.origin),
      size: child.size,
    }
  }

  export function fromRectangle(rect: Rectangle): ScreenRectangle {
    return {
      origin: Rectangle.screenOrigin(rect),
      size: {
        x: Rectangle.width(rect) + 1,
        y: Rectangle.height(rect) + 1,
      }
    }
  }

  export function fromPixels(...pixels: Vector2[]) {
    return fromRectangle(Rectangle.from(...pixels))
  }

  export function toRectangle(rect: ScreenRectangle): Rectangle {
    return Rectangle.fromOriginAndSize(rect.origin, rect.size)
  }

  export function extend(rect: ScreenRectangle, offset: Vector2): ScreenRectangle {
    return {
      origin: Vector2.sub(rect.origin, offset),
      size: Vector2.add(rect.size, offset, offset),
    }
  }

  export function contains(rect: ScreenRectangle, pos: Vector2): boolean {
    const off = Vector2.sub(pos, rect.origin)

    return off.x >= 0 && off.x < rect.size.x && off.y >= 0 && off.y < rect.size.y
  }

  export function center(rect: ScreenRectangle): Vector2 {
    return Vector2.snap(Vector2.add(rect.origin, Vector2.scale(0.5, rect.size)))
  }

  export function centeredOn(center: Vector2, radius: number | Vector2): ScreenRectangle {
    if (typeof radius == "number") radius = {x: radius, y: radius}

    return {
      origin: Vector2.sub(center, radius),
      size: Vector2.scale(2, radius)
    }
  }

  export function union(...rects: ScreenRectangle[]): ScreenRectangle {
    return ScreenRectangle.fromRectangle(
      Rectangle.union(
        ...rects.map(ScreenRectangle.toRectangle)
      )
    )
  }

  export function equals(a: ScreenRectangle, b: ScreenRectangle): boolean {
    return lodash.isEqual(a, b)
  }
}