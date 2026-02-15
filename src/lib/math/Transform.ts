import {Vector2} from "./Vector2";

export type Transform = Transform.Matrix

export namespace Transform {
  export type Vector3 = [number, number, number]
  export type Matrix = [Vector3, Vector3, Vector3]

  export namespace Vector3 {
    export function toVector2(a: Vector3): Vector2 {
      return {x: a[0], y: a[1]}
    }

    export function position(a: Vector2): Vector3 {
      return [a.x, a.y, 1]
    }

    export function direction(a: Vector2): Vector3 {
      return [a.x, a.y, 0]
    }
  }

  function mul(a: Vector3, b: Vector3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  }

  export function translation(offset: Vector2): Transform {
    return [
      [1, 0, offset.x],
      [0, 1, offset.y],
      [0, 0, 1]
    ]
  }

  export function rotation(rot: number): Transform {
    let theta = rot * Math.PI / 2

    return [
      [Math.cos(theta), -Math.sin(theta), 0],
      [Math.sin(theta), Math.cos(theta), 0],
      [0, 0, 1]
    ]
  }

  export function rotationRadians(radians: number): Transform {
    let theta = radians

    return [
      [Math.cos(theta), -Math.sin(theta), 0],
      [Math.sin(theta), Math.cos(theta), 0],
      [0, 0, 1]
    ]
  }

  export function scale(scale: Vector2): Transform {
    return [
      [scale.x, 0, 0],
      [0, scale.y, 0],
      [0, 0, 1]
    ]
  }

  export function mirror_x(): Transform {
    return [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]
  }

  export function mirror_y(): Transform {
    return [
      [1, 0, 0],
      [0, -1, 0],
      [0, 0, 1]
    ]
  }

  export function row(a: Transform, n: 0 | 1 | 2): Vector3 {
    return a[n]
  }

  export function col(a: Transform, n: 0 | 1 | 2): Vector3 {
    return [a[0][n], a[1][n], a[2][n]]
  }

  export function mult(a: Transform, b: Transform): Transform {
    const indices: [0, 1, 2] = [0, 1, 2]

    return indices.map(r =>
      indices.map(c =>
        mul(row(a, r), col(b, c))
      )
    ) as Matrix
  }

  export function chain(...transforms: Transform[]): Transform {
    let trans = identity()

    for (let transform of transforms) {
      trans = mult(trans, transform)
    }

    return trans
  }

  export function apply(a: Transform, b: Vector3): Vector3 {
    return [
      mul(row(a, 0), b),
      mul(row(a, 1), b),
      mul(row(a, 2), b),
    ]
  }

  export function identity(): Transform {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ]
  }
}