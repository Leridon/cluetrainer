import Behaviour from "../../../../../lib/ui/Behaviour";
import {Vector2} from "../../../../../lib/math";
import {ewent, observe} from "../../../../../lib/reactive";
import {ScanCaptureService} from "./ScanPanelReader";
import {Circle} from "../../../../../lib/math/Circle";
import {ScanTree} from "../../../../../lib/cluetheory/scans/ScanTree";
import {Scans} from "../../../../../lib/runescape/clues/scans";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import {Alt1Color} from "../../../../../lib/alt1/Alt1Color";
import lodash from "lodash";
import {deps} from "../../../../dependencies";
import {Alt1} from "../../../../../lib/alt1/Alt1";
import {ClueTrainerWiki} from "../../../../wiki";
import {ScanSolving} from "./ScanSolving";
import {Alt1Overlay} from "../../../../../lib/alt1/overlay/Alt1Overlay";
import {Alt1OverlayButton} from "../../../../../lib/alt1/overlay/Alt1OverlayButton";
import {Alt1OverlayDrawCalls} from "../../../../../lib/alt1/overlay/Alt1OverlayDrawCalls";
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;

export class ScanControlPrototype extends Behaviour {
  private overlay: ScanControlPrototype.Overlay

  constructor(
    private panel_reader: ScanCaptureService) {
    super();

    if (deps().app.settings.settings.solving.scans.input_control_enabled) {
      this.overlay = this.withSub(new ScanControlPrototype.Overlay(deps().app.settings.settings.solving.scans.input_control_configuration))

      panel_reader.onStateChange(s => this.overlay.setScanPanelState(s))
    }

    this.overlay.setScanPanelState(this.panel_reader.getState())
  }

  setActiveNode(node: AugmentedScanTreeNode) {
    this.overlay.setNode(node)
  }

  protected begin() {
  }

  protected end() {
  }

  onNodeSelection(f: (_: AugmentedScanTreeNode) => void) {
    this.overlay.node_selection.on(f)
  }
}

export namespace ScanControlPrototype {
  import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;
  import Pulse = Scans.Pulse;
  import SimplifiedPulseForContext = Scans.Pulse.SimplifiedPulseForContext;

  export class Overlay extends Alt1Overlay {
    public single: Circle = null
    public double: Circle = null

    private node: AugmentedScanTreeNode = null
    private panel_state: ScanCaptureService.ScanState = null

    public node_selection = ewent<AugmentedScanTreeNode>()

    constructor(private config: Overlay.Config) {
      super();

      this.createButtons()
    }

    private createButtons() {
      const all_options: Pulse[][] = [
        [
          {pulse: 1, different_level: false},
          {pulse: 2, different_level: false},
          {pulse: 3, different_level: false}
        ],
        [
          {pulse: 1, different_level: true},
          {pulse: 2, different_level: true},
          {pulse: 3, different_level: true}
        ]
      ]

      this.pulse_buttons = all_options.map(r => r.map(p => new Overlay.PulseButton(p)))

      this.pulse_buttons.flat().forEach(b => b
        .interactivity().main_hotkey_pressed.on(() => this.node_selection.trigger(determineChild(this.node, b.pulse))))

      this.back_button = new Alt1OverlayButton(
        null, {
          style: {
            stroke: {width: 1, color: Alt1Color.white},
            constrast: {width: 1, color: Alt1Color.black},
            font: {
              width: 16,
              color: Alt1Color.white,
              centered: true
            }
          },
          active_style: {
            stroke: {width: 2, color: Alt1Color.white},
            font: {
              width: 18,
              color: Alt1Color.white,
              centered: true
            }
          }
        }
      )

      this.help_button = new Alt1OverlayButton(
        null, {
          text: "?",
          style: {
            stroke: {width: 1, color: Alt1Color.white},
            constrast: {width: 1, color: Alt1Color.black},
            font: {
              width: 14,
              color: Alt1Color.white,
              centered: true
            }
          },
          active_style: {
            stroke: {width: 2, color: Alt1Color.white},
            constrast: {width: 1, color: Alt1Color.black},
            font: {
              width: 18,
              color: Alt1Color.white,
              centered: true
            }
          }
        }
      )

      this.help_button.interactivity().setTooltip("Press Alt+1 while hovering this button for an explanation.")

      this.help_button.interactivity().main_hotkey_pressed.on(() => {
        ClueTrainerWiki.openOnPage("scantreecontroloverlay")
      })

      this.back_button.interactivity().main_hotkey_pressed.on(e => { if (this.node.parent) this.node_selection.trigger(this.node.parent.node) })
    }

    private pulse_buttons: Overlay.PulseButton[][] = []

    protected begin() {
      this.pulse_buttons.flat().map(b => b.start())
      this.back_button.start()
      this.help_button.start()

      super.begin();

      Overlay.registerActive(this)
    }

    setNode(node: AugmentedScanTreeNode): void {
      this.node = node

      this.back_button.setVisible(!!this.node.parent)

      this.pulse_buttons.forEach(row => row.forEach(button => {
        button.setRelevant(!!determineChild(this.node, button.pulse))
      }))

      this.updatePossible()

      this.rerender()
    }

    setScanPanelState(state: ScanCaptureService.ScanState) {
      const meerkats_changed = this.panel_state?.meerkats != state.meerkats

      this.panel_state = {...state}

      this.pulse_buttons.forEach(row => row.forEach(button => {
        const impossible = button.pulse.pulse == 3 != this.panel_state.triple
          || button.pulse.different_level != this.panel_state.different_level

        button.setPossible(!impossible)
      }))

      this.updatePossible()

      if (meerkats_changed) this.rerender()
    }

    private updatePossible() {
      const possibles = this.pulse_buttons.flat().filter(b => b.isRelevant() && b.isPossible())

      if (possibles.length == 1) possibles[0].interactivity().makeDefaultHotkeyHandler()
      else Alt1Overlay.Interactivity.setDefaultMainHotkeyHandler(null)
    }

    private back_button: Alt1OverlayButton = null
    private help_button: Alt1OverlayButton = null

    override renderWithBuilder(overlay: Alt1OverlayDrawCalls.GeometryBuilder) {

      if (!this.node) return

      const UPPER_ROW_HEIGHT = 25

      const GUTTER = this.config.gutter

      const origin = Vector2.add(this.config.position, {x: Alt1.clientSize().x / 2 - this.config.size.x / 2, y: 0})

      const small_back_button = this.config.force_small_back_button || this.config.size.x < 280

      const back_button_width = small_back_button ? 25 : 80

      this.back_button.updateConfig(c => c.text = small_back_button ? "<" : "< Back")

      this.back_button.setPosition({
        origin: origin,
        size: {x: back_button_width, y: UPPER_ROW_HEIGHT}
      })

      this.help_button.setPosition(this.config.show_help_button ? {
        origin: {x: origin.x + this.config.size.x - back_button_width, y: this.config.position.y},
        size: {x: back_button_width, y: UPPER_ROW_HEIGHT}
      } : null)

      const progress = 1 - (Math.log2(this.node.remaining_candidates.length) / Math.log2(this.node.root.root_node.remaining_candidates.length))

      const PROGRESS_BAR_HEIGHT = 2
      const PROGRESS_BAR_BORDER = 1
      const PROGRESS_BAR_TOTAL_HEIGHT = PROGRESS_BAR_BORDER + PROGRESS_BAR_HEIGHT

      const progress_bar_space = {x: this.config.size.x - 2 * this.back_button.position().size.x, y: UPPER_ROW_HEIGHT}

      const progress_bar_center = Vector2.add(origin, {x: this.back_button.position().size.x, y: 0}, Vector2.scale(0.5, {x: progress_bar_space.x, y: PROGRESS_BAR_TOTAL_HEIGHT}))

      const meerkats_assumed = this.node.root.raw.assumed_range == (this.node.root.clue.range + 5)

      if (!this.config.warn_for_meerkats || meerkats_assumed == this.panel_state.meerkats) {
        overlay.progressbar(progress_bar_center, progress_bar_space.x - 2 * GUTTER, progress, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_BORDER)
        overlay.text(this.node.remaining_candidates.length != 1 ? `${this.node.remaining_candidates.length} spots` : "1 spot", Vector2.add(progress_bar_center, {
          x: 0,
          y: 12
        }), {
          width: 12,
          color: Alt1Color.fromHex("#FFFFFF"),
        })
      } else {
        const text = this.panel_state.meerkats
          ? "Do not use meerkats for this scan tree!"
          : "Meerkats required for this scan tree!"

        overlay.text(text, Vector2.add(progress_bar_center, {
          x: 0,
          y: 12
        }), {
          width: 14,
          color: Alt1Color.red,
        })
      }


      if (this.node.root.raw.assumed_range)
        this.panel_state.meerkats

      const visible_buttons = this.pulse_buttons.map(row => row.filter(b => b.isRelevant())).filter(r => r.length > 0)

      const rows_n = visible_buttons.length

      const row_height = (this.config.size.y - (rows_n - 1) * GUTTER) / rows_n

      const options_origin = Vector2.add(origin, {x: 0, y: UPPER_ROW_HEIGHT + GUTTER})

      const context = visible_buttons.flat().map(b => b.pulse)

      visible_buttons.forEach((row, row_i) => {
        const column_n = row.length

        const column_width = (this.config.size.x - (column_n - 1) * GUTTER) / column_n
        const row_origin = Vector2.add(options_origin, {x: 0, y: row_i * (row_height + GUTTER)})

        row.forEach((option, column_i) => {
          const option_origin = Vector2.add(row_origin, {x: column_i * (column_width + GUTTER), y: 0})

          const rect: ScreenRectangle = {
            origin: option_origin,
            size: {x: column_width, y: row_height}
          }

          option.setPositionAndContext(rect, context)
        })
      })
    }

    protected end() {
      super.end();

      this.back_button.stop()
      this.help_button.stop()
      this.pulse_buttons.flat().forEach(b => b.stop())
    }

    setConfig(config: Overlay.Config) {
      this.config = lodash.cloneDeep(config)

      this.rerender()
    }
  }

  export namespace Overlay {
    let active_overlay: Overlay = null

    export function registerActive(overlay: Overlay) {
      active_overlay = overlay
    }

    export function getActive(): Overlay {
      if (active_overlay?.isActive()) return active_overlay

      return null
    }

    import simplify_with_context = Scans.Pulse.simplify_with_context;
    import SimplifiedPulseForContext = Scans.Pulse.SimplifiedPulseForContext;

    export type Config = {
      position: Vector2,
      size: Vector2,
      gutter: number,
      show_help_button: boolean,
      warn_for_meerkats: boolean,
      force_small_back_button: boolean,
    }

    export class PulseButton extends Alt1OverlayButton {
      private possible = observe(true)
      private relevant = observe(true)

      constructor(public readonly pulse: Pulse) {
        super(null, {
          style: {
            stroke: {width: 2, color: ScanSolving.PulseColors.forPulse(pulse)},
            constrast: {width: 1, color: Alt1Color.black},
            font: {
              width: 12,
              color: Alt1Color.white,
              shadow: true
            }
          },
          active_style: {
            stroke: {width: 4, color: ScanSolving.PulseColors.forPulse(pulse)},
          }
        });

        this.possible.subscribe(v => {
          this.updateConfig(c => c.style.stroke.width = v ? 3 : 1)
        })

        this.relevant.subscribe(v => this.setVisible(v))
      }

      renderWithBuilder(overlay: Alt1OverlayDrawCalls.GeometryBuilder) {
        super.renderWithBuilder(overlay);

        if (!this.area) return

        if (this.interactivity().is_default_action.value()) {
          overlay.text("Auto", Vector2.add(this.area.origin, {x: this.area.size.x - 20, y: 10}), {
            color: Alt1Color.white,
            centered: true,
            width: 8
          })
        }
      }

      setRelevant(v: boolean) {
        this.relevant.set(v)
      }

      isRelevant(): boolean {
        return this.relevant.value()
      }

      setPossible(v: boolean) {
        this.possible.set(v)
      }

      isPossible(): boolean {
        return this.possible.value()
      }

      private context: SimplifiedPulseForContext

      setPositionAndContext(position: ScreenRectangle, context: Pulse[]) {
        this.context = simplify_with_context(this.pulse, context)

        const txt = text[this.context.text]

        const config = this.config.value()

        if (txt) {
          if (position.size.x > 100) config.text = (txt.long)
          else config.text = (txt.short)
        } else config.text = null

        const color = ScanSolving.PulseColors.forContextPulse(this.context)

        config.style.stroke.color = color
        config.active_style.stroke.color = color

        this.setPosition(position)
      }
    }
  }

  const text: Record<SimplifiedPulseForContext["text"], { long: string, short: string }> = {
    DL: {long: "Different Level", short: "DL"}, TF: {long: "Too Far", short: "TF"}
  }

  export function determineChild(node: AugmentedScanTreeNode, info: Pulse): AugmentedScanTreeNode {
    {
      const candidates = node.children.filter(c => {
        return (info.pulse == undefined || c.key.pulse == info.pulse) &&
          (info.different_level == undefined || (c.key.different_level ?? false) == (info.different_level ?? false))
      })

      if (candidates.length == 1) return candidates[0].value
    }

    return undefined
  }
}