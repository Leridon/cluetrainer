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
import {TileCoordinates} from "../lib/runescape/coordinates";
import * as leaflet from "leaflet";
import {GameLayer} from "../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../lib/gamemap/MapEvents";
import {tilePolygon} from "../trainer/ui/polygon_helpers";
import {CompassReader} from "../trainer/ui/neosolving/cluereader/CompassReader";
import {Compasses} from "../lib/cluetheory/Compasses";
import {util} from "../lib/util/util";
import {clue_data} from "../data/clues";
import AbstractEditWidget from "../trainer/ui/widgets/AbstractEditWidget";
import Properties from "../trainer/ui/widgets/Properties";
import NumberSlider from "../lib/ui/controls/NumberSlider";
import NumberInput from "../lib/ui/controls/NumberInput";
import {C} from "../lib/ui/constructors";
import {Notification} from "../trainer/ui/NotificationBar";
import {AngularKeyframeFunction, FullCompassCalibrationFunction} from "trainer/ui/neosolving/cluereader/capture/CompassCalibrationFunction";
import {Angles} from "../lib/math/Angles";
import getExpectedAngle = Compasses.getExpectedAngle;
import greatestCommonDivisor = util.greatestCommonDivisor;
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import cleanedJSON = util.cleanedJSON;
import italic = C.italic;
import hgrid = C.hgrid;
import notification = Notification.notification;
import RawSample = CalibrationTool.RawSample;
import hbox = C.hbox;

type Fraction = Vector2

namespace Fraction {
  export function value(rationale: Vector2): number {
    return rationale.y / rationale.x
  }
}

type AutoSelection = {
  angles_this_iteration: number,
  desired_angle: number,
  actual_angle: number,
}

type SelectionStatus = {
  auto: AutoSelection,
  offset: Vector2,
  existing_sample: CalibrationTool.RawSample
}

class SelectionStatusWidget extends Widget {
  public current_calibrated_result: Widget

  constructor(status: SelectionStatus, private tool: CompassCalibrationTool) {
    super();

    const layout = new Properties().appendTo(this)

    layout.header("Status")

    if (status.auto) {
      const delta = Angles.angleDifference(status.auto.desired_angle, status.auto.actual_angle)

      const x = (2 * Math.PI) / status.auto.angles_this_iteration

      const is_far_away = delta > (x / 10)

      const text = `${Angles.radiansToDegrees(delta).toFixed(3)}° (${((delta / x) * 100).toFixed(1)}% off)`

      layout.named("Auto", `Want: ${Angles.radiansToDegrees(status.auto.desired_angle).toFixed(2)}°, Got: ${Angles.radiansToDegrees(status.auto.actual_angle).toFixed(2)}°`)

      layout.named("Auto Delta", is_far_away ? C.span(text).css("color", "red") : text)
    } else {

      layout.named("Auto", "")

      layout.named("Auto Delta", "")
    }

    layout
      .named("Selected", Vector2.toString(status.offset))
      .named("Expected", Angles.radiansToDegrees(Angles.normalizeAngle(Math.atan2(-status.offset.y, -status.offset.x))).toFixed(3) + "°")
      .named("Sampled", status.existing_sample ? status.existing_sample.is_angle_degrees.toFixed(3) : italic("None"))
      .named("Current", this.current_calibrated_result = c())

    layout.row(
      new ButtonRow().buttons(
        new LightButton("Commit")
          .onClick(() => this.tool.commit()),
        new LightButton("Delete")
          .setEnabled(!!status.existing_sample)
          .onClick(() => this.tool.delete())
      )
    )
  }
}

type AutoSpotSettings = {
  start_iteration: number,
  max_distance: number
}

class AutoSpotSettingsEdit extends AbstractEditWidget<AutoSpotSettings> {
  constructor(private tool: CompassCalibrationTool) {
    super();
  }

  protected render() {
    this.empty()

    new Properties().appendTo(this)
      .header("Auto Selection")
      .named("Samples", new NumberSlider(3, 14, 1)
        .setValue(this.get().start_iteration)
        .withPreviewFunction(i => Math.pow(2, i).toString())
        .onCommit(v => this.commit({...this.get(), start_iteration: v}))
      )
      .named("Max Distance", new NumberInput(10, 3000)
        .setValue(this.get().max_distance)
        .onCommit(v => this.commit({...this.get(), max_distance: v}))
      )
      .row(
        new LightButton("Auto")
          .onClick(() => this.tool.autoNextSpot()),)
  }
}

class SampleSetBuilder {
  private samples: CalibrationTool.RawSample[] = []

  public function: FullCompassCalibrationFunction

  set_changed = ewent<CalibrationTool.RawSample[]>()

  constructor() {

  }

  private update() {
    this.function = new FullCompassCalibrationFunction(FullCompassCalibrationFunction.compress(this.samples))

    this.set_changed.trigger(this.samples)
  }

  set(sample: CalibrationTool.RawSample[]): this {
    this.samples = sample

    this.update()

    return this
  }

  delete(position: Vector2): void {
    const entry_index = this.samples.findIndex(s => Vector2.eq(s.position, position))

    if (entry_index >= 0) {
      this.samples.splice(entry_index, 1)

      this.update()
    }
  }

  add(offset: Vector2, is_angle_radians: number) {
    const entry = this.samples.find(s => Vector2.eq(s.position, offset))

    if (entry) {
      entry.is_angle_degrees = Angles.radiansToDegrees(is_angle_radians)
    } else {
      this.samples.push({position: offset, is_angle_degrees: Angles.radiansToDegrees(is_angle_radians)})
    }

    this.update()
  }

  find(offset: Vector2): RawSample {
    return this.samples.find(s => Vector2.eq(s.position, offset))
  }

  size(): number {
    return this.samples.length
  }

  get(): RawSample[] {
    return this.samples
  }
}

export class CompassCalibrationTool extends NisModal {
  public sample_set = new SampleSetBuilder()
    .set(CompassReader.no_aa_samples)

  private reader: CompassReader.Service
  private layer: CalibrationTool.Layer

  handler: Alt1MainHotkeyEvent.Handler

  selection = observe<SelectionStatus>(null)

  current_calibrated_angle_view: Widget

  constructor() {
    super({
      size: "fullscreen",
      fixed: true,
      disable_close_button: false
    });

    this.setOffset({x: -1, y: 0}, null)

    this.handler = Alt1.instance().main_hotkey.subscribe(0, (e) => {
      this.commit()
    })

    this.hidden.on(() => {
      this.reader.stop()
      this.handler.remove()
    })

    this.reader = new CompassReader.Service(null, true, null, true).start()

    this.sample_set.set_changed.on(() => {
      this.updateCurrentCalibratedAngle()
    })

    this.reader.onChange(() => {
      this.updateCurrentCalibratedAngle()
    })

    this.sample_set.set_changed.on(() => {
      this.layer.updateTileOverlays()
    }).bindTo(this.lifetime_manager)
  }

  private updateCurrentCalibratedAngle() {
    const result = this.sample_set.function.sample(this.reader.state().raw_angle)

    const props = new Properties()

    props.named("Result", Angles.UncertainAngle.toString(result.result, 2))

    switch(result.details.type) {
      case "outside":
        props.named("Before", FullCompassCalibrationFunction.CompressedSample.toString(result.details.before))
        props.named("After", FullCompassCalibrationFunction.CompressedSample.toString(result.details.after))
        break;
      case "within":
        props.named("Before", FullCompassCalibrationFunction.CompressedSample.toString(result.details.before))
        props.named("Hit", FullCompassCalibrationFunction.CompressedSample.toString(result.details.in_sample))
        props.named("After", FullCompassCalibrationFunction.CompressedSample.toString(result.details.after))
        break;
    }

    this.current_calibrated_angle_view.empty().append(props)
  }

  delete() {
    this.sample_set.delete(this.selection.value().offset)

    this.selection.update(s => s.existing_sample = null)

    this.layer.updateTileOverlays()
  }

  commit() {
    const state = this.reader.state()

    if (state.state == "normal") {
      this.sample_set.add(this.selection.value().offset, state.raw_angle)

      this.autoNextSpot()
    }
  }

  setOffset(offset: Vector2, auto_selection: AutoSelection) {
    this.selection.set({
      existing_sample: this.sample_set.find(offset),
      offset: offset,
      auto: auto_selection
    })

    this.layer?.updateTileOverlays()
  }

  autoNextSpot() {
    const maybeSetOffset = (offset: Vector2, auto: AutoSelection): boolean => {
      const gcd = greatestCommonDivisor(offset.x, offset.y)

      if (gcd > 1) return false

      const entry = this.sample_set.find(offset)

      if (entry) return false

      this.setOffset(offset, auto)

      return true
    }

    const settings = this.autospotsettings.get()

    for (let d = settings.start_iteration; d <= 15; d++) {
      const iterations = Math.pow(2, d)

      for (let i = 0; i < iterations; i++) {
        const angle = i * (Math.PI * 2) / iterations

        /**
         * Uses the farey sequence to find the rationale number (as a Vector2 where y is the numerator and x is the denominator) closest to the given number,
         * where the denominator is not bigger than the given limit.
         *
         * @param max_denominator The maximum denominator.
         * @param target_fraction The fraction to approximate
         * @param epsilon
         */
        function approximateFractionAsRationaleNumber(max_denominator: number, target_fraction: Fraction): Fraction {

          function approximateAsRationaleNumberImplementation(target_fraction: Fraction): Fraction {
            if (target_fraction.y > target_fraction.x) return Vector2.swap(approximateAsRationaleNumberImplementation(Vector2.swap(target_fraction)))

            const target_number = Fraction.value(target_fraction)

            let lower: Fraction = {y: 0, x: 1}
            let higher: Fraction = {y: 1, x: 1}

            while (true) {
              const mediant = Vector2.add(lower, higher) // interestingly, c is already in reduced form

              const mediant_value = Fraction.value(mediant)

              // Because lower and higher are always (reduced) neighbours in a farey sequence, their mediant will also be reduced.

              // if the denominator is too big, return the closest of lower or higher
              if (mediant.x > max_denominator) {
                if (target_number - Fraction.value(lower) < Fraction.value(higher) - target_number) return lower
                else return higher
              }

              // adjust the interval:
              if (mediant_value < target_number) lower = mediant
              else higher = mediant
            }
          }

          if (target_fraction.x == 0 || target_fraction.y == 0) return {x: Math.sign(target_fraction.x), y: Math.sign(target_fraction.y)}

          const signs = {x: Math.sign(target_fraction.x), y: Math.sign(target_fraction.y)}

          return Vector2.mul(signs, approximateAsRationaleNumberImplementation(Vector2.mul(signs, target_fraction)))
        }

        const v = approximateFractionAsRationaleNumber(settings.max_distance, {y: -Math.sin(angle), x: -Math.cos(angle)})

        if (maybeSetOffset(v, {desired_angle: angle, actual_angle: getExpectedAngle(v, {x: 0, y: 0}), angles_this_iteration: iterations})) return

      }

      if (iterations > this.sample_set.size()) {
        notification("No valid next sample found. Increase max distance").show()
        break
      }
    }
  }

  private autospotsettings: AutoSpotSettingsEdit

  render() {
    super.render();

    this.title.set("Compass Calibration")

    this.body.css("display", "flex")
      .css("flex-direction", "column")

    const map = new GameMapMiniWidget()
      .css2({
        "width": "100%",
        "height": "500px"
      })
      .appendTo(this.body)

    setTimeout(() => map.map.invalidateSize(), 1000)


    new ButtonRow().buttons(
      new LightButton("Import").onClick(async () => {
        this.sample_set.set((await new ImportStringModal(input => {

          const parsed = JSON.parse(input)


          return JSON.parse(input)
        }).do()).imported)
        this.autoNextSpot()
      }),
      new LightButton("Export JSON").onClick(() => {
        new ExportStringModal(
          "[\n" +
          lodash.sortBy(this.sample_set.get(), s => Vector2.angle(ANGLE_REFERENCE_VECTOR, {x: -s.position.x, y: -s.position.y})).map(s => cleanedJSON(s, undefined)).join(",\n")
          + "\n]"
        ).show()
      }),
      new LightButton("Export CSV").onClick(() => {
        new ExportStringModal(AngularKeyframeFunction.fromCalibrationSamples(this.sample_set.get(), "cosine", 0).getCSV()).show()
      }),
      new LightButton("Export 2").onClick(() => {
        const compressed = FullCompassCalibrationFunction.compress(this.sample_set.get())

        new ExportStringModal(
          "[\n" +
          compressed.map(s => `[${s[0].toFixed(3)}, [${s[1][0].toFixed(3)},${s[1][1].toFixed(3)}]]`).join(",\n")
          + "\n]"
        ).show()
      }),
    ).appendTo(this.body)

    this.current_calibrated_angle_view = hbox()
      .appendTo(this.body)

    const status_widget = c()

    hgrid(
      status_widget,
      c().css("min-width", "20px").css("max-width", "20px"),
      this.autospotsettings = new AutoSpotSettingsEdit(this)
        .setValue({
          start_iteration: 3,
          max_distance: 1000
        })
    ).appendTo(this.body)

    this.selection.subscribe(v => {
      status_widget.empty()

      new SelectionStatusWidget(v, this).appendTo(status_widget)
    })

    map.map.addGameLayer(this.layer = new CalibrationTool.Layer(this))

    this.autoNextSpot()
  }
}

export namespace CalibrationTool {
  export function shouldAngle(offset: Vector2): number {
    return getExpectedAngle(offset, {x: 0, y: 0})
  }

  export type RawSample = {
    position: Vector2, is_angle_degrees: number
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
    reference: TileCoordinates

    constructor(public tool: CompassCalibrationTool) {
      super()

      this.markers = gielinor_compass.spots.map(spot =>
        new KnownMarker(spot).addTo(this)
      )

      this.setReference(gielinor_compass.spots[0])
    }

    eventClick(event: GameMapMouseEvent) {
      event.onPost(() => {
        if (event.active_entity instanceof KnownMarker) {
          this.setReference(event.active_entity.spot)
        } else {
          const off = Vector2.sub(event.tile(), this.reference)

          if (off.x == 0 && off.y == 0) return

          const gcd = greatestCommonDivisor(Math.abs(off.x), Math.abs(off.y))

          this.tool.setOffset(Vector2.scale(1 / gcd, off), null)
        }
      })
    }

    setReference(reference: TileCoordinates) {
      this.reference = reference

      this.markers.forEach(marker => {
        marker.setActive(TileCoordinates.equals(marker.spot, reference))
      })

      this.updateTileOverlays()
    }

    private overlay: leaflet.FeatureGroup = null

    updateTileOverlays() {
      if (this.overlay) {
        this.overlay.remove()
        this.overlay = null
      }

      const selection = this.tool.selection.value()

      if (!selection || !this.reference) return

      this.overlay = leaflet.featureGroup().addTo(this)

      this.tool.sample_set.get().forEach((sample, i) => {
        const polygon = tilePolygon(Vector2.add(this.reference, sample.position)).setStyle({
          color: "#06ffea",
          fillOpacity: 0.4,
          stroke: false
        }).addTo(this.overlay)
      })

      /*leaflet.polygon(this.tool.samples.map(s => Vector2.toLatLong(Vector2.add(this.reference, s.position))))
        .setStyle({
          color: "blue"
        })
        .addTo(this.overlay)*/

      for (let i = 1; i <= 100; i++) {
        const polygon = tilePolygon(Vector2.add(this.reference, Vector2.scale(i, selection.offset))).addTo(this.overlay)

        if (selection.existing_sample) {
          polygon.setStyle({
            color: "orange"
          })
        }
      }

      this.overlay.addTo(this)
    }
  }
}