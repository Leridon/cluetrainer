import {Compasses} from "../../../../lib/cluetheory/Compasses";
import {mixColor} from "alt1";
import {angleDifference, circularMean, degreesToRadians, normalizeAngle, radiansToDegrees, Rectangle, Vector2} from "../../../../lib/math";
import * as lodash from "lodash";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import {CapturedCompass} from "./capture/CapturedCompass";
import {lazy, Lazy} from "../../../../lib/properties/Lazy";
import {NisModal} from "../../../../lib/ui/NisModal";
import {GameMapMiniWidget, levelIcon} from "../../../../lib/gamemap/GameMap";
import {GameLayer} from "../../../../lib/gamemap/GameLayer";
import {clue_data} from "../../../../data/clues";
import * as leaflet from "leaflet";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {TileCoordinates} from "../../../../lib/runescape/coordinates";
import {GameMapMouseEvent} from "../../../../lib/gamemap/MapEvents";
import {tilePolygon} from "../../polygon_helpers";
import {EwentHandler, observe} from "../../../../lib/reactive";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import {CapturedImage, CaptureInterval, ScreenCaptureService} from "../../../../lib/alt1/capture";
import {deps} from "../../../dependencies";
import {util} from "../../../../lib/util/util";
import LightButton from "../../widgets/LightButton";
import ButtonRow from "../../../../lib/ui/ButtonRow";
import ExportStringModal from "../../widgets/modals/ExportStringModal";
import ImportStringModal from "../../widgets/modals/ImportStringModal";
import {Alt1MainHotkeyEvent} from "../../../../lib/alt1/Alt1MainHotkeyEvent";
import Widget from "../../../../lib/ui/Widget";
import {Log} from "../../../../lib/util/Log";
import Behaviour from "../../../../lib/ui/Behaviour";
import {Finder} from "../../../../lib/alt1/capture/Finder";
import {Alt1} from "../../../../lib/alt1/Alt1";
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import log = Log.log;
import {Alt1Color} from "../../../../lib/alt1/Alt1Color";

class AngularKeyframeFunction {
  private constructor(private readonly keyframes: {
                        original?: Vector2,
                        angle: number,
                        value: number
                      }[],
                      private base_f: (_: number) => number = () => 0) {
    this.keyframes = lodash.sortBy(keyframes, e => e.angle)
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

namespace AngularKeyframeFunction {
  export type Sample = {
    position: Vector2, is_angle_degrees: number
  }
}

export class CompassReader {
  constructor(public readonly capture: CapturedCompass, private disable_calibration: boolean = false) {

  }

  private _angle: Lazy<CompassReader.AngleResult> = lazy((): CompassReader.AngleResult => {
    const CENTER_SIZE = 2
    const OFFSET = CENTER_SIZE - 1
    const CENTER_OFFSET = {x: CapturedCompass.TOTAL_COMPASS_RADIUS, y: CapturedCompass.TOTAL_COMPASS_RADIUS}

    const buf = this.capture.compass_area.getData()

    const buf_center = {
      x: buf.width / 2,
      y: buf.height / 2
    }

    function getRed(x: number, y: number) {
      const i = 4 * ((CENTER_OFFSET.y + y) * buf.width + x + CENTER_OFFSET.x)

      return buf.data[i]
    }

    function isArrow(x: number, y: number) {
      const [r, g, b, _] = buf.getPixel(x, y)

      return r < 5 && g < 5 && b < 5
    }

    if (CompassReader.DEBUG_COMPASS_READER) {
      CompassReader.debug_overlay.clear()

      this.capture.compass_area.debugOverlay(CompassReader.debug_overlay)
    }

    const TARGET_X_SAMPLE_OFFSETS: Vector2[] = [
      {x: -15, y: -15},
      {x: -14, y: -14},
      {x: -13, y: -13},
      {x: -12, y: -12},
      {x: 12, y: 12},
      {x: 11, y: 11},
      {x: 10, y: 10},
      {x: 9, y: 9},
      {x: 13, y: -16},
      {x: 12, y: -15},
      {x: 11, y: -14},
      {x: 10, y: -13},
      {x: -15, y: 10},
      {x: -14, y: 9},
      {x: -13, y: 8},
      {x: -12, y: 7},
    ]

    if (TARGET_X_SAMPLE_OFFSETS.every(coords => {
      const red = getRed(coords.x, coords.y)

      const res = red >= 70 && red <= 110

      //if (!res) console.log(`${red} at ${coords.x}|${coords.y}`)

      return res
    })) return {type: "likely_solved"}

    /*
    const circle_sampled_pixels: Vector2[] = (() => {
      const sampled: Vector2[] = []
      const r = CapturedCompass.INNER_COMPASS_RADIUS

      const self = this

      function sample(x: number, y: number): void {
        if (isArrow(x, y)) {
          sampled.push({x, y})
        }

        if (CompassReader.DEBUG_COMPASS_READER) {
          CompassReader.debug_overlay.rect(
            Rectangle.centeredOn(Vector2.add(self.capture.compass_area.screenRectangle().origin, CENTER_OFFSET, {x, y}), 0),
            {color: isArrow(x, y) ? Alt1Color.red : Alt1Color.green, width: 1})
        }

      }

      let x = CENTER_SIZE + CapturedCompass.INNER_COMPASS_RADIUS
      let y = 0;

      // Initialising the value of P
      let P = 1 - r;
      while (x > y) {
        if (P <= 0) {
          // Mid-point is inside or on the perimeter
          P = P + 2 * y + 1;
        } else { // Mid-point is outside the perimeter
          x--;
          P = P + 2 * y - 2 * x + 1;
        }

        // All the perimeter points have already been printed
        if (x < y) break;

        // Printing the generated point and its reflection
        // in the other octants after translation

        sample(x, y + OFFSET) // Octant 1
        sample(-x + OFFSET, y + OFFSET) // Octant 4
        sample(-x + OFFSET, -y) // Octant 5
        sample(x, -y) // Octant 8

        // If the generated point is on the line x = y then
        // the perimeter points have already been printed
        if (x != y) {
          sample(y + OFFSET, x)       // Octant 2
          sample(-y, x)                   // Octant 3
          sample(-y, -x + OFFSET)        // Octant 6
          sample(y + OFFSET, -x + OFFSET) // Octant 7
        }

        y++;
      }

      return sampled
    })()

    if (CompassReader.DEBUG_COMPASS_READER) {
      for (let p of circle_sampled_pixels) {
        CompassReader.debug_overlay.line(
          Vector2.add(this.capture.compass_area.screenRectangle().origin, CENTER_OFFSET),
          Vector2.add(this.capture.compass_area.screenRectangle().origin, CENTER_OFFSET, p),
          {width: 1, color: Alt1Color.red}
        )
      }

      CompassReader.debug_overlay.render()
    }

    let circle_failure_reason: AngleResult = null

    if (circle_sampled_pixels.length == 0) return {type: "likely_closed", details: "No pixels while sampling the circle"}
    if (circle_sampled_pixels.length > 10) {
      circle_failure_reason = {type: "likely_concealed", details: `Too many pixels while sampling the circle (${circle_sampled_pixels.length} > 10)`}
    }

    // Map all sample points to their respective angle
    // The angle is taken from the true center of the compass arrow, which is why we offset the samples by 0.5
    // Also, the y axis is flipped to convert from screen coordinates to the internally used coordinate system
    const angles = circle_sampled_pixels.map(p => Vector2.angle(
      ANGLE_REFERENCE_VECTOR, Vector2.normalize({x: p.x - 0.5, y: -p.y}))
    )

    const angle_after_circle_sampling = !circle_failure_reason ? normalizeAngle(circularMean(angles)) : 0

    if (angles.some(a => angleDifference(a, angle_after_circle_sampling) > CompassReader.CIRCLE_SAMPLE_CONCEALED_THRESHOLD)) {
      circle_failure_reason = {type: "likely_concealed", details: "Too much variance in the sampled pixels on the circumference"}
    }
*/

    const rectangle_samples: Vector2[] = []

    let antialiasing_detected = false

    const ANTIALIASING_SEARCH_RADIUS = 40

    for (let y = 0; y < buf.height; y++) {
      for (let x = 0; x < buf.width; x++) {
        if (isArrow(x, y)) {
          rectangle_samples.push({x, y})
        } else if (!antialiasing_detected && Vector2.max_axis(Vector2.sub({x, y}, buf_center)) <= ANTIALIASING_SEARCH_RADIUS) {
          const red = buf.getPixel(x, y)[0]

          if (red < 40) antialiasing_detected = true
        }
      }
    }

    if (antialiasing_detected) {
      if (rectangle_samples.length < 400) return {type: "likely_closed", details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample. [MSAA]`}
      if (rectangle_samples.length < 1700) return {type: "likely_concealed", details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample. [MSAA]`}
      if (rectangle_samples.length > 2250) return {type: "likely_concealed", details: `Too many pixels (${rectangle_samples.length}) sampled for the rectangle sample. [MSAA]`}
    } else {
      if (rectangle_samples.length < 400) return {type: "likely_closed", details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample.`}
      if (rectangle_samples.length < 1900) return {type: "likely_concealed", details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample.`}
      if (rectangle_samples.length > 2300) return {type: "likely_concealed", details: `Too many pixels (${rectangle_samples.length}) sampled for the rectangle sample.`}
    }

    const center_of_mass: Vector2 = {
      x: lodash.sumBy(rectangle_samples, v => v.x) / rectangle_samples.length,
      y: lodash.sumBy(rectangle_samples, v => v.y) / rectangle_samples.length
    }

    const center_of_area: Vector2 = Rectangle.center(Rectangle.from(...rectangle_samples), false)

    const angleof = (v: Vector2): number => {
      return Vector2.angle(ANGLE_REFERENCE_VECTOR, Vector2.normalize({x: v.x, y: -v.y}))
    }

    const initial_angle = angleof(Vector2.sub(center_of_mass, center_of_area))

    const angle_samples: {
      angle: number,
      weight: number
    }[] = rectangle_samples.flatMap(v => {

      const vector = Vector2.sub(v, center_of_area)

      let angle = angleof(vector)

      if (Number.isNaN(angle)) return []

      if (angleDifference(angle, initial_angle) > Math.PI / 2)
        angle = normalizeAngle(angle - Math.PI)

      return {
        angle: angle,
        weight: Vector2.lengthSquared(vector)
      }
    })

    const angle_after_rectangle_sample = normalizeAngle(Math.atan2(
      lodash.sum(angle_samples.map(a => a.weight * Math.sin(a.angle))),
      lodash.sum(angle_samples.map(a => a.weight * Math.cos(a.angle))),
    ))

    const calibration_mode = (this.disable_calibration || CompassReader.DISABLE_CALIBRATION) ? null
      : (antialiasing_detected ? "msaa" : "off")

    const final_angle = calibration_mode
      ? normalizeAngle(angle_after_rectangle_sample + CompassReader.calibration_tables[calibration_mode].sample(angle_after_rectangle_sample))
      : angle_after_rectangle_sample

    if (CompassReader.DEBUG_COMPASS_READER) {
      log().log(`Angle: ${radiansToDegrees(initial_angle).toFixed(3)}° (CoM), ${radiansToDegrees(angle_after_rectangle_sample).toFixed(3)}° (rect), ${radiansToDegrees(final_angle).toFixed(3)}° (final)`,
        "Compass Reader"
      )

      CompassReader.debug_overlay.render()
    }

    return {
      type: "success",
      angle: final_angle,
      antialiasing: antialiasing_detected
    }
  })

  getAngle(): CompassReader.AngleResult {
    return this._angle.get()
  }
}

export namespace CompassReader {
  import greatestCommonDivisor = util.greatestCommonDivisor;
  import cleanedJSON = util.cleanedJSON;
  import log = Log.log;
  import getExpectedAngle = Compasses.getExpectedAngle;
  import async_init = util.async_init;
  import AsyncInitialization = util.AsyncInitialization;
  export const DEBUG_COMPASS_READER = false
  export const DISABLE_CALIBRATION = false

  export const RESOLUTION_INACCURACY_DEGREES = 0.2 // Calculated on a napkin, so might not be completely accurate
  export const CALIBRATION_INACCURACY_DEGREES = 0.1
  export const EPSILON = degreesToRadians(RESOLUTION_INACCURACY_DEGREES + CALIBRATION_INACCURACY_DEGREES)
  export const CIRCLE_SAMPLE_CONCEALED_THRESHOLD = degreesToRadians(3)

  export type AngleResult = {
    type: "success",
    angle: number,
    antialiasing: boolean,
  } | { type: "likely_closed", details: string }
    | { type: "likely_concealed", details: string }
    | { type: "likely_solved" }

  export const debug_overlay = new OverlayGeometry()

  export const calibration_tables = {
    "off": AngularKeyframeFunction.fromCalibrationSamples([
        {"position": {"x": -1, "y": 0}, "is_angle_degrees": 358.97548361371},
        {"position": {"x": -10, "y": -1}, "is_angle_degrees": 3.0915850765454644},
        {"position": {"x": -9, "y": -1}, "is_angle_degrees": 3.6243978639386847},
        {"position": {"x": -8, "y": -1}, "is_angle_degrees": 4.2740649320954125},
        {"position": {"x": -7, "y": -1}, "is_angle_degrees": 4.943912355929411},
        {"position": {"x": -6, "y": -1}, "is_angle_degrees": 5.9502482933470295},
        {"position": {"x": -5, "y": -1}, "is_angle_degrees": 7.5132324018603756},
        {"position": {"x": -9, "y": -2}, "is_angle_degrees": 8.424254191266932},
        {"position": {"x": -4, "y": -1}, "is_angle_degrees": 9.533531319479852},
        {"position": {"x": -7, "y": -2}, "is_angle_degrees": 11.25501316445402},
        {"position": {"x": -10, "y": -3}, "is_angle_degrees": 11.799394482103063},
        {"position": {"x": -3, "y": -1}, "is_angle_degrees": 13.542012421869865},
        {"position": {"x": -8, "y": -3}, "is_angle_degrees": 15.628595494232096},
        {"position": {"x": -5, "y": -2}, "is_angle_degrees": 16.697241942175143},
        {"position": {"x": -7, "y": -3}, "is_angle_degrees": 18.109935497202898},
        {"position": {"x": -9, "y": -4}, "is_angle_degrees": 18.774155031273363},
        {"position": {"x": -2, "y": -1}, "is_angle_degrees": 21.561442482587285},
        {"position": {"x": -9, "y": -5}, "is_angle_degrees": 24.191451389629563},
        {"position": {"x": -7, "y": -4}, "is_angle_degrees": 24.79365104945731},
        {"position": {"x": -5, "y": -3}, "is_angle_degrees": 25.976762815159063},
        {"position": {"x": -8, "y": -5}, "is_angle_degrees": 27.197789443178184},
        {"position": {"x": -3, "y": -2}, "is_angle_degrees": 28.864414114670076},
        {"position": {"x": -10, "y": -7}, "is_angle_degrees": 30.50935413319901},
        {"position": {"x": -7, "y": -5}, "is_angle_degrees": 31.143675854268547},
        {"position": {"x": -4, "y": -3}, "is_angle_degrees": 32.686018586961616},
        {"position": {"x": -9, "y": -7}, "is_angle_degrees": 33.8521592566474},
        {"position": {"x": -5, "y": -4}, "is_angle_degrees": 34.785374033080494},
        {"position": {"x": -6, "y": -5}, "is_angle_degrees": 36.15311641904172},
        {"position": {"x": -7, "y": -6}, "is_angle_degrees": 37.251947329520604},
        {"position": {"x": -8, "y": -7}, "is_angle_degrees": 38.14663407012484},
        {"position": {"x": -9, "y": -8}, "is_angle_degrees": 38.67345995185955},
        {"position": {"x": -10, "y": -9}, "is_angle_degrees": 39.21630511981937},
        {"position": {"y": -1, "x": -1}, "is_angle_degrees": 43.61960030459728},
        {"position": {"x": -9, "y": -10}, "is_angle_degrees": 47.90406441239121},
        {"position": {"x": -8, "y": -9}, "is_angle_degrees": 48.26401621257827},
        {"position": {"x": -7, "y": -8}, "is_angle_degrees": 49.01093035602379},
        {"position": {"x": -6, "y": -7}, "is_angle_degrees": 49.74368797148861},
        {"position": {"x": -5, "y": -6}, "is_angle_degrees": 50.76736678868917},
        {"position": {"x": -4, "y": -5}, "is_angle_degrees": 52.24306240574763},
        {"position": {"x": -7, "y": -9}, "is_angle_degrees": 53.354777279488026},
        {"position": {"x": -3, "y": -4}, "is_angle_degrees": 54.482207281985765},
        {"position": {"x": -5, "y": -7}, "is_angle_degrees": 55.986496449727134},
        {"position": {"x": -7, "y": -10}, "is_angle_degrees": 56.55164864969998},
        {"position": {"x": -2, "y": -3}, "is_angle_degrees": 58.21159214357648},
        {"position": {"x": -5, "y": -8}, "is_angle_degrees": 59.996464967912566},
        {"position": {"x": -3, "y": -5}, "is_angle_degrees": 60.941347237890895},
        {"position": {"x": -4, "y": -7}, "is_angle_degrees": 62.30115088364926},
        {"position": {"x": -5, "y": -9}, "is_angle_degrees": 63.05030110535739},
        {"position": {"x": -1, "y": -2}, "is_angle_degrees": 65.3972229459928},
        {"position": {"x": -4, "y": -9}, "is_angle_degrees": 67.9381924609354},
        {"position": {"x": -3, "y": -7}, "is_angle_degrees": 68.63531796270765},
        {"position": {"x": -2, "y": -5}, "is_angle_degrees": 69.93855280359594},
        {"position": {"x": -3, "y": -8}, "is_angle_degrees": 71.30162959036313},
        {"position": {"x": -1, "y": -3}, "is_angle_degrees": 73.34657713754882},
        {"position": {"x": -3, "y": -10}, "is_angle_degrees": 74.99221499403964},
        {"position": {"x": -2, "y": -7}, "is_angle_degrees": 75.65052612412218},
        {"position": {"x": -1, "y": -4}, "is_angle_degrees": 77.4976879484156},
        {"position": {"x": -2, "y": -9}, "is_angle_degrees": 78.9091931688932},
        {"position": {"x": -1, "y": -5}, "is_angle_degrees": 79.87351008276288},
        {"position": {"x": -1, "y": -6}, "is_angle_degrees": 81.57231676838403},
        {"position": {"x": -1, "y": -7}, "is_angle_degrees": 82.71948916286081},
        {"position": {"x": -1, "y": -8}, "is_angle_degrees": 83.65512262278655},
        {"position": {"x": -1, "y": -9}, "is_angle_degrees": 84.15716308021892},
        {"position": {"x": -1, "y": -10}, "is_angle_degrees": 84.72127405207037},
        {"position": {"x": 0, "y": -1}, "is_angle_degrees": 88.81969121931886},
        {"position": {"x": 1, "y": -10}, "is_angle_degrees": 93.44415500445876},
        {"position": {"x": 1, "y": -9}, "is_angle_degrees": 93.82836112012463},
        {"position": {"x": 1, "y": -8}, "is_angle_degrees": 94.29809632316037},
        {"position": {"x": 1, "y": -7}, "is_angle_degrees": 95.06947700454371},
        {"position": {"x": 1, "y": -6}, "is_angle_degrees": 96.16780558595977},
        {"position": {"x": 1, "y": -5}, "is_angle_degrees": 97.58977886721772},
        {"position": {"x": 2, "y": -9}, "is_angle_degrees": 98.46634764544287},
        {"position": {"x": 1, "y": -4}, "is_angle_degrees": 99.5840229047626},
        {"position": {"x": 2, "y": -7}, "is_angle_degrees": 101.37254723330575},
        {"position": {"x": 3, "y": -10}, "is_angle_degrees": 102.0417318219204},
        {"position": {"x": 1, "y": -3}, "is_angle_degrees": 103.73657745745831},
        {"position": {"x": 3, "y": -8}, "is_angle_degrees": 105.62859549423209},
        {"position": {"x": 2, "y": -5}, "is_angle_degrees": 106.84382873101586},
        {"position": {"x": 3, "y": -7}, "is_angle_degrees": 108.24790833191284},
        {"position": {"x": 4, "y": -9}, "is_angle_degrees": 109.03305369040385},
        {"position": {"x": 1, "y": -2}, "is_angle_degrees": 111.56144248258734},
        {"position": {"x": 5, "y": -9}, "is_angle_degrees": 114.17025803688227},
        {"position": {"x": 4, "y": -7}, "is_angle_degrees": 114.90794888539249},
        {"position": {"x": 3, "y": -5}, "is_angle_degrees": 116.13918305040671},
        {"position": {"x": 5, "y": -8}, "is_angle_degrees": 117.19778944317821},
        {"position": {"x": 2, "y": -3}, "is_angle_degrees": 119.1425984804859},
        {"position": {"x": 7, "y": -10}, "is_angle_degrees": 120.63452506540716},
        {"position": {"x": 5, "y": -7}, "is_angle_degrees": 121.14367585426854},
        {"position": {"x": 3, "y": -4}, "is_angle_degrees": 122.68601858696164},
        {"position": {"x": 7, "y": -9}, "is_angle_degrees": 123.8521592566474},
        {"position": {"x": 4, "y": -5}, "is_angle_degrees": 124.96838479956568},
        {"position": {"x": 5, "y": -6}, "is_angle_degrees": 126.44628903768498},
        {"position": {"x": 6, "y": -7}, "is_angle_degrees": 127.60227097408769},
        {"position": {"x": 7, "y": -8}, "is_angle_degrees": 128.1466340701248},
        {"position": {"x": 8, "y": -9}, "is_angle_degrees": 128.82196032664805},
        {"position": {"x": 9, "y": -10}, "is_angle_degrees": 129.3660359438609},
        {"position": {"x": 1, "y": -1}, "is_angle_degrees": 133.61960030459727},
        {"position": {"x": 10, "y": -9}, "is_angle_degrees": 138.17144963663821},
        {"position": {"x": 9, "y": -8}, "is_angle_degrees": 138.67713160080982},
        {"position": {"x": 8, "y": -7}, "is_angle_degrees": 139.0109303560238},
        {"position": {"x": 7, "y": -6}, "is_angle_degrees": 139.92487782495525},
        {"position": {"x": 6, "y": -5}, "is_angle_degrees": 140.96074988145998},
        {"position": {"x": 5, "y": -4}, "is_angle_degrees": 142.47975023747753},
        {"position": {"x": 9, "y": -7}, "is_angle_degrees": 143.35477727948808},
        {"position": {"x": 4, "y": -3}, "is_angle_degrees": 144.48220728198572},
        {"position": {"x": 7, "y": -5}, "is_angle_degrees": 145.98649644972713},
        {"position": {"x": 10, "y": -7}, "is_angle_degrees": 146.83852648423527},
        {"position": {"x": 3, "y": -2}, "is_angle_degrees": 148.41189959121326},
        {"position": {"x": 8, "y": -5}, "is_angle_degrees": 149.99646496791254},
        {"position": {"x": 5, "y": -3}, "is_angle_degrees": 151.23110249069535},
        {"position": {"x": 7, "y": -4}, "is_angle_degrees": 152.36472837101428},
        {"position": {"x": 9, "y": -5}, "is_angle_degrees": 153.1069843794491},
        {"position": {"x": 2, "y": -1}, "is_angle_degrees": 155.3972229459928},
        {"position": {"x": 9, "y": -4}, "is_angle_degrees": 158.11428899635948},
        {"position": {"x": 7, "y": -3}, "is_angle_degrees": 158.82739948470518},
        {"position": {"x": 5, "y": -2}, "is_angle_degrees": 160.062970095961},
        {"position": {"x": 8, "y": -3}, "is_angle_degrees": 161.3016295903631},
        {"position": {"x": 3, "y": -1}, "is_angle_degrees": 163.5033282727502},
        {"position": {"x": 10, "y": -3}, "is_angle_degrees": 165.2612094402138},
        {"position": {"x": 7, "y": -2}, "is_angle_degrees": 165.82765228852304},
        {"position": {"x": 4, "y": -1}, "is_angle_degrees": 167.48803697142048},
        {"position": {"x": 9, "y": -2}, "is_angle_degrees": 168.88465955024463},
        {"position": {"x": 5, "y": -1}, "is_angle_degrees": 170.03444123017778},
        {"position": {"x": 6, "y": -1}, "is_angle_degrees": 171.70537931037876},
        {"position": {"x": 7, "y": -1}, "is_angle_degrees": 172.85534104418582},
        {"position": {"x": 8, "y": -1}, "is_angle_degrees": 173.6391145845945},
        {"position": {"x": 9, "y": -1}, "is_angle_degrees": 174.29046341543932},
        {"position": {"x": 10, "y": -1}, "is_angle_degrees": 174.89986177694306},
        {"position": {"x": 1, "y": 0}, "is_angle_degrees": 178.9454106464548},
        {"position": {"x": 10, "y": 1}, "is_angle_degrees": 183.46500054547502},
        {"position": {"x": 9, "y": 1}, "is_angle_degrees": 183.8451728388274},
        {"position": {"x": 8, "y": 1}, "is_angle_degrees": 184.3402314808313},
        {"position": {"x": 7, "y": 1}, "is_angle_degrees": 185.09664795446173},
        {"position": {"x": 6, "y": 1}, "is_angle_degrees": 186.2222018600384},
        {"position": {"x": 5, "y": 1}, "is_angle_degrees": 187.6006155768384},
        {"position": {"x": 9, "y": 2}, "is_angle_degrees": 188.5063293429787},
        {"position": {"x": 4, "y": 1}, "is_angle_degrees": 189.63145560451437},
        {"position": {"x": 7, "y": 2}, "is_angle_degrees": 191.2988014247723},
        {"position": {"x": 10, "y": 3}, "is_angle_degrees": 192.04173182192037},
        {"position": {"x": 3, "y": 1}, "is_angle_degrees": 193.7365774574583},
        {"position": {"x": 8, "y": 3}, "is_angle_degrees": 195.62859549423206},
        {"position": {"x": 5, "y": 2}, "is_angle_degrees": 196.84382873101583},
        {"position": {"x": 7, "y": 3}, "is_angle_degrees": 198.2479083319128},
        {"position": {"x": 9, "y": 4}, "is_angle_degrees": 199.03305369040382},
        {"position": {"x": 2, "y": 1}, "is_angle_degrees": 201.5614424825873},
        {"position": {"x": 9, "y": 5}, "is_angle_degrees": 204.1914513896296},
        {"position": {"x": 7, "y": 4}, "is_angle_degrees": 204.7936510494573},
        {"position": {"x": 5, "y": 3}, "is_angle_degrees": 206.1391830504067},
        {"position": {"x": 8, "y": 5}, "is_angle_degrees": 207.19778944317824},
        {"position": {"x": 3, "y": 2}, "is_angle_degrees": 209.14259848048587},
        {"position": {"x": 10, "y": 7}, "is_angle_degrees": 210.50935413319908},
        {"position": {"x": 7, "y": 5}, "is_angle_degrees": 211.14367585426857},
        {"position": {"x": 4, "y": 3}, "is_angle_degrees": 212.68601858696158},
        {"position": {"x": 9, "y": 7}, "is_angle_degrees": 213.8521592566474},
        {"position": {"x": 5, "y": 4}, "is_angle_degrees": 214.9683847995657},
        {"position": {"x": 6, "y": 5}, "is_angle_degrees": 216.1531164190416},
        {"position": {"x": 7, "y": 6}, "is_angle_degrees": 217.60227097408762},
        {"position": {"x": 8, "y": 7}, "is_angle_degrees": 218.14663407012475},
        {"position": {"x": 9, "y": 8}, "is_angle_degrees": 218.82196032664802},
        {"position": {"x": 10, "y": 9}, "is_angle_degrees": 219.36603594386088},
        {"position": {"y": 1, "x": 1}, "is_angle_degrees": 223.61960030459727},
        {"position": {"x": 9, "y": 10}, "is_angle_degrees": 228.17144963663827},
        {"position": {"x": 8, "y": 9}, "is_angle_degrees": 228.6771316008098},
        {"position": {"x": 7, "y": 8}, "is_angle_degrees": 229.01093035602378},
        {"position": {"x": 6, "y": 7}, "is_angle_degrees": 229.92487782495525},
        {"position": {"x": 5, "y": 6}, "is_angle_degrees": 230.96074988145992},
        {"position": {"x": 4, "y": 5}, "is_angle_degrees": 232.24306240574765},
        {"position": {"x": 7, "y": 9}, "is_angle_degrees": 233.35477727948802},
        {"position": {"x": 3, "y": 4}, "is_angle_degrees": 234.48220728198575},
        {"position": {"x": 5, "y": 7}, "is_angle_degrees": 235.98649644972707},
        {"position": {"x": 7, "y": 10}, "is_angle_degrees": 236.83852648423527},
        {"position": {"x": 2, "y": 3}, "is_angle_degrees": 238.21159214357647},
        {"position": {"x": 5, "y": 8}, "is_angle_degrees": 239.99646496791257},
        {"position": {"x": 3, "y": 5}, "is_angle_degrees": 240.94134723789088},
        {"position": {"x": 4, "y": 7}, "is_angle_degrees": 242.36472837101428},
        {"position": {"x": 5, "y": 9}, "is_angle_degrees": 243.10698437944907},
        {"position": {"x": 1, "y": 2}, "is_angle_degrees": 245.39722294599275},
        {"position": {"x": 4, "y": 9}, "is_angle_degrees": 247.93819246093537},
        {"position": {"x": 3, "y": 7}, "is_angle_degrees": 248.63531796270763},
        {"position": {"x": 2, "y": 5}, "is_angle_degrees": 250.062970095961},
        {"position": {"x": 3, "y": 8}, "is_angle_degrees": 251.30162959036312},
        {"position": {"x": 1, "y": 3}, "is_angle_degrees": 253.50332827275014},
        {"position": {"x": 3, "y": 10}, "is_angle_degrees": 254.99221499403959},
        {"position": {"x": 2, "y": 7}, "is_angle_degrees": 255.82765228852304},
        {"position": {"x": 1, "y": 4}, "is_angle_degrees": 257.48803697142046},
        {"position": {"x": 2, "y": 9}, "is_angle_degrees": 258.88465955024463},
        {"position": {"x": 1, "y": 5}, "is_angle_degrees": 260.0344412301777},
        {"position": {"x": 1, "y": 6}, "is_angle_degrees": 261.5414743063807},
        {"position": {"x": 1, "y": 7}, "is_angle_degrees": 262.70418106028814},
        {"position": {"x": 1, "y": 8}, "is_angle_degrees": 263.6438870226672},
        {"position": {"x": 1, "y": 9}, "is_angle_degrees": 264.2950487518362},
        {"position": {"x": 1, "y": 10}, "is_angle_degrees": 264.71882322839576},
        {"position": {"x": 0, "y": 1}, "is_angle_degrees": 268.9574622056212},
        {"position": {"x": -1, "y": 10}, "is_angle_degrees": 273.4535523780269},
        {"position": {"x": -1, "y": 9}, "is_angle_degrees": 273.6585928958727},
        {"position": {"x": -1, "y": 8}, "is_angle_degrees": 274.3202088854179},
        {"position": {"x": -1, "y": 7}, "is_angle_degrees": 275.09664795446173},
        {"position": {"x": -1, "y": 6}, "is_angle_degrees": 276.1960778097401},
        {"position": {"x": -1, "y": 5}, "is_angle_degrees": 277.5738361587578},
        {"position": {"x": -2, "y": 9}, "is_angle_degrees": 278.5063293429787},
        {"position": {"x": -1, "y": 4}, "is_angle_degrees": 279.6314556045144},
        {"position": {"x": -2, "y": 7}, "is_angle_degrees": 281.2988014247723},
        {"position": {"x": -3, "y": 10}, "is_angle_degrees": 282.0417318219204},
        {"position": {"x": -1, "y": 3}, "is_angle_degrees": 283.54201242186986},
        {"position": {"x": -3, "y": 8}, "is_angle_degrees": 285.62859549423206},
        {"position": {"x": -2, "y": 5}, "is_angle_degrees": 286.6972419421751},
        {"position": {"x": -3, "y": 7}, "is_angle_degrees": 288.24790833191287},
        {"position": {"x": -4, "y": 9}, "is_angle_degrees": 289.03305369040385},
        {"position": {"x": -1, "y": 2}, "is_angle_degrees": 291.56144248258727},
        {"position": {"x": -5, "y": 9}, "is_angle_degrees": 294.1914513896296},
        {"position": {"x": -4, "y": 7}, "is_angle_degrees": 294.7936510494573},
        {"position": {"x": -3, "y": 5}, "is_angle_degrees": 296.1391830504067},
        {"position": {"x": -5, "y": 8}, "is_angle_degrees": 297.19778944317824},
        {"position": {"x": -2, "y": 3}, "is_angle_degrees": 299.1425984804859},
        {"position": {"x": -7, "y": 10}, "is_angle_degrees": 300.5093541331991},
        {"position": {"x": -5, "y": 7}, "is_angle_degrees": 301.14367585426857},
        {"position": {"x": -3, "y": 4}, "is_angle_degrees": 302.6860185869616},
        {"position": {"x": -7, "y": 9}, "is_angle_degrees": 303.85215925664744},
        {"position": {"x": -4, "y": 5}, "is_angle_degrees": 304.96838479956574},
        {"position": {"x": -5, "y": 6}, "is_angle_degrees": 306.1531164190416},
        {"position": {"x": -6, "y": 7}, "is_angle_degrees": 307.2519473295205},
        {"position": {"x": -7, "y": 8}, "is_angle_degrees": 308.1466340701247},
        {"position": {"x": -8, "y": 9}, "is_angle_degrees": 308.67345995185957},
        {"position": {"x": -9, "y": 10}, "is_angle_degrees": 309.2163051198193},
        {"position": {"x": -1, "y": 1}, "is_angle_degrees": 313.6196003045972},
        {"position": {"x": -10, "y": 9}, "is_angle_degrees": 317.90406441239116},
        {"position": {"x": -9, "y": 8}, "is_angle_degrees": 318.2640162125783},
        {"position": {"x": -8, "y": 7}, "is_angle_degrees": 319.01093035602383},
        {"position": {"x": -7, "y": 6}, "is_angle_degrees": 319.7436879714886},
        {"position": {"x": -6, "y": 5}, "is_angle_degrees": 320.96074988145995},
        {"position": {"x": -5, "y": 4}, "is_angle_degrees": 322.24306240574754},
        {"position": {"x": -9, "y": 7}, "is_angle_degrees": 323.354777279488},
        {"position": {"x": -4, "y": 3}, "is_angle_degrees": 324.48220728198584},
        {"position": {"x": -7, "y": 5}, "is_angle_degrees": 325.9864964497272},
        {"position": {"x": -10, "y": 7}, "is_angle_degrees": 326.8385264842353},
        {"position": {"x": -3, "y": 2}, "is_angle_degrees": 328.21159214357647},
        {"position": {"x": -8, "y": 5}, "is_angle_degrees": 329.9964649679126},
        {"position": {"x": -5, "y": 3}, "is_angle_degrees": 330.94134723789085},
        {"position": {"x": -7, "y": 4}, "is_angle_degrees": 332.3647283710143},
        {"position": {"x": -9, "y": 5}, "is_angle_degrees": 333.10698437944905},
        {"position": {"x": -2, "y": 1}, "is_angle_degrees": 335.3972229459928},
        {"position": {"x": -9, "y": 4}, "is_angle_degrees": 337.93819246093534},
        {"position": {"x": -7, "y": 3}, "is_angle_degrees": 338.6353179627076},
        {"position": {"x": -5, "y": 2}, "is_angle_degrees": 339.93855280359594},
        {"position": {"x": -8, "y": 3}, "is_angle_degrees": 341.3016295903631},
        {"position": {"x": -3, "y": 1}, "is_angle_degrees": 343.3465771375488},
        {"position": {"x": -10, "y": 3}, "is_angle_degrees": 344.9954729437606},
        {"position": {"x": -7, "y": 2}, "is_angle_degrees": 345.8364433506414},
        {"position": {"x": -4, "y": 1}, "is_angle_degrees": 347.50804883835036},
        {"position": {"x": -9, "y": 2}, "is_angle_degrees": 348.930281257497},
        {"position": {"x": -5, "y": 1}, "is_angle_degrees": 350.08925994058677},
        {"position": {"x": -6, "y": 1}, "is_angle_degrees": 351.605980234129},
        {"position": {"x": -7, "y": 1}, "is_angle_degrees": 352.7440875549545},
        {"position": {"x": -8, "y": 1}, "is_angle_degrees": 353.66974667281113},
        {"position": {"x": -9, "y": 1}, "is_angle_degrees": 354.17074283320943},
        {"position": {"x": -10, "y": 1}, "is_angle_degrees": 354.74060261085043}
      ],
      "cosine"
    )
    ,
    "msaa": AngularKeyframeFunction.fromCalibrationSamples([
        {"position": {"x": -1, "y": 0}, "is_angle_degrees": 358.9062404843492},
        {"position": {"x": -10, "y": -1}, "is_angle_degrees": 3.015824227135354},
        {"position": {"x": -9, "y": -1}, "is_angle_degrees": 3.4063907032698832},
        {"position": {"x": -8, "y": -1}, "is_angle_degrees": 4.150534306491888},
        {"position": {"x": -7, "y": -1}, "is_angle_degrees": 4.873816202645667},
        {"position": {"x": -6, "y": -1}, "is_angle_degrees": 5.744130607255902},
        {"position": {"x": -5, "y": -1}, "is_angle_degrees": 7.309591296822936},
        {"position": {"x": -9, "y": -2}, "is_angle_degrees": 8.257751757183227},
        {"position": {"x": -4, "y": -1}, "is_angle_degrees": 9.547210309382997},
        {"position": {"x": -7, "y": -2}, "is_angle_degrees": 11.269958340678484},
        {"position": {"x": -10, "y": -3}, "is_angle_degrees": 11.763352100044244},
        {"position": {"x": -3, "y": -1}, "is_angle_degrees": 13.519196308111681},
        {"position": {"x": -8, "y": -3}, "is_angle_degrees": 15.57015809489564},
        {"position": {"x": -5, "y": -2}, "is_angle_degrees": 16.688472405851865},
        {"position": {"x": -7, "y": -3}, "is_angle_degrees": 17.90575643760454},
        {"position": {"x": -9, "y": -4}, "is_angle_degrees": 18.74998936088447},
        {"position": {"x": -2, "y": -1}, "is_angle_degrees": 21.618285125982755},
        {"position": {"x": -9, "y": -5}, "is_angle_degrees": 24.047216250388274},
        {"position": {"x": -7, "y": -4}, "is_angle_degrees": 24.78168335956703},
        {"position": {"x": -5, "y": -3}, "is_angle_degrees": 25.841972128937723},
        {"position": {"x": -8, "y": -5}, "is_angle_degrees": 27.08020133177423},
        {"position": {"x": -3, "y": -2}, "is_angle_degrees": 28.87600384213773},
        {"position": {"x": -10, "y": -7}, "is_angle_degrees": 30.434166824264857},
        {"position": {"x": -7, "y": -5}, "is_angle_degrees": 31.108609946620774},
        {"position": {"x": -4, "y": -3}, "is_angle_degrees": 32.609970338749285},
        {"position": {"x": -9, "y": -7}, "is_angle_degrees": 33.906090472833256},
        {"position": {"x": -5, "y": -4}, "is_angle_degrees": 34.681766233120584},
        {"position": {"x": -6, "y": -5}, "is_angle_degrees": 36.296355869293514},
        {"position": {"x": -7, "y": -6}, "is_angle_degrees": 37.29676915898529},
        {"position": {"x": -8, "y": -7}, "is_angle_degrees": 38.022337873723416},
        {"position": {"x": -9, "y": -8}, "is_angle_degrees": 38.672754953141485},
        {"position": {"x": -10, "y": -9}, "is_angle_degrees": 39.08997114699732},
        {"position": {"y": -1, "x": -1}, "is_angle_degrees": 43.58144568725352},
        {"position": {"x": -9, "y": -10}, "is_angle_degrees": 47.84445639103594},
        {"position": {"x": -8, "y": -9}, "is_angle_degrees": 48.341366631916294},
        {"position": {"x": -7, "y": -8}, "is_angle_degrees": 49.17711633077582},
        {"position": {"x": -6, "y": -7}, "is_angle_degrees": 49.6844862515901},
        {"position": {"x": -5, "y": -6}, "is_angle_degrees": 50.76829785745487},
        {"position": {"x": -4, "y": -5}, "is_angle_degrees": 52.32160818440021},
        {"position": {"x": -7, "y": -9}, "is_angle_degrees": 53.374509182143406},
        {"position": {"x": -3, "y": -4}, "is_angle_degrees": 54.62827230045663},
        {"position": {"x": -5, "y": -7}, "is_angle_degrees": 55.97053707956072},
        {"position": {"x": -7, "y": -10}, "is_angle_degrees": 56.5987246121811},
        {"position": {"x": -2, "y": -3}, "is_angle_degrees": 58.07037986169753},
        {"position": {"x": -5, "y": -8}, "is_angle_degrees": 60.01488725059763},
        {"position": {"x": -3, "y": -5}, "is_angle_degrees": 61.03513199258265},
        {"position": {"x": -4, "y": -7}, "is_angle_degrees": 62.328258510155},
        {"position": {"x": -5, "y": -9}, "is_angle_degrees": 62.88426080498041},
        {"position": {"x": -1, "y": -2}, "is_angle_degrees": 65.59300770955178},
        {"position": {"x": -4, "y": -9}, "is_angle_degrees": 67.93741623972126},
        {"position": {"x": -3, "y": -7}, "is_angle_degrees": 68.51132980210602},
        {"position": {"x": -2, "y": -5}, "is_angle_degrees": 69.83170410057323},
        {"position": {"x": -3, "y": -8}, "is_angle_degrees": 71.27333083970323},
        {"position": {"x": -1, "y": -3}, "is_angle_degrees": 73.19941067962753},
        {"position": {"x": -3, "y": -10}, "is_angle_degrees": 75.00764684394484},
        {"position": {"x": -2, "y": -7}, "is_angle_degrees": 75.63081972103929},
        {"position": {"x": -1, "y": -4}, "is_angle_degrees": 77.54688376909357},
        {"position": {"x": -2, "y": -9}, "is_angle_degrees": 78.76986032195386},
        {"position": {"x": -1, "y": -5}, "is_angle_degrees": 79.78753018792194},
        {"position": {"x": -1, "y": -6}, "is_angle_degrees": 81.53998824464456},
        {"position": {"x": -1, "y": -7}, "is_angle_degrees": 82.70102255937597},
        {"position": {"x": -1, "y": -8}, "is_angle_degrees": 83.57217920592066},
        {"position": {"x": -1, "y": -9}, "is_angle_degrees": 84.11478590387199},
        {"position": {"x": -1, "y": -10}, "is_angle_degrees": 84.62081287565084},
        {"position": {"x": 0, "y": -1}, "is_angle_degrees": 88.75059834389745},
        {"position": {"x": 1, "y": -10}, "is_angle_degrees": 93.22996828015556},
        {"position": {"x": 1, "y": -9}, "is_angle_degrees": 93.6014367507076},
        {"position": {"x": 1, "y": -8}, "is_angle_degrees": 94.17501817246028},
        {"position": {"x": 1, "y": -7}, "is_angle_degrees": 94.99039577943437},
        {"position": {"x": 1, "y": -6}, "is_angle_degrees": 95.95728406075649},
        {"position": {"x": 1, "y": -5}, "is_angle_degrees": 97.5239791753578},
        {"position": {"x": 2, "y": -9}, "is_angle_degrees": 98.31670747228206},
        {"position": {"x": 1, "y": -4}, "is_angle_degrees": 99.59805178089688},
        {"position": {"x": 2, "y": -7}, "is_angle_degrees": 101.42636280812371},
        {"position": {"x": 3, "y": -10}, "is_angle_degrees": 102.0398244093453},
        {"position": {"x": 1, "y": -3}, "is_angle_degrees": 103.6483432977611},
        {"position": {"x": 3, "y": -8}, "is_angle_degrees": 105.57015809489563},
        {"position": {"x": 2, "y": -5}, "is_angle_degrees": 106.86376624548261},
        {"position": {"x": 3, "y": -7}, "is_angle_degrees": 108.1464651205289},
        {"position": {"x": 4, "y": -9}, "is_angle_degrees": 108.96485127495743},
        {"position": {"x": 1, "y": -2}, "is_angle_degrees": 111.61828512598277},
        {"position": {"x": 5, "y": -9}, "is_angle_degrees": 114.2214754602621},
        {"position": {"x": 4, "y": -7}, "is_angle_degrees": 114.94717175735904},
        {"position": {"x": 3, "y": -5}, "is_angle_degrees": 116.0249793273514},
        {"position": {"x": 5, "y": -8}, "is_angle_degrees": 117.08020133177425},
        {"position": {"x": 2, "y": -3}, "is_angle_degrees": 119.05417812006047},
        {"position": {"x": 7, "y": -10}, "is_angle_degrees": 120.61595904264577},
        {"position": {"x": 5, "y": -7}, "is_angle_degrees": 121.10860994662077},
        {"position": {"x": 3, "y": -4}, "is_angle_degrees": 122.60997033874926},
        {"position": {"x": 7, "y": -9}, "is_angle_degrees": 123.90609047283323},
        {"position": {"x": 4, "y": -5}, "is_angle_degrees": 124.80989374618962},
        {"position": {"x": 5, "y": -6}, "is_angle_degrees": 126.46501357523641},
        {"position": {"x": 6, "y": -7}, "is_angle_degrees": 127.49736615816256},
        {"position": {"x": 7, "y": -8}, "is_angle_degrees": 128.02233787372342},
        {"position": {"x": 8, "y": -9}, "is_angle_degrees": 128.82865816003024},
        {"position": {"x": 9, "y": -10}, "is_angle_degrees": 129.2455032837375},
        {"position": {"x": 1, "y": -1}, "is_angle_degrees": 133.5814456872535},
        {"position": {"x": 10, "y": -9}, "is_angle_degrees": 138.01373371960534},
        {"position": {"x": 9, "y": -8}, "is_angle_degrees": 138.48429205891387},
        {"position": {"x": 8, "y": -7}, "is_angle_degrees": 139.1771163307758},
        {"position": {"x": 7, "y": -6}, "is_angle_degrees": 140.04817548781395},
        {"position": {"x": 6, "y": -5}, "is_angle_degrees": 140.97614431680358},
        {"position": {"x": 5, "y": -4}, "is_angle_degrees": 142.42968193418042},
        {"position": {"x": 9, "y": -7}, "is_angle_degrees": 143.37450918214338},
        {"position": {"x": 4, "y": -3}, "is_angle_degrees": 144.62827230045662},
        {"position": {"x": 7, "y": -5}, "is_angle_degrees": 145.97053707956073},
        {"position": {"x": 10, "y": -7}, "is_angle_degrees": 146.71217806281234},
        {"position": {"x": 3, "y": -2}, "is_angle_degrees": 148.3480817813216},
        {"position": {"x": 8, "y": -5}, "is_angle_degrees": 150.01488725059764},
        {"position": {"x": 5, "y": -3}, "is_angle_degrees": 151.11942009130226},
        {"position": {"x": 7, "y": -4}, "is_angle_degrees": 152.48882478832707},
        {"position": {"x": 9, "y": -5}, "is_angle_degrees": 153.03818150572462},
        {"position": {"x": 2, "y": -1}, "is_angle_degrees": 155.59300770955178},
        {"position": {"x": 9, "y": -4}, "is_angle_degrees": 158.1120814237667},
        {"position": {"x": 7, "y": -3}, "is_angle_degrees": 158.69019268359077},
        {"position": {"x": 5, "y": -2}, "is_angle_degrees": 159.95731219968815},
        {"position": {"x": 8, "y": -3}, "is_angle_degrees": 161.27333083970322},
        {"position": {"x": 3, "y": -1}, "is_angle_degrees": 163.38350382859878},
        {"position": {"x": 10, "y": -3}, "is_angle_degrees": 165.13760046767635},
        {"position": {"x": 7, "y": -2}, "is_angle_degrees": 165.77390924845312},
        {"position": {"x": 4, "y": -1}, "is_angle_degrees": 167.55014528069785},
        {"position": {"x": 9, "y": -2}, "is_angle_degrees": 168.76986032195387},
        {"position": {"x": 5, "y": -1}, "is_angle_degrees": 169.8956044687564},
        {"position": {"x": 6, "y": -1}, "is_angle_degrees": 171.7043010947753},
        {"position": {"x": 7, "y": -1}, "is_angle_degrees": 172.95213437442902},
        {"position": {"x": 8, "y": -1}, "is_angle_degrees": 173.53133623729605},
        {"position": {"x": 9, "y": -1}, "is_angle_degrees": 174.27058718929518},
        {"position": {"x": 10, "y": -1}, "is_angle_degrees": 174.74450865179196},
        {"position": {"x": 1, "y": 0}, "is_angle_degrees": 178.87193028119924},
        {"position": {"x": 10, "y": 1}, "is_angle_degrees": 183.22996828015556},
        {"position": {"x": 9, "y": 1}, "is_angle_degrees": 183.62316853267237},
        {"position": {"x": 8, "y": 1}, "is_angle_degrees": 184.1982922640779},
        {"position": {"x": 7, "y": 1}, "is_angle_degrees": 185.0206411031291},
        {"position": {"x": 6, "y": 1}, "is_angle_degrees": 185.95728406075645},
        {"position": {"x": 5, "y": 1}, "is_angle_degrees": 187.3539122007621},
        {"position": {"x": 9, "y": 2}, "is_angle_degrees": 188.31670747228205},
        {"position": {"x": 4, "y": 1}, "is_angle_degrees": 189.59805178089687},
        {"position": {"x": 7, "y": 2}, "is_angle_degrees": 191.26995834067847},
        {"position": {"x": 10, "y": 3}, "is_angle_degrees": 192.03982440934527},
        {"position": {"x": 3, "y": 1}, "is_angle_degrees": 193.64834329776107},
        {"position": {"x": 8, "y": 3}, "is_angle_degrees": 195.57015809489562},
        {"position": {"x": 5, "y": 2}, "is_angle_degrees": 196.86376624548254},
        {"position": {"x": 7, "y": 3}, "is_angle_degrees": 198.14646512052886},
        {"position": {"x": 9, "y": 4}, "is_angle_degrees": 198.96485127495743},
        {"position": {"x": 2, "y": 1}, "is_angle_degrees": 201.61828512598277},
        {"position": {"x": 9, "y": 5}, "is_angle_degrees": 204.04721625038826},
        {"position": {"x": 7, "y": 4}, "is_angle_degrees": 204.781683359567},
        {"position": {"x": 5, "y": 3}, "is_angle_degrees": 206.02497932735136},
        {"position": {"x": 8, "y": 5}, "is_angle_degrees": 207.08020133177425},
        {"position": {"x": 3, "y": 2}, "is_angle_degrees": 209.05417812006047},
        {"position": {"x": 10, "y": 7}, "is_angle_degrees": 210.43416682426485},
        {"position": {"x": 7, "y": 5}, "is_angle_degrees": 211.10860994662073},
        {"position": {"x": 4, "y": 3}, "is_angle_degrees": 212.60997033874935},
        {"position": {"x": 9, "y": 7}, "is_angle_degrees": 213.9060904728331},
        {"position": {"x": 5, "y": 4}, "is_angle_degrees": 214.8098937461895},
        {"position": {"x": 6, "y": 5}, "is_angle_degrees": 216.29635586929354},
        {"position": {"x": 7, "y": 6}, "is_angle_degrees": 217.49736615816246},
        {"position": {"x": 8, "y": 7}, "is_angle_degrees": 218.02233787372333},
        {"position": {"x": 9, "y": 8}, "is_angle_degrees": 218.82865816003016},
        {"position": {"x": 10, "y": 9}, "is_angle_degrees": 219.24550328373743},
        {"position": {"y": 1, "x": 1}, "is_angle_degrees": 223.58144568725348},
        {"position": {"x": 9, "y": 10}, "is_angle_degrees": 228.0137337196053},
        {"position": {"x": 8, "y": 9}, "is_angle_degrees": 228.4842920589138},
        {"position": {"x": 7, "y": 8}, "is_angle_degrees": 229.17711633077585},
        {"position": {"x": 6, "y": 7}, "is_angle_degrees": 230.04817548781398},
        {"position": {"x": 5, "y": 6}, "is_angle_degrees": 230.97614431680344},
        {"position": {"x": 4, "y": 5}, "is_angle_degrees": 232.32160818440016},
        {"position": {"x": 7, "y": 9}, "is_angle_degrees": 233.37450918214327},
        {"position": {"x": 3, "y": 4}, "is_angle_degrees": 234.62827230045656},
        {"position": {"x": 5, "y": 7}, "is_angle_degrees": 235.97053707956078},
        {"position": {"x": 7, "y": 10}, "is_angle_degrees": 236.7121780628123},
        {"position": {"x": 2, "y": 3}, "is_angle_degrees": 238.07037986169746},
        {"position": {"x": 5, "y": 8}, "is_angle_degrees": 240.01488725059764},
        {"position": {"x": 3, "y": 5}, "is_angle_degrees": 241.0351319925826},
        {"position": {"x": 4, "y": 7}, "is_angle_degrees": 242.48882478832692},
        {"position": {"x": 5, "y": 9}, "is_angle_degrees": 243.03818150572462},
        {"position": {"x": 1, "y": 2}, "is_angle_degrees": 245.59300770955178},
        {"position": {"x": 4, "y": 9}, "is_angle_degrees": 247.9374162397213},
        {"position": {"x": 3, "y": 7}, "is_angle_degrees": 248.51132980210596},
        {"position": {"x": 2, "y": 5}, "is_angle_degrees": 249.95731219968818},
        {"position": {"x": 3, "y": 8}, "is_angle_degrees": 251.27333083970322},
        {"position": {"x": 1, "y": 3}, "is_angle_degrees": 253.38350382859878},
        {"position": {"x": 3, "y": 10}, "is_angle_degrees": 255.01187448977316},
        {"position": {"x": 2, "y": 7}, "is_angle_degrees": 255.7739092484531},
        {"position": {"x": 1, "y": 4}, "is_angle_degrees": 257.5468837690936},
        {"position": {"x": 2, "y": 9}, "is_angle_degrees": 258.76986032195384},
        {"position": {"x": 1, "y": 5}, "is_angle_degrees": 259.8956044687564},
        {"position": {"x": 1, "y": 6}, "is_angle_degrees": 261.5399882446446},
        {"position": {"x": 1, "y": 7}, "is_angle_degrees": 262.6713286659715},
        {"position": {"x": 1, "y": 8}, "is_angle_degrees": 263.531336237296},
        {"position": {"x": 1, "y": 9}, "is_angle_degrees": 264.27058718929516},
        {"position": {"x": 1, "y": 10}, "is_angle_degrees": 264.5930379316402},
        {"position": {"x": 0, "y": 1}, "is_angle_degrees": 268.8853991059313},
        {"position": {"x": -1, "y": 10}, "is_angle_degrees": 273.22996828015556},
        {"position": {"x": -1, "y": 9}, "is_angle_degrees": 273.44906766582966},
        {"position": {"x": -1, "y": 8}, "is_angle_degrees": 274.1982922640779},
        {"position": {"x": -1, "y": 7}, "is_angle_degrees": 275.0206411031291},
        {"position": {"x": -1, "y": 6}, "is_angle_degrees": 275.9572840607565},
        {"position": {"x": -1, "y": 5}, "is_angle_degrees": 277.3539122007621},
        {"position": {"x": -2, "y": 9}, "is_angle_degrees": 278.30713187597485},
        {"position": {"x": -1, "y": 4}, "is_angle_degrees": 279.59805178089687},
        {"position": {"x": -2, "y": 7}, "is_angle_degrees": 281.26995834067844},
        {"position": {"x": -3, "y": 10}, "is_angle_degrees": 282.03982440934533},
        {"position": {"x": -1, "y": 3}, "is_angle_degrees": 283.51919630811165},
        {"position": {"x": -3, "y": 8}, "is_angle_degrees": 285.57015809489565},
        {"position": {"x": -2, "y": 5}, "is_angle_degrees": 286.6884724058518},
        {"position": {"x": -3, "y": 7}, "is_angle_degrees": 288.1464651205289},
        {"position": {"x": -4, "y": 9}, "is_angle_degrees": 288.96485127495737},
        {"position": {"x": -1, "y": 2}, "is_angle_degrees": 291.6182851259827},
        {"position": {"x": -5, "y": 9}, "is_angle_degrees": 294.04721625038826},
        {"position": {"x": -4, "y": 7}, "is_angle_degrees": 294.781683359567},
        {"position": {"x": -3, "y": 5}, "is_angle_degrees": 296.02497932735133},
        {"position": {"x": -5, "y": 8}, "is_angle_degrees": 297.0802013317742},
        {"position": {"x": -2, "y": 3}, "is_angle_degrees": 299.05417812006044},
        {"position": {"x": -7, "y": 10}, "is_angle_degrees": 300.4341668242649},
        {"position": {"x": -5, "y": 7}, "is_angle_degrees": 301.10860994662073},
        {"position": {"x": -3, "y": 4}, "is_angle_degrees": 302.6099703387494},
        {"position": {"x": -7, "y": 9}, "is_angle_degrees": 303.9060904728331},
        {"position": {"x": -4, "y": 5}, "is_angle_degrees": 304.8098937461895},
        {"position": {"x": -5, "y": 6}, "is_angle_degrees": 306.2963558692935},
        {"position": {"x": -6, "y": 7}, "is_angle_degrees": 307.29676915898517},
        {"position": {"x": -7, "y": 8}, "is_angle_degrees": 308.0223378737234},
        {"position": {"x": -8, "y": 9}, "is_angle_degrees": 308.67275495314135},
        {"position": {"x": -9, "y": 10}, "is_angle_degrees": 309.0899711469973},
        {"position": {"x": -1, "y": 1}, "is_angle_degrees": 313.5814456872535},
        {"position": {"x": -10, "y": 9}, "is_angle_degrees": 317.84445639103586},
        {"position": {"x": -9, "y": 8}, "is_angle_degrees": 318.34136663191634},
        {"position": {"x": -8, "y": 7}, "is_angle_degrees": 319.17711633077585},
        {"position": {"x": -7, "y": 6}, "is_angle_degrees": 319.6844862515901},
        {"position": {"x": -6, "y": 5}, "is_angle_degrees": 320.9761443168036},
        {"position": {"x": -5, "y": 4}, "is_angle_degrees": 322.32160818440013},
        {"position": {"x": -9, "y": 7}, "is_angle_degrees": 323.3745091821434},
        {"position": {"x": -4, "y": 3}, "is_angle_degrees": 324.6282723004566},
        {"position": {"x": -7, "y": 5}, "is_angle_degrees": 325.9705370795608},
        {"position": {"x": -10, "y": 7}, "is_angle_degrees": 326.7121780628124},
        {"position": {"x": -3, "y": 2}, "is_angle_degrees": 328.0703798616976},
        {"position": {"x": -8, "y": 5}, "is_angle_degrees": 330.0148872505976},
        {"position": {"x": -5, "y": 3}, "is_angle_degrees": 331.03513199258265},
        {"position": {"x": -7, "y": 4}, "is_angle_degrees": 332.488824788327},
        {"position": {"x": -9, "y": 5}, "is_angle_degrees": 333.0381815057246},
        {"position": {"x": -2, "y": 1}, "is_angle_degrees": 335.5930077095517},
        {"position": {"x": -9, "y": 4}, "is_angle_degrees": 337.9374162397213},
        {"position": {"x": -7, "y": 3}, "is_angle_degrees": 338.511329802106},
        {"position": {"x": -5, "y": 2}, "is_angle_degrees": 339.83170410057323},
        {"position": {"x": -8, "y": 3}, "is_angle_degrees": 341.27333083970325},
        {"position": {"x": -3, "y": 1}, "is_angle_degrees": 343.19941067962753},
        {"position": {"x": -10, "y": 3}, "is_angle_degrees": 345.0162001165841},
        {"position": {"x": -7, "y": 2}, "is_angle_degrees": 345.78173034615276},
        {"position": {"x": -4, "y": 1}, "is_angle_degrees": 347.5468837690936},
        {"position": {"x": -9, "y": 2}, "is_angle_degrees": 348.7854454385997},
        {"position": {"x": -5, "y": 1}, "is_angle_degrees": 349.9166763043462},
        {"position": {"x": -6, "y": 1}, "is_angle_degrees": 351.57457222457924},
        {"position": {"x": -7, "y": 1}, "is_angle_degrees": 352.7424032196642},
        {"position": {"x": -8, "y": 1}, "is_angle_degrees": 353.60953047306907},
        {"position": {"x": -9, "y": 1}, "is_angle_degrees": 354.15608220452185},
        {"position": {"x": -10, "y": 1}, "is_angle_degrees": 354.6625599088827}
      ],
      "cosine"
    )
  }

  export class Service extends Behaviour {
    private committed_state = observe<Service.State>(null).equality((a, b) => a?.angle == b?.angle && a?.state == b?.state)

    last_read: CompassReader.AngleResult = null

    initialization: AsyncInitialization<{ finder: Finder<CapturedCompass> }>

    constructor(
      private capturing_service: ScreenCaptureService,
      private matched_ui: CapturedCompass,
      private show_overlay: boolean,
      private disable_calibration: boolean = false,
      private refind_after_close: boolean = false
    ) {
      super();

      this.initialization = async_init(async () => {
        return {
          finder: await CapturedCompass.finder.get()
        }
      })
    }

    private overlay: OverlayGeometry = new OverlayGeometry()

    private tick_counter = 0
    private last_ticks: Record<AngleResult["type"], number> = {
      success: -2,
      likely_closed: -2,
      likely_solved: -2,
      likely_concealed: -2,
    }

    protected begin() {

      this.lifetime_manager.bind(
        this.capturing_service.subscribe({
          options: time => {
            return {
              interval: CaptureInterval.fromApproximateInterval(50),
              area: this.matched_ui ? this.matched_ui.body.screen_rectangle : null
            }
          },
          handle: value => {
            this.tick(value.value)
          }
        }))
    }

    protected end() {
      this.overlay?.clear()?.render()
    }

    private closed() {
      this.committed_state.set({angle: null, state: "closed"})

      if (this.refind_after_close) this.matched_ui = null
    }

    private previous_state: {
      since: number,
      last_confirmed: number,
      state: CompassReader.AngleResult
    } = null

    private buffered_state: {
      since: number,
      last_confirmed: number,
      state: CompassReader.AngleResult
    } = null

    private last_stationary_tick: number = -1

    tick(img: CapturedImage): void {
      if (!this.initialization.isInitialized() || !this.isActive()) return

      const finder = this.initialization.get().finder

      const tick = this.tick_counter++

      if (this.refind_after_close && !this.matched_ui) {
        this.matched_ui = finder.find(img)
      }

      if (!this.matched_ui) return

      const reader = new CompassReader(this.matched_ui.recapture(img), this.disable_calibration)

      this.overlay.clear()

      {
        const read = this.last_read = reader.getAngle()
        const now = Date.now()

        if (lodash.isEqual(this.buffered_state?.state, read)) {
          this.buffered_state.last_confirmed = now
        } else {
          this.previous_state = this.buffered_state

          this.buffered_state = {
            since: now,
            last_confirmed: now,
            state: read
          }
        }
      }

      const state = this.buffered_state.state
      const state_active_time = this.buffered_state.last_confirmed - this.buffered_state.since

      if (state.type == "likely_concealed" || state.type == "likely_closed") log().log(`${state.type}: ${state.details}`, "Compass Reader")

      const BUFFER_CONFIRMATION_TIME = 200

      const was_ever_solved = this.last_ticks["likely_solved"] >= 0

      if (state.type == "likely_closed" && (state_active_time > BUFFER_CONFIRMATION_TIME || was_ever_solved)) this.closed()
      else if (state.type == "likely_concealed" && (state_active_time > 5000 || was_ever_solved)) this.closed()
      else if (state.type == "likely_concealed" || state.type == "likely_closed") {
        this.overlay.text("Concealed",
          Vector2.add(ScreenRectangle.center(reader.capture.body.screenRectangle()), {x: 5, y: 100}), {
            shadow: true,
            centered: true,
            width: 12,
            color: Alt1Color.fromHex("#808080")
          })
      } else if (state.type == "likely_solved") {

        this.overlay.rect2(
          ScreenRectangle.move(
            reader.capture.body.screenRectangle(),
            {x: 59, y: 172},
            {x: 55, y: 52}
          ), {
            width: 2,
            color: Alt1Color.green,
          }
        )

        this.overlay.text("Solved",
          Vector2.add(ScreenRectangle.center(reader.capture.body.screenRectangle()), {x: 5, y: 100}), {
            shadow: true,
            centered: true,
            width: 12,
            color: Alt1Color.green,
          })

        this.committed_state.set({angle: null, state: "solved"})
      } else if (state.type == "success") {
        if (state_active_time > 0.1) {
          this.last_stationary_tick = tick

          // When coming from a spinning compass, we require a longer stationary period.
          // The reasoning is to mitigate certain kinds of lag spikes, for example when coming from dorgesh khaan
          const required_stationary_time = this.committed_state.value()?.state == "spinning" ? 200 : 100

          if (state_active_time > required_stationary_time) {
            this.committed_state.set({
              angle: state.angle,
              state: "normal",
            })
          }
        } else if (this.previous_state?.state.type == "success" && tick - this.last_stationary_tick > 2) {
          this.committed_state.set({
            angle: null,
            state: "spinning"
          })
        }
      }

      this.last_ticks[state.type] = tick

      if (this.committed_state.value()) {
        let text: string = null

        const state = this.committed_state.value()

        if (state.state == "spinning") {
          text = "Spinning"
        } else if (state.angle != null) {
          text = `${radiansToDegrees(state.angle).toFixed(this.disable_calibration ? 3 : 1)}°`
        }

        if (text) {
          this.overlay.text(text,
            Vector2.add(ScreenRectangle.center(reader.capture.body.screenRectangle()), {x: 5, y: 8}), {
              shadow: true,
              centered: true,
              width: 15,
              color: Alt1Color.white
            })
        }
      }

      if (this.show_overlay) this.overlay.render()
    }

    onChange(handler: (new_value: Service.State, old: Service.State) => any, handler_f?: (_: EwentHandler<any>) => void): this {
      this.committed_state.subscribe(handler, false, handler_f)

      return this
    }

    state(): Service.State {
      return this.committed_state.value()
    }
  }

  export namespace Service {
    export type State = {
      angle: number,
      state: "normal" | "solved" | "spinning" | "closed"
    }
  }

  export type CalibrationMode = keyof typeof calibration_tables

  export class CalibrationTool extends NisModal {
    samples: AngularKeyframeFunction.Sample[] = []
    private reader: Service
    private layer: CalibrationTool.Layer

    handler: Alt1MainHotkeyEvent.Handler

    expected: Widget

    constructor(samples: AngularKeyframeFunction.Sample[] = []) {
      super({
        size: "fullscreen",
        fixed: true,
        disable_close_button: false
      });

      this.samples = lodash.cloneDeep(samples)

      this.handler = Alt1.instance().main_hotkey.subscribe(0, (e) => {
        this.commit()
      })

      this.hidden.on(() => {
        this.reader.stop()
        this.handler.remove()
      })

      this.reader = new Service(deps().app.capture_service, null, true, true, true).start()
    }

    delete() {
      const entry_index = this.samples.findIndex(s => Vector2.eq(s.position, this.layer.offset))

      this.samples.splice(entry_index, 1)

      this.layer.updateTileOverlays()
    }

    commit() {
      const state = this.reader.state()

      if (state.state == "normal") {

        const entry = this.samples.find(s => Vector2.eq(s.position, this.layer.offset))

        if (entry) {
          entry.is_angle_degrees = radiansToDegrees(state.angle)
        } else {
          this.samples.push({position: this.layer.offset, is_angle_degrees: radiansToDegrees(state.angle)})

          lodash.sortBy(this.samples, s => getExpectedAngle(s.position, {x: 0, y: 0}))
        }

        this.autoNextSpot()
      }
    }

    autoNextSpot() {
      const test = (offset: Vector2): boolean => {
        const gcd = greatestCommonDivisor(offset.x, offset.y)

        if (gcd > 1) return false

        const entry = this.samples.find(s => Vector2.eq(s.position, offset))

        if (entry) return false

        this.layer.setOffset(offset)

        return true
      }

      if (test({x: 1, y: 0})) return
      if (test({x: 0, y: 1})) return
      if (test({x: -1, y: 0})) return
      if (test({x: 0, y: -1})) return

      for (let d = 3; d <= 15; d++) {
        const iterations = Math.pow(2, d)

        const limit = Math.sqrt(iterations)

        for (let i = 1; i < iterations; i++) {
          const angle = i * (Math.PI * 2) / iterations

          function farey(limit: number, R: number): Vector2 {
            if (R > 1) {
              const res = farey(limit, 1 / R)

              return {
                x: res.y,
                y: res.x
              }
            }

            let lower: Vector2 = {y: 0, x: 1}
            let higher: Vector2 = {y: 1, x: 1}

            while (true) {
              let c = Vector2.add(lower, higher) // interestingly c is already in reduced form

              // if the numbers are too big, return the closest of a and b
              if (c.x > limit || c.y > limit) {
                if (R - lower.y / lower.x < higher.y / higher.x - R) return lower
                else return higher
              }

              // adjust the interval:
              if (c.y / c.x < R) lower = c
              else higher = c
            }
          }

          const v = farey(limit, Math.abs(Math.sin(angle)) / Math.abs(Math.cos(angle)))

          if (angle > Math.PI / 2 && angle < 3 * Math.PI / 2) v.x *= -1
          if (angle > Math.PI) v.y *= -1

          if (test(v)) {
            console.log(`D: ${d}`)
            return
          }
        }
      }
    }

    render() {
      super.render();

      this.body.css("display", "flex")
        .css("flex-direction", "column")

      const map = new GameMapMiniWidget()
        .css2({
          "width": "100%",
          "height": "500px"
        })
        .appendTo(this.body)

      setTimeout(() => map.map.invalidateSize(), 1000)

      this.expected = c().appendTo(this.body)

      new ButtonRow().buttons(
          new LightButton("Auto")
            .onClick(() => this.autoNextSpot()),
          new LightButton("Commit")
            .onClick(() => this.commit()),
          new LightButton("Delete")
            .onClick(() => this.delete())
        )
        .appendTo(this.body)

      new ButtonRow().buttons(
        new LightButton("Import").onClick(async () => {
          this.samples = (await new ImportStringModal(input => {
            return JSON.parse(input)
          }).do()).imported
          this.autoNextSpot()
        }),
        new LightButton("Export JSON").onClick(() => {
          new ExportStringModal(
            "[\n" +
            lodash.sortBy(this.samples, s => Vector2.angle(ANGLE_REFERENCE_VECTOR, {x: -s.position.x, y: -s.position.y})).map(s => cleanedJSON(s, undefined)).join(",\n")
            + "\n]"
          ).show()
        }),
        new LightButton("Export CSV").onClick(() => {
          new ExportStringModal(AngularKeyframeFunction.fromCalibrationSamples(this.samples, "cosine").getCSV()).show()
        }),
      ).appendTo(this.body)

      map.map.addGameLayer(this.layer = new CalibrationTool.Layer(this))

      this.autoNextSpot()
    }
  }

  export namespace CalibrationTool {
    import gielinor_compass = clue_data.gielinor_compass;
    import Sample = AngularKeyframeFunction.Sample;

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
      offset: Vector2 = {x: -1, y: 1}
      existing_sample: Sample = null

      constructor(public tool: CalibrationTool) {
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

            this.setOffset(Vector2.scale(1 / gcd, off))
          }
        })
      }

      setOffset(offset: Vector2) {
        this.offset = offset

        this.existing_sample = this.tool.samples.find(s => Vector2.eq(s.position, offset))

        if (this.existing_sample) {
          this.tool.expected.text(`Selected: ${offset.x}|${offset.y} Expected: ${radiansToDegrees(normalizeAngle(Math.atan2(-offset.y, -offset.x))).toFixed(3)}°, Sample: ${this.existing_sample.is_angle_degrees.toFixed(3)}°`)
        } else {
          this.tool.expected.text(`Selected: ${offset.x}|${offset.y} Expected: ${radiansToDegrees(normalizeAngle(Math.atan2(-offset.y, -offset.x))).toFixed(3)}°`)
        }

        this.updateTileOverlays()
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

        this.overlay = leaflet.featureGroup().addTo(this)

        this.tool.samples.forEach((sample, i) => {
          const polygon = tilePolygon(Vector2.add(this.reference, sample.position)).setStyle({
            color: "#06ffea",
            fillOpacity: 0.4,
            stroke: false
          }).addTo(this.overlay)
        })

        leaflet.polygon(this.tool.samples.map(s => Vector2.toLatLong(Vector2.add(this.reference, s.position))))
          .setStyle({
            color: "blue"
          })
          .addTo(this.overlay)

        for (let i = 1; i <= 100; i++) {
          const polygon = tilePolygon(Vector2.add(this.reference, Vector2.scale(i, this.offset))).addTo(this.overlay)

          if (this.existing_sample) {
            polygon.setStyle({
              color: "orange"
            })
          }
        }

        this.overlay.addTo(this)
      }
    }
  }
}