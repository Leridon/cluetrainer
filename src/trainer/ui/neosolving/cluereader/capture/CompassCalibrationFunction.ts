import {util} from "../../../../../lib/util/util";
import {angleDifference, circularMean, normalizeAngle} from "../../../../../lib/math";
import index = util.index;

interface CompassCalibrationFunction {
  apply(read_angle: number): { lowest: number, highest: number }
}

export namespace CompassCalibrationFunction {
  export type AngleRange = [number, number]

  export namespace AngleRange {
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

    export function toEpsilonAngle(range: AngleRange): EpsilonAngle {
      return {
        angle: normalizeAngle(circularMean(range)),
        epsilon: angleDifference(range[0], range[1])
      }
    }
  }

  export type EpsilonAngle = {
    angle: number,
    epsilon: number
  }
}

export class FullCompassCalibrationFunction implements CompassCalibrationFunction {
  constructor(private samples: FullCompassCalibrationFunction.Sample[]) {

  }

  apply(read_angle: number): { lowest: number, highest: number } {

    if (read_angle < this.samples[0].is_angle) read_angle += 2 * Math.PI;

    const find_lower = (lower: number, higher: number): number => {
      // Invariant: read_angle >= this.samples[lower].is_angle
      // Invariant: read_angle < this.samples[higher + 1].is_angle

      if (lower == higher) return lower

      const median_i = ~~((lower + higher) / 2)

      if (read_angle < this.samples[median_i].is_angle) return find_lower(lower, median_i - 1)
      else return find_lower(median_i, higher)
    }

    const sample_i = find_lower(0, this.samples.length - 1)

    const sample = this.samples[sample_i]

    if (read_angle == sample.is_angle) {
      const below = index(this.samples, sample_i - 1)
      const above = index(this.samples, sample_i + 1)

      return {
        lowest: below.should_angle.highest,
        highest: above.should_angle.lowest,
      }
    } else {
      const below = sample
      const above = index(this.samples, sample_i + 1)

      return {
        lowest: below.should_angle.highest,
        highest: above.should_angle.lowest,
      }
    }
  }
}

export namespace FullCompassCalibrationFunction {
  export type Sample = {
    is_angle: number,
    should_angle: { lowest: number, highest: number }
  }
}