import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken, NeedleImage} from "../capture";
import {async_lazy, lazy} from "../../Lazy";
import {OverlayGeometry} from "../OverlayGeometry";
import {degreesToRadians, normalizeAngle, Vector2} from "../../math";
import {ScreenRectangle} from "../ScreenRectangle";
import * as lodash from "lodash";
import {Log} from "../../util/Log";
import {Finder} from "../capture/Finder";
import over = OverlayGeometry.over;
import log = Log.log;
import {Alt1ScreenCaptureService} from "../capture/Alt1ScreenCaptureService";
import {Alt1} from "../Alt1";

export class MinimapReader extends DerivedCaptureService<MinimapReader.Options, MinimapReader.CapturedMinimap> {

  private debug_overlay = over()
  private debug_mode: boolean = false

  private capture_interest: AbstractCaptureService.InterestToken<any, CapturedImage>
  private finder: Finder<MinimapReader.CapturedMinimap>

  private minimum_refind_interval: CaptureInterval = CaptureInterval.fromApproximateInterval(10_000)

  private _initialized: Promise<any>

  private constructor(private capture_service: Alt1ScreenCaptureService) {
    super()

    this._initialized = (async () => {
      this.finder = await MinimapReader.CapturedMinimap.finder.get()

      this.capture_interest = this.addDataSource(capture_service, (time, child_options) => {

        if (!this.raw_last_capture?.value || child_options.some(o => o.refind_interval?.matches(time)) || this.minimum_refind_interval.matches(time)) {
          // Do a full capture to refind
          return {interval: null, area: null}
        } else {
          return {interval: null, area: this.raw_last_capture?.value.body.screen_rectangle}
        }
      })
    })()
  }

  processNotifications(interested_tokens: InterestedToken<AbstractCaptureService.Options, MinimapReader.CapturedMinimap>[]): MinimapReader.CapturedMinimap {
    const capture = this.capture_interest.lastNotification().value

    try {

      if (capture.isFullScreen()) {
        const capturedMinimap = this.finder.find(capture)

        if (this.debug_mode) {
          this.debug_overlay.clear()

          if (capturedMinimap) {
            capturedMinimap.debugOverlay(this.debug_overlay)
          }

          this.debug_overlay.render()
        }

        return capturedMinimap
      } else {
        return this.raw_last_capture.value.refind(capture)
      }

    } catch (e) {
      log().log(e)
    }
  }

  public initialized(): Promise<any> {
    return this._initialized
  }

  stop() {
    this.capture_interest.revoke()
  }

  setDebugEnabled(debug: boolean = true): this {
    this.debug_mode = debug

    return this
  }

  static readonly _instance = lazy(() => new MinimapReader(Alt1.instance().capturing))

  static instance(): MinimapReader {
    return MinimapReader._instance.get()
  }
}

export namespace MinimapReader {
  export type Options = AbstractCaptureService.Options & {
    refind_interval: CaptureInterval
  }

  export class CapturedMinimap {
    private compass: CapturedImage
    private energy: CapturedImage
    private lodestone: CapturedImage
    private worldmap: CapturedImage
    private midpoint: CapturedImage

    constructor(public readonly body: CapturedImage) {
      this.compass = body.getSubSection({
        origin: {x: 5, y: 6},
        size: {x: 34, y: 34}
      }).setName("Compass")

      this.energy = body.getSubSection({
        origin: {x: body.size.x - 40, y: 7},
        size: {x: 34, y: 34}
      }).setName("Run")

      this.lodestone = body.getSubSection({
        origin: {x: 11, y: body.size.y - 38},
        size: {x: 26, y: 26}
      }).setName("Lodestone")

      this.worldmap = body.getSubSection({
        origin: {x: body.size.x - 36, y: body.size.y - 37},
        size: {x: 26, y: 26}
      }).setName("Map")

      this.midpoint = body.getSubSection({
        origin: {x: ~~(body.size.x / 2) - 8, y: ~~(body.size.y / 2) - 8},
        size: {x: 16, y: 16}
      }).setName("Map")
    }

    debugOverlay(overlay: OverlayGeometry = new OverlayGeometry()): OverlayGeometry {
      this.body.debugOverlay(overlay)
      this.compass.debugOverlay(overlay)
      this.energy.debugOverlay(overlay)
      this.lodestone.debugOverlay(overlay)
      this.worldmap.debugOverlay(overlay)

      return overlay
    }

    center(): Vector2 {
      return ScreenRectangle.center(this.body.screen_rectangle)
    }

    refind(capture: CapturedImage): CapturedMinimap {
      return new CapturedMinimap(capture.getScreenSection(this.body.screen_rectangle))
    }

    public readonly compassAngle = lazy(() => {
      const buf = this.compass.getData()

      const angle_samples: number[] = []

      const r = 11;

      const center: Vector2 = {x: 17, y: 17}
      const real_center: Vector2 = {x: 16.5, y: 16.5}

      for (let x = center.x - r; x <= center.x + r; x++) {
        for (let y = center.y - r; y <= center.y + r; y++) {
          const v = Vector2.sub({x, y}, real_center)

          const length_squared = Vector2.lengthSquared(v)

          if (length_squared > r * r || length_squared < 8 * 8) continue;

          const i = 4 * x + 4 * buf.width * y;

          if (buf.data[i] > (buf.data[i + 1] + buf.data[i + 2])) {
            angle_samples.push(Vector2.angle({x: 1, y: 0}, Vector2.mul({x: 1, y: -1}, Vector2.normalize(v))))
          }
        }
      }

      const CALIBRATION = degreesToRadians(1.544740919)

      const average_angle = normalizeAngle(Math.atan2(
        lodash.sum(angle_samples.map(a => Math.sin(a))),
        lodash.sum(angle_samples.map(a => Math.cos(a))),
      ))

      return average_angle + CALIBRATION
    })

    public readonly scale = lazy(() => {
      const scan = this.midpoint.getData()

      function isWhite(pixel: [number, number, number, number]): boolean {
        return pixel[0] == 255 && pixel[1] == 255 && pixel[2] == 255
      }

      const square_width = (() => {
        // We record the maximum number of consecutive white pixels per row and the respective end x-coordinate.
        // This array contains an array of end coordinates per possible length.
        let counts: number[][] = new Array(scan.width + 1).fill(null).map(() => [])

        for (let y = 0; y < scan.height; y++) {
          let max_count = 0
          let max_count_end = 0
          let count = 0

          for (let x = 0; x < scan.width; x++) {
            const pixel = (scan.getPixel(x, y))

            if (isWhite(pixel)) count++
            else {
              if (count > max_count) {
                max_count = count
                max_count_end = x
              }

              count = 0
            }
          }

          if (count > max_count) {
            max_count = count
            max_count_end = scan.width
          }

          counts[max_count].push(max_count_end)
        }

        // If there's any row that's completely white, this can't be a valid read and is discarded
        if (counts[counts.length - 1].length > 0) return null

        for (let i = 3; i <= 10; i++) {
          const delta = counts[i].length - i

          if ((delta == 0 || delta == 1) && counts[i].every(e => e == counts[i][0])) return counts[i].length
        }

        return null
      })()

      // Invalid reads are discarded
      if (square_width == null || square_width > 11 || square_width < 3) return null

      // Scaling is nonlinear.
      // Count = 10 -> 26 ppt   (scale = 6.5)
      // Count = 5 -> 9 ppt     (scale = 1.375)
      // Count = 4 -> 5.5 ppt     (scale = 1.375)
      // Count = 3 -> 4 ppt     (scale = 1)

      if (square_width >= 10) return square_width / 3 + (square_width - 3) * 0.75
      else return [
        1, 1, 1, 1, 1.375, 2.25, 3, 3.875, 4.375, 5.25
      ][square_width]
    })

    pixelPerTile(): number {
      const scale = this.scale.get()

      if (scale == null) return null

      return scale * 4
    }
  }

  export namespace CapturedMinimap {
    export const finder = async_lazy<Finder<CapturedMinimap>>(async () => {
      const imgs = await CapturedMinimap.anchors.get()

      return new class implements Finder<CapturedMinimap> {

        find(img: CapturedImage): CapturedMinimap {

          const homeport = img.findNeedle(imgs.homeport)[0];

          if (!homeport) return null

          const bottom_left = Vector2.add(homeport.screen_rectangle.origin, {x: -17, y: 32})

          const MINIMAL_DISTANCE = {x: 73, y: 45}

          const energy_search_area = img.getSubSection(
            {
              origin: {x: homeport.screen_rectangle.origin.x + MINIMAL_DISTANCE.x, y: 0},
              size: {x: img.size.x - (homeport.screen_rectangle.origin.x + MINIMAL_DISTANCE.x), y: homeport.screen_rectangle.origin.y - MINIMAL_DISTANCE.y},
            }
          )

          const top_right = (() => {
            const energies: { needle: NeedleImage, offset: Vector2 }[] = [
              {needle: imgs.botrun, offset: {x: 34, y: -29}},
              //{needle: imgs.toprun, offset: {x: 34, y: -9}},
              {needle: imgs.botwalk, offset: {x: 34, y: -29}},
              //{needle: imgs.topwalk, offset: {x: 34, y: -9}},
            ];

            for (const energy of energies) {
              const results = energy_search_area.findNeedle(energy.needle)

              if (results.length > 0) return Vector2.add(results[0].screen_rectangle.origin, energy.offset)
            }

            return null
          })()

          if (!top_right) {
            return null
          }

          return new CapturedMinimap(img.getSubSection(
            ScreenRectangle.fromPixels(
              bottom_left,
              top_right,
            )).setName("Minimap"))
        }
      }
    })

    export const anchors = async_lazy(async () => {
      return {
        botrun: await NeedleImage.fromURL("alt1anchors/minimap/botrun.png"),
        botwalk: await NeedleImage.fromURL("alt1anchors/minimap/botwalk.png"),
        homeport: await NeedleImage.fromURL("alt1anchors/minimap/homeport.png"),
        toprun: await NeedleImage.fromURL("alt1anchors/minimap/toprun.png"),
        topwalk: await NeedleImage.fromURL("alt1anchors/minimap/topwalk.png"),
      }
    })
  }
}