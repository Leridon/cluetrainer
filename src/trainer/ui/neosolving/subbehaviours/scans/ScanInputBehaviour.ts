import Behaviour from "../../../../../lib/ui/Behaviour";
import {Vector2} from "../../../../../lib/math";
import {OverlayGeometry} from "../../../../../lib/alt1/OverlayGeometry";
import {util} from "../../../../../lib/util/util";
import {ewent, observe} from "../../../../../lib/reactive";
import {ScanCaptureService} from "./ScanPanelReader";
import {Alt1MainHotkeyEvent} from "../../../../../lib/alt1/Alt1MainHotkeyEvent";
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
  import count = util.count;
  import Pulse = Scans.Pulse;

  function isDetectable(node: AugmentedScanTreeNode): boolean {
    if (!node.parent) return false

    if (node.parent.key.pulse == 3 && (!node.parent.key.spot || count(node.parent.node.children, c => c.key.pulse == 3) == 1)) return true

    // If it's the only one with/without different level, it's also detectable
    return count(node.parent.node.children, c => (c.key.different_level ?? false) == (node.parent.key.different_level ?? false)) == 1
  }

  class OverlayButton extends Alt1Overlay {
    constructor(private config: {
      area: ScreenRectangle,
      text?: {
        text: string,

      }
    }) {
      super(true);

    }

    renderSelf(overlay: OverlayGeometry) {
    }

    checkHover(position: Vector2) {

    }

    checkClick(event: Alt1MainHotkeyEvent.Event) {

    }
  }

  namespace OverlayButton {

  }

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
      this.panel_state = state

      this.pulse_buttons.forEach(row => row.forEach(button => {
        const impossible = button.pulse.pulse == 3 != this.panel_state.triple
          || button.pulse.different_level != this.panel_state.different_level

        button.setPossible(!impossible)
      }))

      this.updatePossible()
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

      overlay.progressbar(progress_bar_center, progress_bar_space.x - 2 * GUTTER, progress, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_BORDER)
      overlay.text(this.node.remaining_candidates.length != 1 ? `${this.node.remaining_candidates.length} spots remain` : "1 spot remains", Vector2.add(progress_bar_center, {
        x: 0,
        y: 12
      }), {
        width: 12,
        color: Alt1Color.fromHex("#FFFFFF"),
      })

      const visible_buttons = this.pulse_buttons.map(row => row.filter(b => b.isRelevant())).filter(r => r.length > 0)

      const rows_n = visible_buttons.length

      const row_height = (this.config.height - (rows_n - 1) * GUTTER) / rows_n

      const options_origin = Vector2.add(this.config.position, {x: 0, y: back.size.y + GUTTER})

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

          option.setPosition(rect)
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

    import Pulse = Scans.Pulse;
    export type State = {
      back: boolean,
      options: { pulse: Pulse, possible: boolean }[][]
    }

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
          stroke: {width: 3, color: pulsecolors[pulse.pulse]},
          active_stroke: {width: 6, color: pulsecolors[pulse.pulse]},
          constrast: {width: 1, color: Alt1Color.black}
        });

        this.possible.subscribe(v => {
          this.config.stroke.width = v ? 3 : 1

          this.refresh()
        })

        this.relevant.subscribe(v => this.setVisible(v))
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
    }
  }

  const pulsecolors: Alt1Color[] = [
    Alt1Color.fromHex("#00ff2a"), // 0 is special for "different level"
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
    }/*

    if (info.different_level != undefined) {
      const candidates = node.children.filter(c => (c.key.different_level ?? false) == info.different_level)

      if (candidates.length == 1) return candidates[0].value
    }

    if (info.pulse != undefined) {
      const candidates = node.children.filter(c => c.key.pulse == info.pulse)

      if (candidates.length == 1) return candidates[0].value
    }*/

    return undefined
  }

  export type Input = {
    different_level: boolean | undefined,
    pulse: 1 | 2 | 3 | undefined
  }
}