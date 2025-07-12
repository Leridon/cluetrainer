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
      Angles.AngleRange.between(sample.should_angle, index(this.samples, i + 1).should_angle)
    ).sort(Order.reverse(Order.comap(Order.natural_order, r => Angles.AngleRange.size(r))))
  })

  uncalibrated_ranges(): Angles.AngleRange[] {
    return this._inbetweens.get()
  }

  minEpsilons(): number[] {
    return this.samples.map((sample, i) =>
      Angles.AngleRange.size(sample.should_angle) / 2
    )
  }

  averageEpsilon(): number {
    let average_epsilon = 0

    this.samples.forEach((sample, i) => {
      const below = index(this.samples, i - 1)
      const above = index(this.samples, i + 1)

      average_epsilon += Angles.AngleRange.size(sample.should_angle) / (2 * Math.PI) * FullCompassCalibrationFunction.SamplingResult.fromHit(below, sample, above).result.epsilon

      const gap_above = FullCompassCalibrationFunction.SamplingResult.fromBetween(sample, above)

      average_epsilon += Angles.AngleRange.size(gap_above.result.range) / (2 * Math.PI) * gap_above.result.epsilon
    })

    return average_epsilon
  }

  bad_samples(): FullCompassCalibrationFunction.CompressedSample[] {
    return this.samples.flatMap((s, i) => {
      const next = index(this.samples, i + 1)

      const diff = Angles.angleDifferenceSigned(s.should_angle.to, next.should_angle.from)

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
            is_angle: {from: Math.PI / 2, to: Math.PI / 2},
            should_angle: {from: 0, to: Math.PI},
            raw_samples: []
          },
          after: {
            is_angle: {from: 3 * Math.PI / 2, to: 3 * Math.PI / 2,},
            should_angle: {from: Math.PI, to: 2 * Math.PI},
            raw_samples: []
          },
        }
      }
    }

    if (read_angle < this.samples[0].is_angle.from) read_angle += 2 * Math.PI;

    // Binary search for the angle in the sample set
    const find_lower = (lower: number, higher: number): number => {
      // Invariant: read_angle >= this.samples[lower].is_angle
      // Invariant: read_angle < this.samples[higher + 1].is_angle (if higher + 1 exists)
      if (lower == higher) return lower

      const median_i = Math.ceil((lower + higher) / 2)

      if (Angles.AngleRange.contains(this.samples[median_i].is_angle, read_angle)) return median_i

      if (read_angle > this.samples[median_i].is_angle.to) return find_lower(median_i, higher)
      else return find_lower(lower, median_i - 1)
    }

    const sample_i = find_lower(0, this.samples.length - 1)

    const sample = index(this.samples, sample_i)

    if (Angles.AngleRange.contains(sample.is_angle, read_angle)) {
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

  reverse_sample(should_angle: number): Angles.UncertainAngle {
    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i]
      const next = index(this.samples, i + 1)

      if (Angles.AngleRange.contains(this.samples[i].should_angle, should_angle)) {
        return Angles.UncertainAngle.fromRange(sample.is_angle)
      } else if (Angles.AngleRange.contains(Angles.AngleRange.between(this.samples[i].should_angle, next.should_angle), should_angle)) {
        return Angles.UncertainAngle.fromRange(Angles.AngleRange.construct(
          sample.is_angle.to,
          next.is_angle.from
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
    is_angle: Angles.AngleRange,
    should_angle: Angles.AngleRange,
    raw_samples: CalibrationTool.RawSample[]
  }

  export namespace CompressedSample {
    export function toString(self: CompressedSample) {
      return `${Angles.AngleRange.toString(self.is_angle, 3)} -> [${Angles.toString(self.should_angle.from, 3)}, ${Angles.toString(self.should_angle.to, 3)}]`
    }
  }

  export function compress(samples: CalibrationTool.RawSample[]): CompressedSample[] {
    const sorted_samples = lodash.sortBy(samples, s => CalibrationTool.shouldAngle(s.position))

    let i = 0;

    const compressed_samples: CompressedSample[] = []

    while (i < sorted_samples.length) {
      const group_angle = Angles.AngleRange.fromAngles(sorted_samples[i].is_angle)

      const group_start_i = i

      i++

      while (i < sorted_samples.length && (Angles.AngleRange.contains(group_angle, sorted_samples[i].is_angle))) i++
      // i now points to the next sample that is not part of this group

      const group = sorted_samples.slice(group_start_i, i)

      compressed_samples.push({
        is_angle: Angles.AngleRange.fromAngles(...group.map(s => s.is_angle)),
        should_angle: Angles.AngleRange.fromAngles(...group.map(s => CalibrationTool.shouldAngle(s.position))),
        raw_samples: group
      })
    }

    // TODO: Merge neighbouring, overlapping samples

    // Sort compressed samples by is angle range
    compressed_samples.sort(Order.comap(Order.natural_order, s => s.is_angle.from))

    while (true) {
      const merged_i = compressed_samples.findIndex((sample, i) => {
        const next = index(compressed_samples, i + 1)

        return Angles.angleDifferenceSigned(sample.should_angle.to, next.should_angle.from) < 0
      })

      if (merged_i < 0) break


      const sample = compressed_samples[merged_i]
      const next = index(compressed_samples, merged_i + 1)

      console.log(`Merging ${merged_i}`)

      sample.should_angle = Angles.AngleRange.merge(sample.should_angle, next.should_angle)
      sample.is_angle = Angles.AngleRange.merge(sample.is_angle, next.is_angle)

      sample.raw_samples.push(...next.raw_samples)

      compressed_samples.splice((merged_i + 1) % compressed_samples.length, 1)
    }

    return compressed_samples

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
          Angles.AngleRange.between(below.should_angle, above.should_angle)
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
        result: UncertainAngle.fromRange(Angles.AngleRange.between(below.should_angle, above.should_angle)),
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