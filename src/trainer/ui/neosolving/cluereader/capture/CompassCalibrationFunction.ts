import {util} from "../../../../../lib/util/util";
import {angleDifference, circularMean, degreesToRadians, normalizeAngle, radiansToDegrees, Vector2} from "../../../../../lib/math";
import lodash from "lodash";
import {Compasses} from "../../../../../lib/cluetheory/Compasses";
import index = util.index;
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import {CompassReader} from "../CompassReader";

export interface CompassCalibrationFunction {
  apply(read_angle: number): CompassCalibrationFunction.EpsilonAngle
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

  apply(read_angle: number): CompassCalibrationFunction.EpsilonAngle {

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

      return CompassCalibrationFunction.AngleRange.toEpsilonAngle(
        [below.should_angle.highest, above.should_angle.lowest]
      )
    } else {
      const below = sample
      const above = index(this.samples, sample_i + 1)

      return CompassCalibrationFunction.AngleRange.toEpsilonAngle(
        CompassCalibrationFunction.AngleRange.shrink(
          [below.should_angle.highest, above.should_angle.lowest],
          0.33
        )
      )
    }
  }
}

export namespace FullCompassCalibrationFunction {
  export type Sample = {
    is_angle: number,
    should_angle: { lowest: number, highest: number }
  }
}

export class AngularKeyframeFunction implements CompassCalibrationFunction{
  private constructor(private readonly keyframes: {
                        original?: Vector2,
                        angle: number,
                        value: number
                      }[],
                      private base_f: (_: number) => number = () => 0) {
    this.keyframes = lodash.sortBy(keyframes, e => e.angle)
  }

  apply(read_angle: number): CompassCalibrationFunction.EpsilonAngle {
    return {
      angle: normalizeAngle(read_angle + this.sample(read_angle)),
      epsilon: CompassReader.EPSILON
    }
  }

  withBaseline(f: (_: number) => number): this {
    this.base_f = f

    return this
  }

  getSampleTable(): number[] {
    const samples: number[] = []

    const FRAMES = 5000

    for (let i = 0; i <= FRAMES; i++) {
      samples.push(this.sample(i * (2 * Math.PI / FRAMES)))
    }

    return samples
  }

  getCSV(): string {
    const header = "Is,Delta,Base-Delta,Full-Delta,X,Y\n"

    return header + this.keyframes.map((keyframe) => {
      return [keyframe.angle, keyframe.value, this.base_f(keyframe.angle), keyframe.value + this.base_f(keyframe.angle)]
        .map(radiansToDegrees).join(",") + `,${keyframe.original?.x},${keyframe.original?.y}`
    }).join("\n")
  }

  sample(angle: number): number {
    if (this.keyframes.length == 0) return 0
    if (this.keyframes.length == 1) return this.keyframes[0].value

    // TODO: Optimize with binary search instead

    let index_a = lodash.findLastIndex(this.keyframes, e => e.angle < angle)
    if (index_a < 0) index_a = this.keyframes.length - 1

    const index_b = (index_a + 1) % this.keyframes.length

    const previous = this.keyframes[index_a]
    const next = this.keyframes[index_b]

    const t = angleDifference(angle, previous.angle) / angleDifference(next.angle, previous.angle)

    // Linearly interpolate between keyframes
    return (1 - t) * previous.value + t * next.value + this.base_f(angle)
  }

  static fromCalibrationSamples(samples: {
                                  position: Vector2, is_angle_degrees: number
                                }[],
                                baseline_type: "cosine" | null = null,
  ): AngularKeyframeFunction {

    const keyframes = samples.filter(s => s.is_angle_degrees != undefined).map(({position, is_angle_degrees}) => {
      const should_angle = Vector2.angle(ANGLE_REFERENCE_VECTOR, {x: -position.x, y: -position.y})
      const is_angle = degreesToRadians(is_angle_degrees)

      let dif = should_angle - is_angle
      if (dif < -Math.PI) dif += 2 * Math.PI

      return {
        original: position,
        angle: is_angle,
        value: dif
      }
    })

    const baseline_function = (() => {
      switch (baseline_type) {
        case null:
          return () => 0
        case "cosine":
          // This would probably be the place for a fourier transform tbh, but this simplified version should be enough

          const PHASES = 4

          const max = Math.max(...keyframes.map(f => f.value))
          const min = Math.min(...keyframes.map(f => f.value))

          const offset = (max + min) / 2
          const amplitude = (max - min) / 2

          const hill_samples = keyframes.filter(k => Math.abs(max - k.value) < amplitude / 10).map(k => k.angle % (2 * Math.PI / PHASES))

          const phase = circularMean(hill_samples)

          //const phase = lodash.maxBy(keyframes, k => k.value).angle

          return (x) => amplitude * Math.cos(PHASES * (x - phase)) + offset
      }
    })()

    const reduced_keyframes = keyframes.map(f => ({...f, value: f.value - baseline_function(f.angle)}))

    return new AngularKeyframeFunction(
      reduced_keyframes, baseline_function
    ).withBaseline(baseline_function)
  }
}

export namespace AngularKeyframeFunction {
  export type Sample = {
    position: Vector2, is_angle_degrees: number
  }
}