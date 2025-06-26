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

  export type AngleRange = [number, number]

  export namespace AngleRange {
    export function contains(range: AngleRange, angle: number): boolean {
      if (angle >= range[0] && angle <= range[1]) return true

      const complement = angle + 2 * Math.PI

      return complement > range[0] && complement < range[1]
    }

    export function normalize(range: AngleRange): AngleRange {
      if (range.every(a => a > 2 * Math.PI)) {
        range[0] = normalizeAngle(range[0])
        range[1] = normalizeAngle(range[1])
      }

      if (range[1] < range[0]) range[1] += 2 * Math.PI

      return range
    }

    export function shrink(range: AngleRange, factor: number): AngleRange {
      normalize(range)

      const offset = angleDifference(range[0], range[1]) * factor / 2

      return normalize([
        range[0] + offset,
        range[1] + offset
      ])
    }

    export function fromAngles(...angles: number[]): AngleRange {
      let mean = circularMean(angles)

      if (mean < 0) mean += 2 * Math.PI

      let range: AngleRange = [mean, mean]

      for (let angle of angles) {
        if (angleDifference(angle, mean) > Math.PI) angle += 2 * Math.PI

        if (angle < 0) debugger

        if (angle < range[0]) range[0] = angle
        if (angle > range[1]) range[1] = angle

      }

      if (range[0] < 0) debugger

      return range
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
        range: [angle, angle]
      }
    }

    export function fromEpsilonAngle(angle: number, epsilon: number): UncertainAngle {
      return {
        median: angle,
        epsilon: epsilon,
        range: [angle - epsilon, angle + epsilon]
      }
    }

    export function fromRange(range: AngleRange): UncertainAngle {
      return {
        median: normalizeAngle(circularMean(range)),
        epsilon: angleDifference(range[0], range[1]) / 2,
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
  }
}