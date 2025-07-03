import {NisModal} from "../lib/ui/NisModal";
import {Alt1MainHotkeyEvent} from "../lib/alt1/Alt1MainHotkeyEvent";
import Widget from "../lib/ui/Widget";
import {ewent, observe} from "../lib/reactive";
import lodash from "lodash";
import {Alt1} from "../lib/alt1/Alt1";
import {Rectangle, Vector2} from "../lib/math";
import {GameMapMiniWidget, levelIcon} from "../lib/gamemap/GameMap";
import ButtonRow from "../lib/ui/ButtonRow";
import LightButton from "../trainer/ui/widgets/LightButton";
import ImportStringModal from "../trainer/ui/widgets/modals/ImportStringModal";
import ExportStringModal from "../trainer/ui/widgets/modals/ExportStringModal";
import {MapEntity} from "../lib/gamemap/MapEntity";
import {TileCoordinates, TileRectangle} from "../lib/runescape/coordinates";
import * as leaflet from "leaflet";
import {GameLayer} from "../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../lib/gamemap/MapEvents";
import {tilePolygon} from "../trainer/ui/polygon_helpers";
import {CompassReader} from "../trainer/ui/neosolving/cluereader/CompassReader";
import {Compasses} from "../lib/cluetheory/Compasses";
import {util} from "../lib/util/util";
import {clue_data} from "../data/clues";
import Properties from "../trainer/ui/widgets/Properties";
import {C} from "../lib/ui/constructors";
import {Notification} from "../trainer/ui/NotificationBar";
import {AngularKeyframeFunction, FullCompassCalibrationFunction} from "trainer/ui/neosolving/cluereader/capture/CompassCalibrationFunction";
import {Angles} from "../lib/math/Angles";
import {storage} from "../lib/util/storage";
import KeyValueStore from "../lib/util/KeyValueStore";
import {ConfirmationModal} from "../trainer/ui/widgets/modals/ConfirmationModal";
import {direction, HostedMapData, PathFinder, TileMovementData} from "../lib/runescape/movement";
import {GameMapControl} from "../lib/gamemap/GameMapControl";
import TransportLayer from "../trainer/ui/map/TransportLayer";
import {TileArea} from "../lib/runescape/coordinates/TileArea";
import {ChunkedData} from "../lib/util/ChunkedData";
import {SelectTileInteraction} from "../lib/gamemap/interaction/SelectTileInteraction";
import {InteractionGuard} from "../lib/gamemap/interaction/InteractionLayer";
import InteractionTopControl from "../trainer/ui/map/InteractionTopControl";
import getExpectedAngle = Compasses.getExpectedAngle;
import greatestCommonDivisor = util.greatestCommonDivisor;
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import cleanedJSON = util.cleanedJSON;
import italic = C.italic;
import notification = Notification.notification;
import RawSample = CalibrationTool.RawSample;
import hbox = C.hbox;
import vbox = C.vbox;
import AngleRange = Angles.AngleRange;
import angleDifference = Angles.angleDifference;
import avg = util.avg;
import gielinor_compass = clue_data.gielinor_compass;
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import profileAsync = util.profileAsync;
import hgrid = C.hgrid;

type Fraction = Vector2

namespace Fraction {
  export function value(rationale: Vector2): number {
    return rationale.y / rationale.x
  }

  export function reduce(self: Fraction): Fraction {
    const gcd = greatestCommonDivisor(Math.abs(self.x), Math.abs(self.y))

    return Vector2.scale(1 / gcd, self)
  }
}

type AutoSelection = {
  desired_angle: number,
  desired_range: Angles.AngleRange,
  actual_angle: number,
}

type OffsetSelection = {
  auto?: AutoSelection,
  offset: Vector2,
  highlighted_offset?: Vector2
}

namespace OffsetSelection {
  export function activeOffset(self: OffsetSelection): Vector2 {
    return self?.highlighted_offset ?? self?.offset
  }
}

type SelectionStatus = {
  offset: OffsetSelection,
  existing_sample: CalibrationTool.RawSample
}

class SelectionStatusWidget extends Widget {
  constructor(status: SelectionStatus, private tool: CompassCalibrationTool) {
    super();

    const layout = new Properties().appendTo(this)

    layout.header("Selection Status")

    layout.named("Offset", `${Vector2.toString(status.offset.offset)}, (${Angles.toString(CalibrationTool.shouldAngle(status.offset.offset), 3)})`)

    if (status.offset.auto) {
      const delta = Angles.angleDifference(status.offset.auto.desired_angle, status.offset.auto.actual_angle)

      const range_size = Angles.AngleRange.size(status.offset.auto.desired_range)

      const is_far_away = delta > (range_size / 10)

      const text = `Δ=${Angles.radiansToDegrees(delta).toFixed(3)}° (${((delta / range_size) * 100).toFixed(2)}% of ${Angles.toString(Angles.AngleRange.size(status.offset.auto.desired_range), 3)} range)`

      layout.named("Auto", is_far_away ? C.span(text).css("color", "red") : text)

      layout.row(new LightButton("Backlog").slim().onClick(() => {
        this.tool.spot_queue.backlog(status.offset)
      }))
    } else {
      if (this.tool.spot_queue.size() > 0) {
        layout.named("Auto", new LightButton("Resume")
          .onClick(() => this.tool.spot_queue.dequeue())
        )
      } else {
        layout.named("Auto", "")
      }
    }


    layout.header("Existing Sample", "left", 1)

    if (status.existing_sample) {
      layout
        .named("Sampled", hgrid(Angles.toString(status.existing_sample.is_angle, 3), new LightButton("Delete")
          .slim()
          .setEnabled(!!status.existing_sample)
          .onClick(() => this.tool.delete())))
        .named("Fingerprint", CompassReader.ReadFingerprint.toString(status.existing_sample.fingerprint))
    } else {
      layout.row(italic("None"))
    }
  }
}

type SampleSetState = {
  samples: CalibrationTool.RawSample[],
  timestamp: number
}

class SampleSetBuilder {
  public record_event = ewent<CalibrationTool.RawSample>()

  private state: SampleSetState = {
    samples: [],
    timestamp: Date.now(),
  }

  private memory = KeyValueStore.instance().variable<SampleSetState>("preferences/calibrationtool/state")

  public function: FullCompassCalibrationFunction

  set_changed = ewent<CalibrationTool.RawSample[]>()
  set_loaded = ewent<this>()

  constructor(private tool: CompassCalibrationTool) {
    this.update()

    this.memory.get().then(value => {
      if (value) {
        this.state = value
        this.update()
      }

      this.set_loaded.trigger(this)
    })

    this.set_loaded.trigger(this)
  }

  date(): Date {
    return new Date(this.state.timestamp)
  }

  private changed() {
    this.state.timestamp = Date.now()

    this.memory.set(this.state)

    this.update()
  }

  private update() {
    this.function = new FullCompassCalibrationFunction(FullCompassCalibrationFunction.compress(this.state.samples))

    this.set_changed.trigger(this.state.samples)
  }

  async set(sample: CalibrationTool.RawSample[]): Promise<boolean> {
    const really = await ConfirmationModal.simple("Load Calibration Function", "Are you sure? This will irreversibly delete your collected samples.", "Cancel", "Confirm").do()

    if (!really) return false

    this.state.samples = sample

    this.changed()

    this.set_loaded.trigger(this)

    return true
  }

  delete(...positions: Vector2[]): void {

    const old_length = this.state.samples.length

    for (const position of positions) {
      const entry_index = this.state.samples.findIndex(s => Vector2.eq(s.position, position))

      if (entry_index >= 0) {
        const [e] = this.state.samples.splice(entry_index, 1)

        this.record_event.trigger(e)
      }
    }

    if (this.state.samples.length != old_length) this.changed()
  }

  private sort() {
    this.state.samples = lodash.sortBy(this.state.samples, s => CalibrationTool.shouldAngle(s.position))
  }

  record(offset: Vector2, state: CompassReader.Service.State.Normal) {
    const index_of_existing_sample = this.state.samples.findIndex(s => Vector2.eq(s.position, offset))

    if (index_of_existing_sample >= 0) this.state.samples.splice(index_of_existing_sample, 1)

    const new_sample: RawSample = {position: offset, is_angle: state.result.raw_angle, fingerprint: state.result.fingerprint}

    this.state.samples.push(new_sample)

    this.sort()

    this.changed()

    this.record_event.trigger(new_sample)
  }

  find(offset: Vector2): RawSample {
    if (!offset) return null

    const should = CalibrationTool.shouldAngle(offset)

    let low = 0;
    let high = this.state.samples.length

    while (true) {
      if (low == high) return null

      const median = ~~((low + high) / 2)

      const median_should = CalibrationTool.shouldAngle(this.state.samples[median].position)

      if (should == median_should) return this.state.samples[median]
      else if (should > median_should) low = median + 1
      else high = median
    }
    //return this.state.samples.find(s => Vector2.eq(s.position, offset))
  }

  size(): number {
    return this.state.samples.length
  }

  get(): RawSample[] {
    return this.state.samples
  }
}

function indexOfMinBy<T>(data: T[], f: (_: T, i: number) => number) {
  let index: number = undefined
  let min_Value = Number.MAX_VALUE

  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    const x = f(v, i)

    if (x != undefined && x < min_Value) {
      index = i
      min_Value = x
    }
  }

  return index
}

class TravellingSalesmanProblem<T> {
  private _init: AsyncInitialization

  private distance_map: number[][]
  private start_distance: number[]

  private come_from_solution: number[] = this.spots.map((_, i) => i)

  private start_position_index: number

  private spots_with_start: T[]

  constructor(private spots: T[],
              private distance: TravellingSalesmanProblem.StatefulDistanceFunction<T>,
              private start_position: T
  ) {
    this.spots_with_start = [...spots, start_position]
    this.start_position_index = spots.length

    this.distance_map = this.spots_with_start.map(_ => this.spots_with_start.map(_ => undefined))

    this.distance_map.forEach((row, i) => row[i] = 0)

    this._init = async_init(async () => await profileAsync(async () => {
      for (let i = 0; i < this.distance_map.length; i++) {
        for (let j = i + 1; j < this.distance_map.length; j++) {
          const a = this.spots_with_start[i]
          const b = this.spots_with_start[j]

          const d = !a || !b
            ? 0
            : await distance.distance(a, b)

          this.distance_map[i][j] = d
          this.distance_map[j][i] = d
        }
      }
    }, `Computing distances ${this.spots.length}`))
  }

  async wait<T>(f: (_: this) => T): Promise<T> {
    return this._init.wait().then(() => f(this))
  }

  private _assert_init() {
    if (!this._init.isInitialized()) throw new Error("TravellingSalesmanProblem must be awaited before it can be solved.")
  }

  private getDistance(a: number, b: number): number {
    return this.distance_map[a][b]
  }

  private _greedy(): number[] {
    this._assert_init()

    if (this.spots.length == 0) return []

    // A solution is an array that maps spot indices to the index of the previous node in the path (come-from)
    const come_from_map: number[] = this.spots.map(() => undefined)

    let position = this.start_position_index

    for (let i = 0; i < come_from_map.length; i++) {
      const greedy_best_i = indexOfMinBy(come_from_map, (value, i) => value == undefined ? this.getDistance(position, i) : undefined)

      come_from_map[greedy_best_i] = position
      position = greedy_best_i
    }

    return come_from_map
  }

  greedy(): this {
    this.come_from_solution = util.profile(() => this._greedy(), `Greedy Salesman ${this.spots.length}`)

    return this
  }

  getResult(): T[] {
    console.log(`Final cost ${this._evaluateComeFrom(this.come_from_solution)}`)

    return TravellingSalesmanProblem.go_to_to_solution(TravellingSalesmanProblem.come_from_to_go_to(this.come_from_solution)).map(p => this.spots[p])
  }

  private _evaluateComeFrom(come_from_solution: number[]): number {
    return lodash.sum(come_from_solution.map((come_from, pos) => this.getDistance(come_from, pos)))
  }

  private _optimize_by_pairwise_exchange() {
    let best = TravellingSalesmanProblem.go_to_to_solution(
      TravellingSalesmanProblem.come_from_to_go_to(this.come_from_solution)
    )

    let n = 0

    while (n < 100) {
      let best_swap: [number, number] = undefined
      let best_improvement = 0

      for (let i = 0; i < this.spots.length; i++) {
        const a = i > 0 ? best[i - 1] : this.start_position_index
        const b = best[i]
        const c = best[i + 1]

        for (let j = i + 1; j < this.spots.length; j++) {
          const x = best[j - 1]
          const y = best[j]
          const z = j + 1 < best.length ? best[j + 1] : undefined

          let pre_swap = 0
          let post_swap = 0

          pre_swap += this.getDistance(a, b)
          pre_swap += this.getDistance(b, c)

          post_swap += this.getDistance(a, y)

          if (j == i + 1) {
            post_swap += this.getDistance(y, b)
          } else {
            pre_swap += this.getDistance(x, y)

            post_swap += this.getDistance(y, c)
            post_swap += this.getDistance(x, b)
          }

          if (z != undefined) {
            pre_swap += this.getDistance(y, z)
            post_swap += this.getDistance(b, z)
          }

          const improvement = pre_swap - post_swap

          if (n == 6 && j == i + 1) {
            console.log(`${i} <-> ${j} : ${improvement}`)
          }

          if (improvement > best_improvement) {
            best_swap = [i, j]
            best_improvement = improvement
          }
        }
      }

      if (!best_swap) break
      n++
      if (n > 100) throw new Error(`Aborting after ${n} swaps`)

      console.log(`Swapping ${best_swap} for gain of ${best_improvement}`)
      const copy = [...best]

      copy[best_swap[0]] = best[best_swap[1]]
      copy[best_swap[1]] = best[best_swap[0]]

      best = copy

      console.log("After swap")
      console.log(best)

      console.log(`${best.length} Score ${this._evaluateComeFrom(TravellingSalesmanProblem.solution_to_come_from(best))}`)
    }

    console.log("Old")
    console.log(this.come_from_solution)

    this.come_from_solution = TravellingSalesmanProblem.solution_to_come_from(best)

    console.log("New")
    console.log(this.come_from_solution)

    console.log(`Did ${n} improvements`)

    return best
  }

  optimize_by_pairwise_exchange(): this {
    util.profile(() => this._optimize_by_pairwise_exchange(), `Pairwise Optimization`)

    return this
  }
}

namespace TravellingSalesmanProblem {

  export function come_from_to_go_to(come_from: number[]): number[] {
    const go_to_solution: number[] = new Array(come_from.length + 1)

    come_from.forEach((come_from, go_to) => go_to_solution[come_from] = go_to)

    return go_to_solution
  }

  export function solution_to_come_from(solution: number[]): number[] {
    const come_from = [...solution]

    solution.forEach((s, i) => {
      come_from[s] = i == 0 ? solution.length : solution[i - 1]
    })

    return come_from
  }

  export function go_to_to_solution(go_to: number[]): number[] {
    const solution: number[] = []

    let position = go_to[go_to.length - 1]

    while (position != undefined) {
      solution.push(position)
      position = go_to[position]
    }

    return solution
  }

  export abstract class StatefulDistanceFunction<T> {
    abstract distance(a: T, b: T): number | Promise<number>

    comap<U>(f: (_: U) => T): StatefulDistanceFunction<U> {
      const self = this

      return new class extends StatefulDistanceFunction<U> {
        distance(a: U, b: U): number | Promise<number> {
          return self.distance(f(a), f(b))
        }

      }
    }
  }

  export class PathFindingDistanceFunction extends StatefulDistanceFunction<TileCoordinates> {
    private states: {
      origin: TileCoordinates,
      state: PathFinder.state
    }[] = []

    async distance(a: TileCoordinates, b: TileCoordinates): Promise<number> {
      let state = this.states.find(s => TileCoordinates.eq(a, s.origin))

      if (!state) {
        this.states.push(state = {
          origin: a,
          state: PathFinder.init_djikstra(a)
        })
      }

      const path = await PathFinder.find(state.state, TileArea.init(b))

      return path ? PathFinder.pathLength(path) : Number.MAX_VALUE
    }

  }

  export class AStarDistanceFunction extends StatefulDistanceFunction<TileCoordinates> {
    constructor(private map_date: HostedMapData, private max_distance: number) {super();}

    async distance(a: TileCoordinates, b: TileCoordinates): Promise<number> {
      if (TileCoordinates.eq(a, b)) return 0

      type Node = {
        position: ChunkedData.coordinates,
        distance: number,
        estimated_total: number
      }

      class Queue {
        private row_index = 0
        private element_index = 0
        public size = 0

        private readonly data: Node[][]

        constructor(public max: number) {
          this.data = new Array(max + 1).fill(null).map(() => [])
        }

        push(node: Node) {
          if (node.estimated_total <= this.max) {
            this.data[node.estimated_total].push(node)
            this.size++
          }
        }

        pop(): Node {
          while (this.element_index >= this.data[this.row_index].length && this.row_index < this.max) {
            this.row_index++
            this.element_index = 0
          }

          if (this.row_index > this.max) return null

          this.size--

          return this.data[this.row_index][this.element_index++]
        }
      }

      function estimate(c: TileCoordinates): number {
        return Vector2.max_axis(Vector2.sub(b, c))
      }

      const queue = new Queue(this.max_distance)

      const grid = new ChunkedData<number>()

      function push(node: Node) {
        if (node.estimated_total <= queue.max && grid.get(node.position) == undefined) {
          grid.set(node.position, node.distance)

          queue.push(node)
        }
      }

      push({
        position: ChunkedData.split(a),
        distance: 0,
        estimated_total: estimate(a)
      })

      let iterations = 1000

      while (iterations > 0) {
        iterations--

        const next = queue.pop()

        if (!next) break

        const tile_data = await this.map_date.getTile(next.position.coords)

        for (let dir of direction.all) {

          if (TileMovementData.free(tile_data, dir)) {
            const target_tile = TileCoordinates.move(next.position.coords, direction.toVector(dir))

            if (TileCoordinates.equals(b, target_tile)) return next.distance + 1

            const successor: Node = {
              position: ChunkedData.split(target_tile),
              distance: next.distance + 1,
              estimated_total: next.distance + 1 + estimate(target_tile)
            }

            push(successor)
          }
        }
      }

      return Math.min(2 * this.max_distance, Vector2.max_axis(Vector2.sub(a, b)))
    }
  }
}

/**
 * Uses the farey sequence to find the rationale number (as a Vector2 where y is the numerator and x is the denominator) closest to the given number,
 * where the denominator is not bigger than the given limit.
 *
 * @param max_denominator The maximum denominator.
 * @param target_fraction The fraction to approximate
 * @param close_enough
 */
function approximateFractionAsRationaleNumber(max_denominator: number,
                                              target_fraction: Fraction,
                                              close_enough: (_: Fraction) => boolean = _ => false): Fraction {

  function approximateAsRationaleNumberImplementation(target_fraction: Fraction,
                                                      close_enough: (_: Fraction) => boolean
  ): Fraction {
    const target_number = Fraction.value(target_fraction)

    let lower: Fraction = {y: 0, x: 1}
    let higher: Fraction = {y: 1, x: 1}

    if (close_enough(lower)) return lower
    if (close_enough(higher)) return higher

    while (true) {
      const mediant = Vector2.add(lower, higher) // interestingly, c is already in reduced form

      if (close_enough(mediant)) return mediant

      const mediant_value = Fraction.value(mediant)

      // Because lower and higher are always (reduced) neighbours in a farey sequence, their mediant will also be reduced.

      // if the denominator is too big, return the closest of lower or higher
      if (mediant.x > max_denominator) {
        return lodash.minBy([lower, higher], frac => Math.abs(target_number - Fraction.value(frac)))
      }

      // adjust the interval:
      if (mediant_value < target_number) lower = mediant
      else higher = mediant
    }
  }

  const signs = Vector2.sign(target_fraction)

  const must_be_swapped = Math.abs(target_fraction.y) > Math.abs(target_fraction.x)

  const forth: (_: Vector2) => Vector2 = must_be_swapped ? v => Vector2.swap(Vector2.mul(signs, v)) : v => Vector2.mul(signs, v)
  const back: (_: Vector2) => Vector2 = must_be_swapped ? v => Vector2.mul(signs, Vector2.swap(v)) : v => Vector2.mul(signs, v)

  return back(approximateAsRationaleNumberImplementation(
    forth(target_fraction),
    v => close_enough(back(v))
  ))
}

type QueueFillerfunction = {
  name: string,
  repeatable?: boolean,
  function: () => OffsetSelection[]
}

class CalibrationQueue {
  public queue: OffsetSelection[] = []
  public filler: QueueFillerfunction

  changed = ewent<this>()

  constructor(public readonly parent: CompassCalibrationTool) {
    this.parent.sample_set.record_event.on(async sample => {
      const removed = this.remove(sample.position)

      if (removed != undefined) {
        const activated = this.dequeue(removed)

        if (!activated) {
          if (this.filler?.repeatable) this.fill(this.filler)
          else this.filler = null
        }
      }
    })

    this.parent.reference.subscribe(async ref => {
      await this.sortQueue(ref)

      this.changed.trigger(this)
    })
  }

  backlog(offset: OffsetSelection) {
    const index = this.queue.indexOf(offset)

    if (index >= 0) {
      this.queue.push(...this.queue.splice(index, 1))

      this.changed.trigger(this)

      this.dequeue()
    }
  }

  dequeue(index: number = 0): boolean {
    if (index >= 0 && index < this.queue.length) {
      this.parent.setOffset(this.queue[index])
      return true
    }

    return false
  }

  remove(offset: Vector2): number {
    const i = this.queue.findIndex(e => Vector2.eq(offset, e.offset))

    if (i >= 0) {
      this.queue.splice(i, 1)

      this.changed.trigger(this)

      return i
    }

    return undefined
  }

  size(): number {
    return this.queue.length
  }

  clear() {
    if (this.queue.length > 0) {
      this.queue = []

      this.changed.trigger(this)
    }

    this.filler = null
  }

  private async sortQueue(reference: TileCoordinates, start_offset: Vector2 = undefined) {
    if (this.queue.length == 0) return

    const rect: TileRectangle = {"topleft": {"x": 1950, "y": 4152}, "botright": {"x": 3898, "y": 2594}, "level": 0}

    const backlog: OffsetSelection[] = []

    async function findAccessibleOffset(sel: OffsetSelection, i: number = 1): Promise<number> {
      const off = Vector2.scale(i, sel.offset)

      const pos = TileCoordinates.move(reference, off)

      if (!TileRectangle.contains(rect, pos)) return 0

      if (await HostedMapData.get().isAccessible(pos)) return i
      else return findAccessibleOffset(sel, i + 1)
    }

    for (let offsetSelection of this.queue) {
      const index = await findAccessibleOffset(offsetSelection)

      if (index == 0) {
        backlog.push(offsetSelection)
      } else {
        offsetSelection.highlighted_offset = Vector2.scale(index, offsetSelection.offset)
      }
    }

    backlog.forEach(offsetSelection => this.queue.splice(this.queue.indexOf(offsetSelection), 1))

    const sorted_by_should_angle = lodash.sortBy(this.queue, s => CalibrationTool.shouldAngle(s.offset))

    const reference_digspot = this.parent.reference.value()

    this.queue = await new TravellingSalesmanProblem(sorted_by_should_angle,
      //new TravellingSalesmanProblem.PathFindingDistanceFunction()
      new TravellingSalesmanProblem.AStarDistanceFunction(HostedMapData.get(), 64)
        .comap(s => TileCoordinates.move(reference_digspot, OffsetSelection.activeOffset(s))),
      start_offset ? {offset: start_offset} : null
    )
      .wait(problem => problem
        .greedy()
        .optimize_by_pairwise_exchange()
        .getResult()
      )


    this.queue.push(...lodash.sortBy(backlog, s => CalibrationTool.shouldAngle(s.offset)))
  }

  async fill(f: QueueFillerfunction) {
    this.clear()

    this.queue = f.function()

    if (this.queue.length > 0) {
      await this.sortQueue(this.parent.reference.value(), OffsetSelection.activeOffset(this.parent.selection.value().offset))

      this.filler = f

      this.dequeue()

      this.changed.trigger(this)
    }
  }
}

class CalibrationQueueView extends Widget {
  props: Properties

  constructor(private queue: CalibrationQueue) {
    super();

    this.init(this.props = new Properties())

    queue.changed.on(() => this.render())

    this.render()
  }

  private render() {
    this.props.empty()

    this.props.header("Offset Queue")

    this.props.named("Size", hgrid(this.queue.size().toString(), new LightButton("Clear").slim().onClick(() => this.queue.clear())))
    this.props.named("Type", this.queue.filler ? this.queue.filler.name : "")
  }
}

function findAutoSpotForAngleRange(range: AngleRange): OffsetSelection {

  const angle = Angles.AngleRange.mean(range)

  const range_size = Angles.AngleRange.size(range)

  const offset = approximateFractionAsRationaleNumber(1000,
    {y: -Math.sin(angle), x: -Math.cos(angle)},
    offset => angleDifference(CalibrationTool.shouldAngle(offset), angle) < (range_size / 20)
  )

  return {
    offset: offset,
    auto: {
      desired_angle: angle,
      desired_range: range,
      actual_angle: CalibrationTool.shouldAngle(offset),
    }
  }
}

export class CompassCalibrationTool extends NisModal {
  private reference_memory = new storage.Variable<TileCoordinates>("preferences/calibrationtool/reference", () => gielinor_compass.spots[0])

  selection = observe<SelectionStatus>(null)
  reference = observe<TileCoordinates>(this.reference_memory.get())

  public sample_set = new SampleSetBuilder(this)
  public spot_queue = new CalibrationQueue(this)

  private reader: CompassReader.Service
  public layer: CalibrationTool.Layer

  handler: Alt1MainHotkeyEvent.Handler

  current_calibrated_angle_view: Widget
  function_status_view: Widget
  hovered_tile_reverse_sample_view: Widget
  selection_status_view: Widget
  calibration_queue_view: CalibrationQueueView

  constructor() {
    super({
      size: "fullscreen",
      fixed: true,
      disable_close_button: false
    });

    this.setOffset({offset: {x: -1, y: 0}})

    this.handler = Alt1.instance().main_hotkey.subscribe(0, (e) => {
      this.commit()
    })

    this.hidden.on(() => {
      this.reader.stop()
      this.handler.remove()
    })

    this.reader = new CompassReader.Service(null, true, null, true).start()

    this.sample_set.set_changed.on(() => {
      this.updateCurrentPlausibility()
      this.updateFunctionStatusView()
      this.setOffset(this.selection.value().offset)
    })

    this.sample_set.set_loaded.on(() => {
      if (this.spot_queue.filler) {
        this.spot_queue.fill(this.spot_queue.filler)
      } else {
        this.spot_queue.clear()
      }
    })

    this.reader.onChange(() => {
      this.updateCurrentPlausibility()
    })

    this.reference.subscribe(ref => {
      this.reference_memory.set(ref)
    })

    this.selection.subscribe(v => {
      this.updateSelectionView()
      this.updateCurrentPlausibility()
    })
  }

  private updateCurrentPlausibility() {
    const props = new Properties()

    props.header("Current Read Plausibility")

    const reader_state = this.reader.state()

    if (reader_state?.state != "normal") {
      props.row("No angle detected")
    } else {
      const result = this.sample_set.function.sample(reader_state.result.raw_angle)

      props.named("Raw Read", Angles.toString(reader_state.result.raw_angle, 3))
      props.named("Fingerprint", CompassReader.ReadFingerprint.toString(reader_state.result.fingerprint))
      props.named("Calibrated", Angles.AngleRange.toString(result.result.range, 3) + " (" + Angles.UncertainAngle.toString(result.result, 3) + ")")
      props.named("Sample", result.details.type)

      switch (result.details.type) {
        case "outside":
          props.named("Before", FullCompassCalibrationFunction.CompressedSample.toString(result.details.before))
          props.named("Hit", "-")
          props.named("After", FullCompassCalibrationFunction.CompressedSample.toString(result.details.after))
          break;
        case "within":
          props.named("Before", FullCompassCalibrationFunction.CompressedSample.toString(result.details.before))
          props.named("Hit", FullCompassCalibrationFunction.CompressedSample.toString(result.details.in_sample))
          props.named("After", FullCompassCalibrationFunction.CompressedSample.toString(result.details.after))
          break;
      }

      const current_sample = this.sample_set.function.sample(reader_state.result.raw_angle)

      const isPlausible = Angles.UncertainAngle.contains(current_sample.result, CalibrationTool.shouldAngle(this.selection.value().offset.offset))

      props.named("Plausible", hgrid(isPlausible ? "Yes" : "No", new LightButton(isPlausible ? "Commit (Alt+1)" : "Force Commit")
        .slim()
        .onClick(async () => {
          if (!isPlausible) {
            const really = await ConfirmationModal.simple("Commit Implausible Sample?", "Are you sure you want to record this implausible sample?", "Cancel", "Confirm").do()

            if (!really) return
          }
          this.commit(true)
        })
      ))
    }

    this.current_calibrated_angle_view.empty().append(props)
  }

  private updateFunctionStatusView() {
    const props = new Properties()

    props.header("Function Status")

    const uncalibrated = this.sample_set.function.uncalibrated_ranges()

    Angles.AngleRange.size(uncalibrated[0])

    const minEpsilons = this.sample_set.function.minEpsilons()

    const bad_samples = this.sample_set.function.bad_samples()

    props.named("Last Change", this.sample_set.date().toLocaleString())
    props.named("Samples", this.sample_set.size().toString())
    props.named("Unique Angles", hgrid(this.sample_set.function.samples.length.toString(), new LightButton("Analyze").slim().onClick(() => {

      this.layer.guard.set(
        new SelectTileInteraction()
          .add(new InteractionTopControl()
            .setText("Select a tile to analyze.")
          )
          .onCommit(tile => {
            const grouped = lodash.groupBy(gielinor_compass.spots, spot =>
              this.sample_set.function.reverse_sample(Compasses.getExpectedAngle(tile, spot)).median
            )

            const discriminated_spots = Object.entries(grouped).filter(([angle, spots]) => {
              return spots.length == 1
            })

            console.log(Object.fromEntries(Object.entries(grouped).filter(([key, value]) => value.length > 1).map(([key, value]) => [key, Angles.UncertainAngle.fromRange(Angles.AngleRange.fromAngles(...value.map(spot => Compasses.getExpectedAngle(tile, spot))))])))
            console.log(`Discriminates ${discriminated_spots.length}/${gielinor_compass.spots.length} spots `)
          })
      )
    })))
    props.named("Average Epsilon", Angles.toString(this.sample_set.function.averageEpsilon(), 3))
    props.named("Min Epsilon (Min)", `${Angles.toString(Math.min(...minEpsilons), 3)} - ${Angles.toString(Math.max(...minEpsilons), 3)} (${Angles.toString(avg(...minEpsilons), 3)} avg.)`)
    props.named("Implausibilities", hgrid(bad_samples.length.toString(), new LightButton("Queue All")
      .slim()
      .setEnabled(bad_samples.length > 0)
      .onClick(() => {
        this.spot_queue.fill({
          name: "Implausibilities",
          function: () => bad_samples.flatMap(s => s.raw_samples).map(s => ({
            offset: s.position
          }))
        })
      })))

    props.named("Largest Gap", hgrid(Angles.toString(Angles.AngleRange.size(uncalibrated[0]), 3),
      new LightButton("Queue").slim().onClick(() => this.fillQueueWithBiggestUncalibratedRange())
    ))

    this.sample_set.function.uncalibrated_ranges()

    this.function_status_view.empty().append(props)
  }

  delete() {
    this.sample_set.delete(this.selection.value().offset.offset)

    this.selection.update(s => s.existing_sample = null)
  }

  commit(skip_plausibility_check: boolean = false) {
    const state = this.reader.state()

    if (!state || state.state != "normal") {
      notification("No angle  detected", "error").show()
      return
    }

    if (!skip_plausibility_check) {
      const current_sample = this.sample_set.function.sample(state.result.raw_angle)

      const is_plausible = Angles.UncertainAngle.contains(current_sample.result, CalibrationTool.shouldAngle(this.selection.value().offset.offset))

      if (!is_plausible) {
        notification("Implausible angle. Click `Force Commit` to commit it anyway.", "error").show()
        return
      }
    }

    if (state.state == "normal") {
      this.sample_set.record(this.selection.value().offset.offset, state)
    }
  }

  setOffset(offset: OffsetSelection, zoom: boolean = true) {
    if (!offset.auto) {
      const in_queue = this.spot_queue.queue.find(e => Vector2.eq(e.offset, offset.offset))

      if (in_queue) {
        in_queue.highlighted_offset = offset.highlighted_offset
        offset = in_queue
      }
    }

    this.selection.set({
      existing_sample: this.sample_set.find(offset.offset),
      offset: offset,
    })

    if (this.layer) {
      if (zoom) this.layer.getMap().fitView(TileRectangle.from(TileCoordinates.move(this.reference.value(), OffsetSelection.activeOffset(offset))), {
        maxZoom: this.layer.getMap().getZoom(),
        animate: true
      })
    }
  }

  fillQueueWithBiggestUncalibratedRange() {
    this.spot_queue.fill(
      {
        name: "Largest Gap",
        repeatable: true,
        function: () => {
          const candidates = this.sample_set.function.uncalibrated_ranges()

          const largest_range = Angles.AngleRange.size(candidates[0])

          const index_of_first_range_not_considered = candidates.findIndex((candidate, index) =>
            !(Angles.AngleRange.size(candidate) >= 0.8 * largest_range)
          )

          const taken_ranges = (index_of_first_range_not_considered >= 0
            ? candidates.slice(0, index_of_first_range_not_considered)
            : candidates).flatMap(range => {
            const size = Angles.AngleRange.size(range)

            const sections = Math.max(1, Math.round(size / (Math.PI / 4)))

            return Angles.AngleRange.split(range, sections)
          })

          return taken_ranges.map(range => findAutoSpotForAngleRange(range))
        }
      }
    )
    return;
  }

  render() {
    super.render();

    this.title.set("Compass Calibration")

    this.body.css("display", "flex")

    const menu_column = vbox().css("min-width", "300px").appendTo(this.body)

    c().css("min-width", "20px").css("max-width", "20px").appendTo(this.body)

    const map = new GameMapMiniWidget()
      .css2({
        "width": "100%",
      })
      .appendTo(this.body)

    setTimeout(() => map.map.invalidateSize(), 1000)

    new ButtonRow().buttons(
      new LightButton("Export JSON").onClick(() => {
        new ExportStringModal(
          CalibrationTool.cleanExport(this.sample_set.get())
        ).show()
      }),
      new LightButton("Export CSV").onClick(() => {
        new ExportStringModal(AngularKeyframeFunction.fromCalibrationSamples(this.sample_set.get(), "cosine", 0).getCSV()).show()
      }),
    ).appendTo(menu_column)

    new ButtonRow().buttons(
      new LightButton("Import JSON").onClick(async () => {
        const imp = (await new ImportStringModal(input => {
          return JSON.parse(input)
        }).do()).imported

        if (imp) {
          this.sample_set.set(imp).then(did_set => {
            if (did_set) this.fillQueueWithBiggestUncalibratedRange()
          })
        }
      }),
      new LightButton("Load NO AA").onClick(() => {
        this.sample_set.set(lodash.cloneDeep(CompassReader.no_aa_samples))
      }),
      new LightButton("Load MSAA").onClick(() => {
        this.sample_set.set(lodash.cloneDeep(CompassReader.msaa_samples))
      }),
      new LightButton("Reset").onClick(() => {
        this.sample_set.set([])
      }),
    ).appendTo(menu_column)

    this.selection_status_view = c().appendTo(menu_column)
    this.function_status_view = hbox().appendTo(menu_column)
    this.current_calibrated_angle_view = hbox().appendTo(menu_column)
    this.calibration_queue_view = new CalibrationQueueView(this.spot_queue).appendTo(menu_column)
    this.hovered_tile_reverse_sample_view = hbox().appendTo(menu_column)

    this.updateFunctionStatusView()
    this.updateSelectionView()
    this.updateCurrentPlausibility()
    this.updateHoveredTileView(null)

    map.map.addGameLayer(this.layer = new CalibrationTool.Layer(this))

    this.layer.centerOnReference()
  }

  updateSelectionView() {
    if (!this.selection_status_view) return

    new SelectionStatusWidget(this.selection.value(), this).appendTo(this.selection_status_view.empty())
  }

  updateHoveredTileView(tile: TileCoordinates) {
    const offset = tile ? Fraction.reduce(Vector2.sub(tile, this.reference.value())) : null

    const existing_sample = offset ? this.sample_set.find(offset) : null

    const layout = new Properties()

    layout.header("Hovered Tile")

    layout.named("Offset", offset ? `${Vector2.toString(offset)}, (${Angles.toString(CalibrationTool.shouldAngle(offset), 3)})` : "-")

    layout.header("Existing Sample", "left", 1)

    if (existing_sample) {
      layout
        .named("Sampled", Angles.toString(existing_sample.is_angle))
        .named("Fingerprint", CompassReader.ReadFingerprint.toString(existing_sample.fingerprint))
    } else {
      layout.row(italic("None"))
    }

    this.hovered_tile_reverse_sample_view?.empty().append(layout)
  }
}

export namespace CalibrationTool {
  export function cleanExport(samples: RawSample[]): string {
    return "[\n" +
      lodash.sortBy(samples, s => Vector2.angle(ANGLE_REFERENCE_VECTOR, {x: -s.position.x, y: -s.position.y})).map(s => cleanedJSON(s, undefined)).join(",\n")
      + "\n]"
  }

  export function shouldAngle(offset: Vector2): number {
    return getExpectedAngle(offset, {x: 0, y: 0})
  }

  export type RawSample = {
    position: Vector2, is_angle: number, fingerprint?: CompassReader.ReadFingerprint
  }

  import gielinor_compass = clue_data.gielinor_compass;

  export class KnownMarker extends MapEntity {
    constructor(public spot: TileCoordinates) {
      super()

      this.setInteractive()
    }

    private active: boolean = false

    setActive(v: boolean): this {
      if (v != this.active) {
        this.active = v
        this.requestRendering()
      }

      return this
    }

    bounds(): Rectangle {
      return Rectangle.from(this.spot)
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const opacity = this.active ? 1 : 0.5

      const scale = (this.active ? 1 : 0.5) * (props.highlight ? 1.5 : 1)

      const marker = leaflet.marker(Vector2.toLatLong(this.spot), {
        icon: levelIcon(this.spot.level, scale),
        opacity: opacity,
        interactive: true,
        bubblingMouseEvents: true,
      }).addTo(this)

      return marker.getElement()
    }
  }

  export class Layer extends GameLayer {
    guard: InteractionGuard

    markers: KnownMarker[]

    constructor(public tool: CompassCalibrationTool) {
      super()

      this.guard = new InteractionGuard().setDefaultLayer(this)
      this.add(new HoverTileDisplay(tool))
      this.add(new TransportLayer(true, {teleport_policy: "target_only", transport_policy: "none"}))

      this.markers = gielinor_compass.spots.map(spot =>
        new KnownMarker(spot).addTo(this)
      )

      this.tool.sample_set.set_changed.on(() => {
        this.updateSampleSetOverlay()
      })

      this.tool.spot_queue.changed.on(() => {
        this.updateQueueView()
      })

      this.tool.reference.subscribe(reference => {
        this.centerOnReference()

        this.markers.forEach(marker => {
          marker.setActive(TileCoordinates.equals(marker.spot, reference))
        })

        this.updateSelectionOverlay()
        this.updateSampleSetOverlay()
        this.updateQueueView()
      }, true)

      this.tool.selection.subscribe(() => {
        this.updateSelectionOverlay()
        this.updateQueueView()
      })

    }

    centerOnReference() {
      const map = this.getMap()

      if (map) {
        map.fitView(TileRectangle.from(this.tool.reference.value()), {
          maxZoom: 4
        })
      }
    }

    eventClick(event: GameMapMouseEvent) {
      event.onPost(() => {
        if (event.active_entity instanceof KnownMarker) {
          this.tool.reference.set(event.active_entity.spot)
        } else {
          const off = Vector2.sub(event.tile(), this.tool.reference.value())

          if (off.x == 0 && off.y == 0) return

          const gcd = greatestCommonDivisor(Math.abs(off.x), Math.abs(off.y))

          this.tool.setOffset({offset: Vector2.scale(1 / gcd, off), highlighted_offset: off}, false)
        }
      })
    }

    private sample_set_overlay: leaflet.FeatureGroup = null

    private updateSampleSetOverlay() {
      if (this.sample_set_overlay) {
        this.sample_set_overlay.remove()
        this.sample_set_overlay = null
      }

      this.sample_set_overlay = leaflet.featureGroup().addTo(this)

      this.tool.sample_set.get().forEach((sample, i) => {
        const polygon = tilePolygon(Vector2.add(this.tool.reference.value(), sample.position)).setStyle({
          color: "#06ffea",
          fillOpacity: 0.2,
          stroke: false
        }).addTo(this.sample_set_overlay)
      })
    }

    private selection_overlay: leaflet.FeatureGroup = null

    updateSelectionOverlay() {
      if (this.selection_overlay) {
        this.selection_overlay.remove()
        this.selection_overlay = null
      }

      const selection = this.tool.selection.value()

      if (!selection || !this.tool.reference.value()) return

      this.selection_overlay = leaflet.featureGroup().addTo(this)

      for (let i = 1; i <= 100; i++) {
        const polygon = tilePolygon(Vector2.add(this.tool.reference.value(), Vector2.scale(i, selection.offset.offset))).addTo(this.selection_overlay)

        if (selection.existing_sample) {
          polygon.setStyle({
            color: "orange"
          })
        }
      }
    }

    private queue_view: leaflet.FeatureGroup = null

    updateQueueView() {
      if (this.queue_view) {
        this.queue_view.remove()
        this.queue_view = null
      }

      if (this.tool.spot_queue.size() == 0) return

      this.queue_view = leaflet.featureGroup().addTo(this)

      const selection = this.tool.selection.value()

      const queue = this.tool.spot_queue.parent.spot_queue.queue

      queue.forEach(sel => {
          if (!Vector2.eq(selection.offset.offset, sel.offset)) {
            tilePolygon(TileCoordinates.move(this.tool.reference.value(), OffsetSelection.activeOffset(sel)))
              .setStyle({color: "#ffff00"})
              .addTo(this.queue_view)
          }
        }
      )

      leaflet.polyline(
          queue.map(s => Vector2.toLatLong(Vector2.add(this.tool.reference.value(), OffsetSelection.activeOffset(s))))
        )
        .setStyle({color: "#ffff00", weight: 3})
        .addTo(this.queue_view)
    }
  }

  export class HoverTileDisplay extends GameMapControl {

    constructor(private tool: CompassCalibrationTool) {
      super({
        type: "gapless",
        position: "top-left"
      }, c().css("padding", "2px"));
    }

    eventHover(event: GameMapMouseEvent) {
      function getcamerapos(coord: TileCoordinates): string {
        return `${coord.level},${~~(coord.x / 64)},${~~(coord.y / 64)},${coord.x % 64},${coord.y % 64}`
      }


      event.onPre(() => {
        this.content.text(`${getcamerapos(event.tile())}: ${Vector2.toString(Vector2.sub(event.tile(), this.tool.reference.value()))}`)
        this.tool.updateHoveredTileView(event.tile())
      })

    }
  }
}