import {Transform, Vector2} from "../../math";

export type TileTransform = {
  matrix: Transform,
  level_offset: number
}

export namespace TileTransform {
  export function normalize(t: Transform | TileTransform): TileTransform {
    return Array.isArray(t) ? {
      matrix: t,
      level_offset: 0
    } : t
  }

  export function lift(t: Transform, level_offset: number = 0): TileTransform {
    return {
      matrix: t,
      level_offset: level_offset
    }
  }

  export function mult(a: TileTransform | Transform, b: TileTransform | Transform): TileTransform {
    let norm_a = normalize(a)
    let norm_b = normalize(b)

    return lift(Transform.mult(norm_a.matrix, norm_b.matrix), norm_a.level_offset + norm_b.level_offset)
  }

  export function chain(...transforms: (TileTransform | Transform)[]): TileTransform {
    let trans = identity()

    for (let transform of transforms) {
      trans = mult(trans, transform)
    }

    return trans
  }

  export function translation(offset: Vector2, level_offset: number): TileTransform {
    return {
      matrix: Transform.translation(offset),
      level_offset: level_offset
    }
  }

  export function identity(): TileTransform {
    return {
      matrix: Transform.identity(),
      level_offset: 0
    }
  }
}