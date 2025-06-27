import lodash from "lodash";
import {util} from "../util/util";

export namespace Angles {
  import positive_mod = util.positive_mod;

  export function radiansToDegrees(radians: number): number {
    return radians / (2 * Math.PI) * 360
  }

  export function degreesToRadians(degrees: number): number {
    return (degrees / 360) * (2 * Math.PI)
  }

  export const EQUALITY_EPSILON = degreesToRadians(0.001)

  export function isSameRadians(a: number, b: number) {
    return Math.abs(a - b) < EQUALITY_EPSILON
  }

  export function normalizeAngle(radians: number): number {
    while (radians < 0) radians += 2 * Math.PI
    while (radians > 2 * Math.PI) radians -= 2 * Math.PI

    return radians
  }

  export function circularMean(angles: number[]): number {
    return Math.atan2(lodash.sum(angles.map(Math.sin)), lodash.sum(angles.map(Math.cos)))
  }

  export function angleDifference(a: number, b: number): number {
    return Math.abs(positive_mod(b - a + Math.PI, 2 * Math.PI) - Math.PI);
  }

  export type AngleRange = {
    from: number,
    to: number
  }

  export namespace AngleRange {
    export function construct(from: number, to: number): AngleRange {
      return normalize({from, to})
    }

    export function contains(range: AngleRange, angle: number): boolean {
      if (angle >= range.from && angle <= range.to) return true

      const complement = angle + 2 * Math.PI

      return complement > range.from && complement < range.to
    }

    export function normalize(range: AngleRange): AngleRange {
      if ([range.from, range.to].every(a => a > 2 * Math.PI)) {
        range.from = normalizeAngle(range.from)
        range.to = normalizeAngle(range.to)
      }

      if (range.to < range.from) range.to += 2 * Math.PI

      return range
    }

    export function shrink(range: AngleRange, factor: number): AngleRange {
      normalize(range)

      const offset = angleDifference(range[0], range[1]) * factor / 2

      return normalize({
        from: range.from + offset,
        to: range.to - offset
      })
    }

    export function around(angle: number, size: number): AngleRange {
      return normalize({
        from: angle - size / 2,
        to: angle + size / 2,
      })
    }

    export function fromAngles(...angles: number[]): AngleRange {
      let mean = circularMean(angles)

      if (mean < 0) mean += 2 * Math.PI

      let range: AngleRange = {
        from: mean,
        to: mean
      }

      for (let angle of angles) {
        if (angleDifference(angle, mean) > Math.PI) angle += 2 * Math.PI

        if (angle < range.from) range.from = angle
        if (angle > range.to) range.to = angle
      }

      return normalize(range)
    }

    export function mean(self: AngleRange): number {
      return normalizeAngle((self.from + self.to) / 2)
    }

    export function between(a: AngleRange, b: AngleRange): AngleRange {
      // Special case when a and b are the same infinitely small range
      if (a == b && a.from == a.to) return construct(a.to + EQUALITY_EPSILON, a.from - EQUALITY_EPSILON)

      return construct(a.to, b.from)
    }

    export function size(self: AngleRange): number {
      return normalizeAngle(self.to - self.from)
    }

    export function overlaps(a: AngleRange, b: AngleRange) {
      return (a.from <= b.to && a.to >= b.from) || (b.from <= a.to && b.to >= a.from)
    }
  }

  export type UncertainAngle = {
    median: number,
    epsilon: number,
    range: AngleRange,
  }

  export namespace UncertainAngle {
    import positive_mod = util.positive_mod;

    export function fromAngle(angle: number): UncertainAngle {
      return {
        median: angle,
        epsilon: 0,
        range: AngleRange.fromAngles(angle)
      }
    }

    export function fromEpsilonAngle(angle: number, epsilon: number): UncertainAngle {
      return {
        median: angle,
        epsilon: epsilon,
        range: {from: angle - epsilon, to: angle + epsilon}
      }
    }

    export function fromRange(range: AngleRange): UncertainAngle {
      return {
        median: AngleRange.mean(range),
        epsilon: AngleRange.size(range) / 2,
        range: range
      }
    }

    export function meanDifference(a: UncertainAngle, b: UncertainAngle): number {
      return Math.abs(positive_mod(a.median - b.median + Math.PI, 2 * Math.PI) - Math.PI);
    }

    export function toAngleString(self: UncertainAngle, precision: number = 1): string {
      return `${radiansToDegrees(self.median).toFixed(precision)}°`
    }

    export function toUncertaintyString(self: UncertainAngle, precision: number = 2): string {
      return `±${radiansToDegrees(self.epsilon).toFixed(precision)}°`
    }

    export function toString(self: UncertainAngle, precision: number = 1): string {
      return toAngleString(self, precision) + "  " + toUncertaintyString(self, precision)
    }

    export function contains(self: UncertainAngle, angle: number): boolean {
      return angleDifference(angle, self.median) < (self.epsilon + EQUALITY_EPSILON)
    }
  }
}