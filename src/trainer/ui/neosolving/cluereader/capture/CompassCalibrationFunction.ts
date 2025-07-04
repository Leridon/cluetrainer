import {util} from "../../../../../lib/util/util";
import {Vector2} from "../../../../../lib/math";
import lodash from "lodash";
import {Compasses} from "../../../../../lib/cluetheory/Compasses";
import {CalibrationTool} from "../../../../../devtools/CompassCalibrationTool";
import {Angles} from "../../../../../lib/math/Angles";
import {lazy} from "../../../../../lib/Lazy";
import index = util.index;
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import UncertainAngle = Angles.UncertainAngle;
import angleDifference = Angles.angleDifference;
import Order = util.Order;

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
  constructor(public readonly samples: FullCompassCalibrationFunction.CompressedSample[]) {

  }

  private _inbetweens = lazy(() => {
    if (this.samples.length == 0) return [Angles.AngleRange.around(Math.PI / 8, 2 * Math.PI)]
    else return this.samples.map((sample, i) =>
      Angles.AngleRange.between(sample.is_angle, index(this.samples, i + 1).is_angle)
    ).sort(Order.reverse(Order.comap(Order.natural_order, r => Angles.AngleRange.size(r))))
  })

  uncalibrated_ranges(): Angles.AngleRange[] {
    return this._inbetweens.get()
  }

  minEpsilons(): number[] {
    return this.samples.map((sample, i) =>
      Angles.AngleRange.size(sample.is_angle) / 2
    )
  }

  averageEpsilon(): number {
    let average_epsilon = 0

    this.samples.forEach((sample, i) => {
      const below = index(this.samples, i - 1)
      const above = index(this.samples, i + 1)

      average_epsilon += Angles.AngleRange.size(sample.is_angle) / (2 * Math.PI) * FullCompassCalibrationFunction.SamplingResult.fromHit(below, sample, above).result.epsilon

      const gap_above = FullCompassCalibrationFunction.SamplingResult.fromBetween(sample, above)

      average_epsilon += Angles.AngleRange.size(gap_above.result.range) / (2 * Math.PI) * gap_above.result.epsilon
    })

    return average_epsilon
  }

  bad_samples(): FullCompassCalibrationFunction.CompressedSample[] {
    return this.samples.flatMap((s, i) => {
      const next = index(this.samples, i + 1)

      const diff = Angles.angleDifferenceSigned(s.is_angle.to, next.is_angle.from)

      const is_bad = diff < 0 && Math.abs(diff) < Math.PI

      if (is_bad) return [s, next]
      else return []
    })
  }

  sample(read_angle: number): FullCompassCalibrationFunction.SamplingResult {
    if (this.samples.length == 0) {
      return {
        result: UncertainAngle.fromEpsilonAngle(Math.PI, Math.PI),
        details: {
          type: "outside",
          before: {
            read_angle: Math.PI / 2,
            is_angle: {from: 0, to: Math.PI},
            raw_samples: []
          },
          after: {
            read_angle: 3 * Math.PI / 2,
            is_angle: {from: Math.PI, to: 2 * Math.PI},
            raw_samples: []
          },
        }
      }
    }

    if (read_angle < this.samples[0].read_angle) read_angle += 2 * Math.PI;

    // Binary search for the angle in the sample set
    const find_lower = (lower: number, higher: number): number => {
      // Invariant: read_angle >= this.samples[lower].is_angle
      // Invariant: read_angle < this.samples[higher + 1].is_angle (if higher + 1 exists)
      if (lower == higher) return lower

      const median_i = Math.ceil((lower + higher) / 2)

      if (Angles.isSameRadians(read_angle, this.samples[median_i].read_angle)) return median_i

      if (read_angle >= this.samples[median_i].read_angle) return find_lower(median_i, higher)
      else return find_lower(lower, median_i - 1)
    }

    const sample_i = find_lower(0, this.samples.length - 1)

    const sample = index(this.samples, sample_i)

    if (angleDifference(read_angle, sample.read_angle) < Angles.EQUALITY_EPSILON) {
      // Read angle is within this sample
      // We need to include the range before and after this slice as well.

      const below = index(this.samples, sample_i - 1)
      const above = index(this.samples, sample_i + 1)

      return FullCompassCalibrationFunction.SamplingResult.fromHit(below, sample, above)
    } else {
      // Read angle is between two samples.
      // We only need to consider the angles inbetween.
      const below = sample
      const above = index(this.samples, sample_i + 1)

      return FullCompassCalibrationFunction.SamplingResult.fromBetween(below, above)
    }
  }

  reverse_sample(should_angle: number) {
    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i]
      const next = index(this.samples, i + 1)

      if (Angles.AngleRange.contains(this.samples[i].is_angle, should_angle)) {
        return Angles.UncertainAngle.fromAngle(sample.read_angle)
      } else if (Angles.AngleRange.contains(Angles.AngleRange.between(this.samples[i].is_angle, next.is_angle), should_angle)) {
        return Angles.UncertainAngle.fromRange(Angles.AngleRange.construct(
          sample.read_angle,
          next.read_angle
        ))
      }
    }

    return undefined
  }

  apply(read_angle: number): Angles.UncertainAngle {
    return this.sample(read_angle).result;
  }
}

export namespace FullCompassCalibrationFunction {
  /**
   * A compressed sample is a data point mapping a read-angle to a range of should-angles
   */
  export type CompressedSample = {
    read_angle: number,
    is_angle: Angles.AngleRange,
    raw_samples: CalibrationTool.RawSample[]
  }

  export namespace CompressedSample {
    export function toString(self: CompressedSample) {
      return `${Angles.toString(self.read_angle, 3)} -> [${Angles.toString(self.is_angle.from, 3)}, ${Angles.toString(self.is_angle.to, 3)}]`
    }
  }

  export function compress(samples: CalibrationTool.RawSample[]): CompressedSample[] {
    const sorted_samples = lodash.sortBy(samples, s => s.is_angle)

    let i = 0;

    const compressed_samples: CompressedSample[] = []

    while (i < sorted_samples.length) {
      const group_angle = sorted_samples[i].is_angle

      const group_start_i = i

      i++

      while (i < sorted_samples.length && (Angles.isSameRadians(sorted_samples[i].is_angle, group_angle))) i++
      // i now points to the next sample that is not part of this group

      const group = sorted_samples.slice(group_start_i, i)

      const should_range = Angles.AngleRange.fromAngles(
        ...group.map(s => CalibrationTool.shouldAngle(s.position))
      )

      compressed_samples.push({
        read_angle: group_angle,
        is_angle: should_range,
        raw_samples: group
      })
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
    export function fromBetween(below: CompressedSample, above: CompressedSample): SamplingResult {
      return {
        result: UncertainAngle.fromRange(
          Angles.AngleRange.between(below.is_angle, above.is_angle)
        ),
        details: {
          type: "outside",
          before: below,
          after: above
        }
      }
    }

    export function fromHit(below: CompressedSample, hit: CompressedSample, above: CompressedSample): SamplingResult {
      return {
        result: UncertainAngle.fromRange(Angles.AngleRange.between(below.is_angle, above.is_angle)),
        details: {
          type: "within",
          before: below,
          in_sample: hit,
          after: above
        }
      }
    }

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

    const keyframes = samples.filter(s => s.is_angle != undefined).map(({position, is_angle}) => {
      const should_angle = Vector2.angle(ANGLE_REFERENCE_VECTOR, {x: -position.x, y: -position.y})

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