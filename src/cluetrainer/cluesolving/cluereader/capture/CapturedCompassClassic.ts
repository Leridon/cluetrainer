import {CapturedImage, NeedleImage} from "../../../../lib/alt1/capture";
import {async_lazy, Lazy, lazy} from "../../../../lib/Lazy";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import {util} from "../../../../lib/util/util";
import {Rectangle, Vector2} from "../../../../lib/math";
import {Finder} from "../../../../lib/alt1/capture/Finder";
import lodash from "lodash";
import {Angles} from "../../../../lib/math/Angles";
import {CompassCalibrationFunction} from "./CompassCalibrationFunction";
import {CompassReader} from "../CompassReader";
import {Compasses} from "../../../cluetheory/Compasses";
import {Log} from "../../../../lib/util/Log";
import {ImageDetect} from "alt1";
import rgbSimilarity = util.rgbSimilarity;
import sampleImage = util.sampleImage;
import ANGLE_REFERENCE_VECTOR = Compasses.ANGLE_REFERENCE_VECTOR;
import log = Log.log;
import AntialiasingType = CompassReader.AntialiasingType;
import {CapturedCompass} from "./CapturedCompass";

export class CapturedCompassClassic implements CapturedCompass {
  private readonly anchor_area: CapturedImage
  private readonly arc_line: CapturedImage
  public readonly compass_area: CapturedImage

  constructor(public readonly body: CapturedImage,
              public readonly finder: CapturedCompassClassic.CompassFinder,
              private readonly calibration_functions: (_: AntialiasingType) => CompassCalibrationFunction = typ => CompassReader.calibration_tables[typ]
  ) {
    body.setName("compass")

    this.arc_line = body.getSubSection({
      origin: {x: 34, y: 235},
      size: {x: 112, y: 1},
    }).setName("arc line")

    this.compass_area = body.getSubSection(CapturedCompassClassic.ARROW_RECT_FROM_BODY).setName("compass body")
    this.anchor_area = body.getSubSection({
      origin: Vector2.neg(CapturedCompassClassic.origin_offset_from_anchor),
      size: finder.anchor.size()
    })
  }

  recapture(img: CapturedImage): CapturedCompassClassic {
    return new CapturedCompassClassic(this.body.recapture(img), this.finder, this.calibration_functions)
  }

  withCalibrationFunctions(calibration_functions: (_: AntialiasingType) => CompassCalibrationFunction): CapturedCompassClassic {
    return new CapturedCompassClassic(this.body, this.finder, calibration_functions)
  }

  private _angle: Lazy<CompassReader.AngleResult> = lazy((): CompassReader.AngleResult => {
    const CENTER_OFFSET = {x: CapturedCompassClassic.TOTAL_COMPASS_RADIUS, y: CapturedCompassClassic.TOTAL_COMPASS_RADIUS}

    const buf = this.compass_area.getData()

    const buf_center = {
      x: ~~(buf.width / 2),
      y: ~~(buf.height / 2)
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
      CompassReader.debug_overlay?.setGeometry(
        this.compass_area.debugOverlay2().buffer()
      )
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
      const [r, g, b, _] = buf.getPixel(CENTER_OFFSET.x + coords.x, CENTER_OFFSET.y + coords.y)

      return [r, g, b].every(c => c >= 70 && c < 110)
    })) return {type: "likely_solved", fingerprint: undefined}

    const rectangle_samples: Vector2[] = []
    let antialiasing_detected: boolean = false

    const scan_map: boolean[][] = new Array(buf.width).fill(null).map(() => new Array(buf.width).fill(false))

    function visitNew(x: number, y: number): boolean {
      scan_map[y][x] = true // Mark as seen

      if (!isArrow(x, y)) {
        if (!antialiasing_detected && Vector2.max_axis(Vector2.sub(buf_center, {x, y})) < 15 && buf.getColorDifference(x, y, 0, 0, 0) < 250) antialiasing_detected = true

        return false // Not an arrow pixel, don't follow up
      }

      rectangle_samples.push({x, y})

      return true
    }

    function visit(x: number, y: number): boolean {
      if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) return false // Out of bounds
      if (scan_map[y][x]) return false // Already seen

      return visitNew(x, y)
    }

    function floodFillScanDFS(x: number, y: number) {
      if (!visit(x, y)) return

      floodFillScanDFS(x - 1, y - 1)
      floodFillScanDFS(x - 1, y)
      floodFillScanDFS(x - 1, y + 1)
      floodFillScanDFS(x, y - 1)
      floodFillScanDFS(x, y + 1)
      floodFillScanDFS(x + 1, y - 1)
      floodFillScanDFS(x + 1, y)
      floodFillScanDFS(x + 1, y + 1)
    }

    function floodFillScanDFSLine(x: number, y: number): [number, number] {
      function visitLine(x: number, y: number): [number, number] {
        if (!visit(x, y)) return null

        let min_x: number = x - 1
        let max_x: number = x + 1

        while (min_x >= 0 && visitNew(min_x, y)) min_x--
        while (max_x < buf.width && visitNew(max_x, y)) max_x++

        return [min_x + 1, max_x - 1]
      }

      const line = visitLine(x, y)

      if (!line) return

      const [min_x, max_x] = line

      for (let x = min_x - 1; x <= max_x + 1; x++) {
        const child_line = floodFillScanDFSLine(x, y + 1)

        if (child_line) x = child_line[1] + 1
      }

      for (let x = min_x - 1; x <= max_x + 1; x++) {
        const child_line = floodFillScanDFSLine(x, y - 1)

        if (child_line) x = child_line[1] + 1
      }

      return line
    }

    function floodFillScanBFS(x: number, y: number) {
      const queue = []

      function push(x: number, y: number) {
        if (visit(x, y)) queue.push([x, y]) // Push to queue
      }

      push(x, y)

      let i = 0

      while (i < queue.length) {
        const [x, y] = queue[i++]

        push(x - 1, y - 1)
        push(x - 1, y)
        push(x - 1, y + 1)
        push(x, y - 1)
        push(x, y + 1)
        push(x + 1, y - 1)
        push(x + 1, y)
        push(x + 1, y + 1)
      }
    }

    function simpleScan() {
      for (let y = 0; y < buf.height; y++) {
        for (let x = 0; x < buf.width; x++) {
          if (isArrow(x, y)) {
            rectangle_samples.push({x, y})
          }
        }
      }
    }

    // Gather all black pixels
    floodFillScanDFSLine(buf_center.x, buf_center.y)
    //profile(() => simpleScan(), "Flood fill")

    const fingerprint: CompassReader.ReadFingerprint = {
      pixel_count: rectangle_samples.length,
      compass_size: rectangle_samples.length > 0 ? Rectangle.size(Rectangle.from(...rectangle_samples)) : undefined,
      antialiasing: antialiasing_detected
    }

    if (rectangle_samples.length < 400) {
      // TODO: This would be neater with findSubimage, but that results in a weird bug
      if (ImageDetect.simpleCompare(this.anchor_area.getData(), this.finder.anchor.underlying, 0, 0) < 100) {
        return {
          type: "likely_concealed",
          fingerprint: fingerprint,
          details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample.`
        }
      }

      return {
        type: "likely_closed",
        fingerprint: fingerprint,
        details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample.`
      }
    }

    if (antialiasing_detected) {

      if (rectangle_samples.length < 1700) return {
        type: "likely_concealed",
        fingerprint: fingerprint,
        details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample. [MSAA]`
      }
      if (rectangle_samples.length > 2300) return {
        type: "likely_concealed",
        fingerprint: fingerprint,
        details: `Too many pixels (${rectangle_samples.length}) sampled for the rectangle sample. [MSAA]`
      }
    } else {
      if (rectangle_samples.length < 2175) return {
        type: "likely_concealed",
        fingerprint: fingerprint,
        details: `Not enough pixels (${rectangle_samples.length}) sampled for the rectangle sample.`
      }
      if (rectangle_samples.length > 2275) return {
        type: "likely_concealed",
        fingerprint: fingerprint,
        details: `Too many pixels (${rectangle_samples.length}) sampled for the rectangle sample.`
      }
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

      if (Angles.angleDifference(angle, initial_angle) > Math.PI / 2)
        angle = Angles.normalizeAngle(angle - Math.PI)

      return {
        angle: angle,
        weight: Vector2.lengthSquared(vector)
      }
    })

    const angle_after_rectangle_sample = Angles.normalizeAngle(Math.atan2(
      lodash.sum(angle_samples.map(a => a.weight * Math.sin(a.angle))),
      lodash.sum(angle_samples.map(a => a.weight * Math.cos(a.angle))),
    ))


    const calibration_mode: CompassReader.AntialiasingType = antialiasing_detected ? "msaa" : "off"

    const calibration_function = CompassReader.DISABLE_CALIBRATION
      ? CompassCalibrationFunction.none
      : CompassReader.calibration_tables?.[calibration_mode] ?? CompassCalibrationFunction.none

    const final_angle = calibration_function.apply(angle_after_rectangle_sample)

    if (CompassReader.DEBUG_COMPASS_READER) {
      log().log(`Angle: ${Angles.toString(initial_angle, 3)} (CoM), ${Angles.toString(angle_after_rectangle_sample, 3)} (rect), ${Angles.UncertainAngle.toString(final_angle, 3)} (final)`,
        "Compass Reader"
      )
    }

    return {
      type: "success",
      fingerprint: fingerprint,
      angle: final_angle,
      raw_angle: angle_after_rectangle_sample
    }
  })

  getAngle(): CompassReader.AngleResult {
    return this._angle.get()
  }

  private _is_arc_lines = lazy(() => {
    const PIXEL_REQUIRED_TO_BE_CONSIDERED_ARC_COMPASS = 5
    const buf = this.arc_line.getData()

    const text_color: [number, number, number] = [51, 25, 0]
    let n = 0;
    for (let x = 0; x < buf.width; x++) {
      if (rgbSimilarity(text_color, sampleImage(buf, {x: x, y: 0})) > 0.9) {
        n++;
      }
    }

    return n > PIXEL_REQUIRED_TO_BE_CONSIDERED_ARC_COMPASS;
  })

  isArcCompass(): boolean {
    return this._is_arc_lines.get()
  }
}

export namespace CapturedCompassClassic {
  export class CompassFinder implements Finder<CapturedCompassClassic> {
    constructor(public readonly anchor: NeedleImage) {
    }

    /**
     * Looks for a compass in the given {@link CapturedImage} by looking for the north-indicator.
     * @param screen The image to search for a compass interface.
     */
    find(screen: CapturedImage): CapturedCompassClassic {
      const position = screen.findNeedle(this.anchor)[0]

      if (position) {
        const section = screen.getScreenSection(
          ScreenRectangle.move(
            position.screenRectangle(),
            CapturedCompassClassic.origin_offset_from_anchor,
            CapturedCompassClassic.UI_SIZE
          ),
        )

        return new CapturedCompassClassic(section, this)
      }

      return null
    }
  }

  export const finder = async_lazy(async () => {
    const anchor = await CapturedCompassClassic.anchor.get()

    return new CompassFinder(anchor)
  })

  export const anchor = async_lazy(async () => await NeedleImage.fromURL("/alt1anchors/compassnorth.png"))
  export const origin_offset_from_anchor = {x: -78, y: -20}
  export const UI_SIZE = {x: 172, y: 259}

  export const ARROW_CENTER_OFFSET_FROM_BODY_TL = {x: 89, y: 137}
  export const TOTAL_COMPASS_RADIUS: number = 85

  export const ARROW_RECT_FROM_BODY: ScreenRectangle = {
    origin: Vector2.sub(ARROW_CENTER_OFFSET_FROM_BODY_TL, {x: TOTAL_COMPASS_RADIUS, y: TOTAL_COMPASS_RADIUS}),
    size: {x: 2 * TOTAL_COMPASS_RADIUS + 1, y: 2 * TOTAL_COMPASS_RADIUS + 1}
  }

}