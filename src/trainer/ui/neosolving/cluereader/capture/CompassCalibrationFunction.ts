import {util} from "../../../../../lib/util/util";
import {Vector2} from "../../../../../lib/math";
import lodash from "lodash";
import {Compasses} from "../../../../../lib/cluetheory/Compasses";
import {CalibrationTool} from "../../../../../devtools/CompassCalibrationTool";
import {Angles} from "../../../../../lib/math/Angles";
import index = util.index;
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import UncertainAngle = Angles.UncertainAngle;
import angleDifference = Angles.angleDifference;

export interface CompassCalibrationFunction {
  apply(read_angle: number): UncertainAngle
}

export namespace CompassCalibrationFunction {
  export const none = new class implements CompassCalibrationFunction {
    apply(read_angle: number): Angles.UncertainAngle {
      return UncertainAngle.fromAngle(read_angle);
    }
  }
}

export class FullCompassCalibrationFunction implements CompassCalibrationFunction {
  constructor(private samples: FullCompassCalibrationFunction.CompressedSample[]) {

  }

  sample(read_angle: number): FullCompassCalibrationFunction.SamplingResult {
    if (this.samples.length == 0) {
      return {
        result: UncertainAngle.fromEpsilonAngle(Math.PI, Math.PI),
        details: {
          type: "outside",
          before: [Math.PI / 2, [0, Math.PI]],
          after: [3 * Math.PI / 2, [Math.PI, 2 * Math.PI]],
        }
      }
    }

    if (read_angle < this.samples[0][0]) read_angle += 2 * Math.PI;

    const EPS = Angles.degreesToRadians(0.01)

    // Binary search for the angle in the sample set
    const find_lower = (lower: number, higher: number): number => {
      // Invariant: read_angle >= this.samples[lower].is_angle
      // Invariant: read_angle < this.samples[higher + 1].is_angle
      if (lower == higher) return lower

      const median_i = ~~((lower + higher) / 2)

      if (angleDifference(read_angle, this.samples[median_i][0]) < EPS) return median_i

      if (read_angle < this.samples[median_i][0]) return find_lower(lower, median_i - 1)
      else return find_lower(median_i == lower ? lower + 1 : median_i, higher)
    }

    const sample_i = find_lower(0, this.samples.length)

    const sample = this.samples[sample_i]

    if (angleDifference(read_angle, sample[0]) < EPS) {
      // Read angle is within this sample
      // We need to include the range before and after this slice as well.

      const below = index(this.samples, sample_i - 1)
      const above = index(this.samples, sample_i + 1)

      return {
        result: UncertainAngle.fromRange(
          [below[1][1], above[1][0]]
        ),
        details: {
          type: "within",
          before: below,
          in_sample: sample,
          after: above
        }
      }
    } else {
      // Read angle is betweeen two samples.
      // We only need to consider the angles inbetween.
      const below = sample
      const above = index(this.samples, sample_i + 1)

      return {
        result: UncertainAngle.fromRange(
          [below[1][1], above[1][0]],
        ),
        details: {
          type: "outside",
          before: below,
          after: above
        }
      }
    }
  }

  apply(read_angle: number): Angles.UncertainAngle {
    return this.sample(read_angle).result;
  }
}

export namespace FullCompassCalibrationFunction {
  /**
   * A compressed sample is a data point mapping a read-angle to a range of should-angles
   */
  export type CompressedSample = [number, Angles.AngleRange]

  export namespace CompressedSample {
    export function toString(self: CompressedSample) {
      return `${Angles.radiansToDegrees(self[0]).toFixed(3)} -> [${Angles.radiansToDegrees(self[1][0]).toFixed(3)}, ${Angles.radiansToDegrees(self[1][1]).toFixed(3)}]`
    }
  }

  export function compress(samples: CalibrationTool.RawSample[]): CompressedSample[] {
    const sorted_samples = lodash.sortBy(samples, s => s.is_angle_degrees)

    let i = 0;

    const compressed_samples: CompressedSample[] = []

    while (i < sorted_samples.length) {
      const group_angle = sorted_samples[i].is_angle_degrees

      const group_start_i = i

      i++

      while (i < sorted_samples.length && sorted_samples[i].is_angle_degrees == group_angle) i++
      // i now points to the next sample that is not part of this group

      const group = sorted_samples.slice(group_start_i, i)

      const should_range = Angles.AngleRange.fromAngles(
        ...group.map(s => CalibrationTool.shouldAngle(s.position))
      )

      compressed_samples.push([Angles.degreesToRadians(group_angle), should_range])
    }

    return compressed_samples
  }

  export type SamplingResult = {
    result: UncertainAngle,
    details: { type: string } & ({
      type: "within",
      before: CompressedSample,
      in_sample: CompressedSample,
      after: CompressedSample,
    } | {
      type: "outside",
      before: CompressedSample,
      after: CompressedSample
    })
  }

  export namespace SamplingResult {
    export function toString(self: SamplingResult) {
      let string = UncertainAngle.toString(self.result, 2)

      switch (self.details.type) {
        case "within":
          string += `${CompressedSample.toString(self.details.before)}`

        case "outside":
      }
    }
  }
}

export class AngularKeyframeFunction implements CompassCalibrationFunction {
  private constructor(private readonly keyframes: {
                        original?: Vector2,
                        angle: number,
                        value: number
                      }[],
                      private base_f: (_: number) => number = () => 0,
                      private epsilon: number
  ) {
    this.keyframes = lodash.sortBy(keyframes, e => e.angle)
  }

  apply(read_angle: number): UncertainAngle {
    return UncertainAngle.fromEpsilonAngle(
      Angles.normalizeAngle(read_angle + this.sample(read_angle)),
      this.epsilon
    )
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
    const header = "Is,Should,Delta,Base-Delta,Full-Delta,X,Y\n"

    return header + this.keyframes.map((keyframe) => {
      const delta = keyframe.value
      const base_delta = this.base_f(keyframe.angle)
      const full_delta = delta + base_delta

      const should_value = keyframe.value + full_delta

      return [keyframe.angle, should_value, keyframe.value, base_delta, full_delta]
        .map(Angles.radiansToDegrees).join(",") + `,${keyframe.original?.x},${keyframe.original?.y}`
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

    const t = Angles.angleDifference(angle, previous.angle) / Angles.angleDifference(next.angle, previous.angle)

    // Linearly interpolate between keyframes
    return (1 - t) * previous.value + t * next.value + this.base_f(angle)
  }

  static fromCalibrationSamples(samples: CalibrationTool.RawSample[],
                                baseline_type: "cosine" | null = null,
                                epsilon: number
  ): AngularKeyframeFunction {

    const keyframes = samples.filter(s => s.is_angle_degrees != undefined).map(({position, is_angle_degrees}) => {
      const should_angle = Vector2.angle(ANGLE_REFERENCE_VECTOR, {x: -position.x, y: -position.y})
      const is_angle = Angles.degreesToRadians(is_angle_degrees)

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

          const phase = Angles.circularMean(hill_samples)

          //const phase = lodash.maxBy(keyframes, k => k.value).angle

          return (x) => amplitude * Math.cos(PHASES * (x - phase)) + offset
      }
    })()

    const reduced_keyframes = keyframes.map(f => ({...f, value: f.value - baseline_function(f.angle)}))

    return new AngularKeyframeFunction(
      reduced_keyframes, baseline_function, epsilon
    ).withBaseline(baseline_function)
  }
}