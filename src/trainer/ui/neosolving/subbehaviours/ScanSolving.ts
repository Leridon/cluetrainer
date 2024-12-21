import {SimpleScanSolving} from "./SimpleScanSolving";
import {ScanTreeSolving} from "./ScanTreeSolving";
import * as lodash from "lodash";
import Behaviour from "../../../../lib/ui/Behaviour";
import {AbstractCaptureService, CaptureInterval} from "../../../../lib/alt1/capture";
import {MinimapReader} from "../../../../lib/alt1/readers/MinimapReader";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import {Transform, Vector2} from "../../../../lib/math";
import {util} from "../../../../lib/util/util";
import {deps} from "../../../dependencies";
import {Observable} from "../../../../lib/reactive";
import {SettingsNormalization} from "../../../../lib/util/SettingsNormalization";

export namespace ScanSolving {

  import over = OverlayGeometry.over;
  import A1Color = util.A1Color;

  export class ScanMinimapOverlay extends Behaviour {
    private minimap_interest: AbstractCaptureService.InterestToken<AbstractCaptureService.Options, MinimapReader.CapturedMinimap>
    private minimap_overlay: OverlayGeometry = over()
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
            const minimap = value.value

            const settings = this.settings.value()

            this.minimap_overlay.clear()

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

                this.minimap_overlay.polyline(
                  unit_square.map(v => Vector2.transform_point(v, transform)),
                  true, {
                    color: A1Color.fromHex("#FF0000")
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

                this.minimap_overlay.polyline(
                  unit_square.map(v => Vector2.transform_point(v, transform2)),
                  true, {
                    color: A1Color.fromHex("#FFFF00")
                  }
                )
              }
            }

            this.minimap_overlay.render()
          }
        }),
      )
    }

    protected end() {
      if (!deps().app.in_alt1) return

      this.minimap_overlay?.clear()?.render()
    }

    setRange(range: number): this {
      this.range = range
      return this
    }
  }

  export namespace ScanMinimapOverlay {
    export let last_known_ppt: number = 4 // Assume mimimum minimap zoom by default
  }

  export type Simple = SimpleScanSolving
  export type ScanTree = ScanTreeSolving

  export type Settings = {
    show_minimap_overlay_scantree: boolean,
    show_minimap_overlay_simple: boolean,
    minimap_overlay_automated_zoom_detection: boolean,
    minimap_overlay_zoom_manual_ppt: number,
    show_triple_ping: boolean,
    show_double_ping: boolean,

    zoom_behaviour_include_triples: boolean
    zoom_behaviour_include_doubles: boolean
    zoom_behaviour_include_singles: boolean
  }

  export namespace Settings {
    import compose = util.compose;
    export const normalize: SettingsNormalization.NormalizationFunction<Settings> = SettingsNormalization.normaliz<Settings>({
      show_minimap_overlay_scantree: SettingsNormalization.bool(true),
      show_minimap_overlay_simple: SettingsNormalization.bool(true),
      minimap_overlay_automated_zoom_detection: SettingsNormalization.bool(false),
      minimap_overlay_zoom_manual_ppt: compose(SettingsNormalization.number(4), SettingsNormalization.clamp(3, 30)),
      show_double_ping: SettingsNormalization.bool(true),
      show_triple_ping: SettingsNormalization.bool(true),
      zoom_behaviour_include_triples: SettingsNormalization.bool(true),
      zoom_behaviour_include_doubles: SettingsNormalization.bool(false),
      zoom_behaviour_include_singles: SettingsNormalization.bool(false),
    })
  }
}