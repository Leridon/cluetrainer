import {SimpleScanSolving} from "./SimpleScanSolving";
import {ScanTreeSolving} from "./ScanTreeSolving";
import {util} from "../../../../../lib/util/util";
import {SettingsNormalization} from "../../../../../lib/util/SettingsNormalization";
import {ScanControlPrototype} from "./ScanInputBehaviour";

export namespace ScanSolving {

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

    select_floor_based_on_previous_solution: boolean

    input_control_configuration: ScanControlPrototype.Overlay.Config
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
      zoom_behaviour_include_triples: SettingsNormalization.bool(false),
      zoom_behaviour_include_doubles: SettingsNormalization.bool(false),
      zoom_behaviour_include_singles: SettingsNormalization.bool(false),
      select_floor_based_on_previous_solution: SettingsNormalization.bool(true),
      input_control_configuration: SettingsNormalization.normaliz<ScanControlPrototype.Overlay.Config>({
        position: SettingsNormalization.normaliz({
          x: compose(SettingsNormalization.number(0), SettingsNormalization.clamp(-2000, 2000)),
          y: compose(SettingsNormalization.number(0), SettingsNormalization.clamp(0, 2000))
        }),
        size: SettingsNormalization.normaliz({
          x: compose(SettingsNormalization.number(500), SettingsNormalization.clamp(160, 1000)),
          y: compose(SettingsNormalization.number(250), SettingsNormalization.clamp(100, 1000))
        }),
        gutter: compose(SettingsNormalization.number(5), SettingsNormalization.clamp(1, 20)),
        warn_for_meerkats: SettingsNormalization.bool(true),
        show_help_button: SettingsNormalization.bool(true),
        force_small_back_button: SettingsNormalization.bool(false),
      })
    })
  }
}