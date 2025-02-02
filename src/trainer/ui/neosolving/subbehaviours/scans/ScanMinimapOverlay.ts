import {AbstractCaptureService, CaptureInterval} from "../../../../../lib/alt1/capture";
import {MinimapReader} from "../../../../../lib/alt1/readers/MinimapReader";
import {Observable} from "../../../../../lib/reactive";
import {deps} from "../../../../dependencies";
import {Transform, Vector2} from "../../../../../lib/math";
import {ScanSolving} from "./ScanSolving";
import {Alt1Overlay} from "../../../../../lib/alt1/overlay/Alt1Overlay";
import {Alt1OverlayDrawCalls} from "../../../../../lib/alt1/overlay/Alt1OverlayDrawCalls";

export class ScanMinimapOverlay extends Alt1Overlay {
  private minimap_interest: AbstractCaptureService.InterestToken<AbstractCaptureService.Options, MinimapReader.CapturedMinimap>
  private range: number = 10

  constructor(private minimapreader: MinimapReader,
              private settings: Observable<ScanSolving.Settings>,
              private role: "scantree" | "manual") {
    super()
  }

  protected begin() {
    if (!deps().app.in_alt1) return

    this.lifetime_manager.bind(
      this.minimap_interest = this.minimapreader.subscribe({
        options: (time: AbstractCaptureService.CaptureTime) => ({
          interval: CaptureInterval.fromApproximateInterval(100),
          refind_interval: CaptureInterval.fromApproximateInterval(10_000)
        }),
        handle: (value: AbstractCaptureService.TimedValue<MinimapReader.CapturedMinimap>) => {
          this.rerender()
        }
      }),
    )
  }

  protected end() {
    if (!deps().app.in_alt1) return
  }

  override renderWithBuilder(overlay: Alt1OverlayDrawCalls.GeometryBuilder) {
    const value = this.minimap_interest.lastNotification()
    const minimap = value.value
    const settings = this.settings.value()

    if (value.value
      && ((this.role == "scantree" && settings.show_minimap_overlay_scantree) || (this.role == "manual" && settings.show_minimap_overlay_simple)
      )) {
      ScanMinimapOverlay.last_known_ppt =
        settings.minimap_overlay_automated_zoom_detection
          ? value.value.pixelPerTile() ?? ScanMinimapOverlay.last_known_ppt
          : settings.minimap_overlay_zoom_manual_ppt

      // If there's no known pixels per tile value, abort
      if (ScanMinimapOverlay.last_known_ppt == null) return

      const unit_square: Vector2[] = [
        {x: 1, y: 1},
        {x: 1, y: -1},
        {x: -1, y: -1},
        {x: -1, y: 1},
      ]

      if (settings.show_triple_ping) {
        const scale = ((this.range * 2 + 1) / 2) * ScanMinimapOverlay.last_known_ppt

        const transform =
          Transform.chain(
            Transform.translation(minimap.center()),
            Transform.rotationRadians(-minimap.compassAngle.get()),
            Transform.scale({x: scale, y: scale}),
          )

        overlay.polyline(
          unit_square.map(v => Vector2.transform_point(v, transform)),
          true, {
            color: ScanSolving.PulseColors.triple
          }
        )
      }

      if (settings.show_double_ping) {
        const scale = ((this.range * 4 + 1) / 2) * ScanMinimapOverlay.last_known_ppt

        const transform2 = Transform.chain(
          Transform.translation(minimap.center()),
          Transform.rotationRadians(-minimap.compassAngle.get()),
          Transform.scale({x: scale, y: scale}),
        )

        overlay.polyline(
          unit_square.map(v => Vector2.transform_point(v, transform2)),
          true, {
            color: ScanSolving.PulseColors.double
          }
        )
      }
    }
  }

  setRange(range: number): this {
    this.range = range
    return this
  }
}

export namespace ScanMinimapOverlay {
  export let last_known_ppt: number = 4 // Assume mimimum minimap zoom by default
}