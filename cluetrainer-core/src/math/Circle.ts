import {Vector2} from "./Vector2";

export type Circle = {
  center: Vector2,
  radius: number
}

export namespace Circle {
  export function contains(self: Circle, pos: Vector2): boolean {
    return Vector2.lengthSquared(Vector2.sub(pos, self.center)) < (self.radius * self.radius)
  }
}