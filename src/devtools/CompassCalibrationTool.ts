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
import {HostedMapData} from "../lib/runescape/movement";
import {GameMapControl} from "../lib/gamemap/GameMapControl";
import TransportLayer from "../trainer/ui/map/TransportLayer";
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
    return self.highlighted_offset ?? self.offset
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

      const text = `Δ=${Angles.radiansToDegrees(delta).toFixed(3)}° (${((delta / range_size) * 100).toFixed(2)}% of ${Angles.toString(Angles.AngleRange.size(status.offset.auto.desired_range), 2)} range)`

      layout.named("Auto", is_far_away ? C.span(text).css("color", "red") : text)
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
        .named("Sampled", Angles.toString(status.existing_sample.is_angle))
        .named("Fingerprint", CompassReader.ReadFingerprint.toString(status.existing_sample.fingerprint))
    } else {
      layout.row(italic("None"))
    }

    layout.row(
      new ButtonRow().buttons(
        new LightButton("Commit (Alt+1)")
          .onClick(() => this.tool.commit()),
        new LightButton("Delete")
          .setEnabled(!!status.existing_sample)
          .onClick(() => this.tool.delete())
      )
    )
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
        this.state.samples.splice(entry_index, 1)
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
  function: () => OffsetSelection[]
}

class CalibrationQueue {
  public queue: OffsetSelection[] = []
  public filler: QueueFillerfunction

  changed = ewent<this>()

  constructor(public readonly parent: CompassCalibrationTool) {
    this.parent.sample_set.record_event.on(sample => {
      const removed = this.remove(sample.position)

      const activated = this.dequeue()

      if (removed && !activated) {
        this.fill(this.filler)
      }
    })

    this.parent.reference.subscribe(async ref => {
      await this.sortQueue(ref)

      this.changed.trigger(this)
    })
  }

  dequeue(): boolean {
    if (this.queue.length > 0) {
      this.parent.setOffset(this.queue[0])
      return true
    }

    return false
  }

  remove(offset: Vector2): boolean {
    const i = this.queue.findIndex(e => Vector2.eq(offset, e.offset))

    if (i >= 0) {
      this.queue.splice(i, 1)

      this.changed.trigger(this)

      return true
    }

    return false
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

    let salesmen_result: OffsetSelection[] = []

    if (sorted_by_should_angle.length > 0) {

      let position = start_offset ?? OffsetSelection.activeOffset(sorted_by_should_angle[0])

      while (sorted_by_should_angle.length > 0) {
        const greedy_best =
          lodash.minBy(sorted_by_should_angle.map((s, i) => ({s, i})),
            ({s, i}) => {
              return Vector2.max_axis(Vector2.sub(position, OffsetSelection.activeOffset(s))) + i * 3
            })

        sorted_by_should_angle.splice(greedy_best.i, 1)

        position = OffsetSelection.activeOffset(greedy_best.s)

        salesmen_result.push(greedy_best.s)
      }
    }

    this.queue = salesmen_result

    this.queue.push(...lodash.sortBy(backlog, s => CalibrationTool.shouldAngle(s.offset)))
  }

  async fill(f: QueueFillerfunction) {
    this.clear()

    this.queue = f.function()

    if (this.queue.length > 0) {
      await this.sortQueue(this.parent.reference.value())

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

    this.props.named("Size", this.queue.size().toString())
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

      props.named("Plausible", isPlausible ? "Yes" : "No")

      props.row(new LightButton("Force Commit Implausible Sample")
        .setEnabled(!isPlausible)
        .onClick(() => {
          this.commit(true)
        })
      )
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
    props.named("Unique Angles", this.sample_set.function.samples.length.toString())
    props.named("Average Epsilon", Angles.toString(this.sample_set.function.averageEpsilon(), 3))
    props.named("Min Epsilon (Min)", `${Angles.toString(Math.min(...minEpsilons), 3)} - ${Angles.toString(Math.max(...minEpsilons), 3)} (${Angles.toString(avg(...minEpsilons), 3)} avg.)`)
    props.named("Implausibilities", bad_samples.length.toString())

    if (bad_samples.length > 0) {
      props.row(new LightButton("Delete Implausible Samples")
        .setEnabled(bad_samples.length > 0)
        .onClick(() => {
          this.sample_set.delete(...bad_samples.flatMap(s => s.raw_samples).map(s => s.position))
        }))
    }


    props.named("Largest Gap", Angles.toString(Angles.AngleRange.size(uncalibrated[0]), 3))
    props.row(new LightButton("Queue Largest Gaps").onClick(() => this.fillQueueWithBiggestUncalibratedRange()))

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
        notification("Implausible sample", "error").show()
        return
      }
    }

    if (state.state == "normal") {
      this.sample_set.record(this.selection.value().offset.offset, state)
    }
  }

  setOffset(offset: OffsetSelection) {
    this.selection.set({
      existing_sample: this.sample_set.find(offset.offset),
      offset: offset,
    })

    if (this.layer) {
      if (offset.auto) this.layer.getMap().fitView(TileRectangle.from(TileCoordinates.move(this.reference.value(), OffsetSelection.activeOffset(offset))), {
        maxZoom: this.layer.getMap().getZoom(),
        animate: true
      })
    }
  }

  fillQueueWithBiggestUncalibratedRange() {
    this.spot_queue.fill(
      {
        name: "Largest Gap",
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
    markers: KnownMarker[]

    constructor(public tool: CompassCalibrationTool) {
      super()

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

          this.tool.setOffset({offset: Vector2.scale(1 / gcd, off)})
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
          queue.slice(0, Math.min(queue.length, 10)).map(s => Vector2.toLatLong(Vector2.add(this.tool.reference.value(), OffsetSelection.activeOffset(s))))
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
      event.onPre(() => {
        this.content.text(`${TileCoordinates.toString(event.tile())}: ${Vector2.toString(Vector2.sub(event.tile(), this.tool.reference.value()))}`)
        this.tool.updateHoveredTileView(event.tile())
      })

    }
  }
}