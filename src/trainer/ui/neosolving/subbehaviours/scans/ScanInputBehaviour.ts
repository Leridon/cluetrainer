import Behaviour from "../../../../../lib/ui/Behaviour";
import {Vector2} from "../../../../../lib/math";
import {OverlayGeometry} from "../../../../../lib/alt1/OverlayGeometry";
import {ewent, observe} from "../../../../../lib/reactive";
import {ScanCaptureService} from "./ScanPanelReader";
import {Circle} from "../../../../../lib/math/Circle";
import {Alt1Overlay} from "../../../../../lib/alt1/Alt1Overlay";
import {ScanTree} from "../../../../../lib/cluetheory/scans/ScanTree";
import {Scans} from "../../../../../lib/runescape/clues/scans";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import {Alt1Color} from "../../../../../lib/alt1/Alt1Color";
import {InteractiveOverlay} from "../../../../../lib/alt1/overlay/InteractiveOverlay";
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;


export class ScanControlPrototype extends Behaviour {
  private overlay: ScanControlPrototype.Overlay

  constructor(
    private panel_reader: ScanCaptureService) {
    super();

    this.overlay = this.withSub(new ScanControlPrototype.Overlay({position: {x: 911, y: 240}, width: 500, height: 200}))

    panel_reader.onStateChange(s => this.overlay.setScanPanelState(s))

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
      super(true);

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

      this.pulse_buttons.flat().forEach(b => b.main_hotkey_pressed.on(() => this.node_selection.trigger(determineChild(this.node, b.pulse))))

      this.back_button = new InteractiveOverlay.Button(
        null, {
          stroke: {width: 1, color: Alt1Color.white},
          active_stroke: {width: 2, color: Alt1Color.white},
          constrast: {width: 1, color: Alt1Color.black}
        }
      )

      this.back_button.setText("< Back", {
        width: 16,
        color: Alt1Color.fromHex("#FFFFFF"),
        centered: true
      })

      this.back_button.main_hotkey_pressed.on(e => { if (this.node.parent) this.node_selection.trigger(this.node.parent.node) })
    }

    private pulse_buttons: Overlay.PulseButton[][] = []

    protected begin() {
      this.pulse_buttons.flat().map(b => b.start())
      this.back_button.start()

      super.begin();
    }

    setNode(node: AugmentedScanTreeNode): void {
      this.node = node

      this.back_button.setVisible(!!this.node.parent)

      this.pulse_buttons.forEach(row => row.forEach(button => {
        button.setRelevant(!!determineChild(this.node, button.pulse))
      }))

      this.updatePossible()

      this.refresh()
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

      if (meerkats_changed) this.refresh()
    }

    private updatePossible() {
      const possibles = this.pulse_buttons.flat().filter(b => b.isRelevant() && b.isPossible())

      if (possibles.length == 1) possibles[0].makeDefaultAction()
      else InteractiveOverlay.setDefaultElement(null)
    }

    refresh() {
      super.refresh();
    }

    private back_button: InteractiveOverlay.Button = null

    renderSelf(overlay: OverlayGeometry) {
      const GUTTER = 5

      const origin = this.config.position

      const back: ScreenRectangle = {
        origin: origin,
        size: {x: 80, y: 25}
      }

      this.back_button.setPosition(back)

      const progress = 1 - (Math.log2(this.node.remaining_candidates.length) / Math.log2(this.node.root.root_node.remaining_candidates.length))

      const PROGRESS_BAR_HEIGHT = 2
      const PROGRESS_BAR_BORDER = 1
      const PROGRESS_BAR_TOTAL_HEIGHT = PROGRESS_BAR_BORDER + PROGRESS_BAR_HEIGHT

      const progress_bar_space = {x: this.config.width - 2 * back.size.x, y: back.size.y}

      const progress_bar_center = Vector2.add(back.origin, {x: back.size.x, y: 0}, Vector2.scale(0.5, {x: progress_bar_space.x, y: PROGRESS_BAR_TOTAL_HEIGHT}))

      const meerkats_assumed = this.node.root.raw.assumed_range == (this.node.root.clue.range + 5)

      if (meerkats_assumed == this.panel_state.meerkats) {
        overlay.progressbar(progress_bar_center, progress_bar_space.x - 2 * GUTTER, progress, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_BORDER)
        overlay.text(this.node.remaining_candidates.length != 1 ? `${this.node.remaining_candidates.length} spots remain` : "1 spot remains", Vector2.add(progress_bar_center, {
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

      const row_height = (this.config.height - (rows_n - 1) * GUTTER) / rows_n

      const options_origin = Vector2.add(this.config.position, {x: 0, y: back.size.y + GUTTER})

      const context = visible_buttons.flat().map(b => b.pulse)

      visible_buttons.forEach((row, row_i) => {
        const column_n = row.length

        const column_width = (this.config.width - (column_n - 1) * GUTTER) / column_n
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
      this.pulse_buttons.flat().forEach(b => b.stop())
    }
  }

  export namespace Overlay {

    import simplify_with_context = Scans.Pulse.simplify_with_context;
    import SimplifiedPulseForContext = Scans.Pulse.SimplifiedPulseForContext;
    export type Config = {
      position: Vector2,
      width: number,
      height: number
    }

    export class PulseButton extends InteractiveOverlay.Button {
      private possible = observe(true)
      private relevant = observe(true)

      constructor(public readonly pulse: Pulse) {
        super(null, {
          stroke: {width: 2, color: pulsecolors[pulse.pulse]},
          active_stroke: {width: 4, color: pulsecolors[pulse.pulse]},
          constrast: {width: 1, color: Alt1Color.black}
        });

        this.possible.subscribe(v => {
          this.config.stroke.width = v ? 3 : 1

          this.refresh()
        })

        this.relevant.subscribe(v => this.setVisible(v))

        this.setText(null, {
          width: 12,
          color: Alt1Color.white,
          shadow: true
        })
      }

      renderSelf(overlay: OverlayGeometry) {
        super.renderSelf(overlay);

        if (!this.area) return

        if (this.is_default_action.value()) {
          overlay.text("Auto", Vector2.add(this.area.origin, {x: this.area.size.x - 30, y: 20}), {
            color: Alt1Color.white,
            centered: true,
            width: 12
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

        if (txt) {
          if (position.size.x > 100) this.setText(txt.long)
          else this.setText(txt.short)
        } else this.setText(null)

        const color = this.context.type ? pulsecolors[this.context.type] : pulsecolors[this.context.text == "DL" ? 0 : 1]

        this.config.stroke.color = color
        this.config.active_stroke.color = color

        this.setPosition(position)
      }
    }
  }

  const text: Record<SimplifiedPulseForContext["text"], { long: string, short: string }> = {
    DL: {long: "Different Level", short: "DL"}, TF: {long: "Too Far", short: "TF"}
  }

  const pulsecolors: Alt1Color[] = [
    Alt1Color.fromHex("#8adc13"), // 0 is special for "different level"
    Alt1Color.fromHex("#0f91d3"),
    Alt1Color.fromHex("#e1a53f"),
    Alt1Color.fromHex("#d51918")
  ]

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

  export type Input = {
    different_level: boolean | undefined,
    pulse: 1 | 2 | 3 | undefined
  }
}