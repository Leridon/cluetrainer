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
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;


export class ScanControlPrototype extends Behaviour {
  private overlay: ScanControlPrototype.Overlay

  constructor(
    private hotkey: Alt1MainHotkeyEvent,
    private panel_reader: ScanCaptureService) {
    super();

    this.overlay = this.withSub(new ScanControlPrototype.Overlay(hotkey, {position: {x: 911, y: 240}, width: 500, height: 200}))

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
  import A1Color = util.A1Color;
  import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;
  import count = util.count;
  import Pulse = Scans.Pulse;
  import plural = util.plural;

  function isDetectable(node: AugmentedScanTreeNode): boolean {
    if (!node.parent) return false

    if (node.parent.key.pulse == 3 && (!node.parent.key.spot || count(node.parent.node.children, c => c.key.pulse == 3) == 1)) return true

    // If it's the only one with/without different level, it's also detectable
    return count(node.parent.node.children, c => (c.key.different_level ?? false) == (node.parent.key.different_level ?? false)) == 1
  }

  export class Overlay extends Alt1Overlay {
    public single: Circle = null
    public double: Circle = null

    private node: AugmentedScanTreeNode = null
    private panel_state: ScanCaptureService.ScanState = null

    private state = observe<Overlay.State>(null).structuralEquality()

    public node_selection = ewent<AugmentedScanTreeNode>()

    constructor(private hotkey: Alt1MainHotkeyEvent,
                private config: Overlay.Config
    ) {
      super(true);

      this.hotkey.subscribe(1, event => {
        console.log(event.mouse)

        if (!this.node) return

        const node = ((): AugmentedScanTreeNode => {
          if (this.back && ScreenRectangle.contains(this.back, event.mouse)) return this.node.parent.node

          const option = this.buttons.find(b => ScreenRectangle.contains(b.area, event.mouse))

          if (option) return determineChild(this.node, option.input)

          if (this.auto_info) return determineChild(this.node, this.auto_info)

          return null
        })()

        if (node) {
          this.node_selection.trigger(node)
          event.consume()
        }
      }).bindTo(this.lifetime_manager)

      this.state.subscribe(() => this.refresh())
    }

    setNode(node: AugmentedScanTreeNode): void {
      this.node = node
      this.updateState()
    }

    setScanPanelState(state: ScanCaptureService.ScanState) {
      this.panel_state = state
      this.updateState()
    }

    private updateState() {
      if (!this.node) return
      if (!this.panel_state) return

      const auto_input: Input = ((): Input => {
        const panel_input: Input = {pulse: this.panel_state.triple ? 3 : undefined, different_level: this.panel_state.different_level}

        if (determineChild(this.node, panel_input)) return panel_input

        const undetectable = this.node.children.filter(c => !isDetectable(c.value))

        if (undetectable.length == 1) return {pulse: undetectable[0].key.pulse, different_level: undefined}

        return null
      })();


      const all_options: Overlay.State["options"] = [
        [
          {pulse: {pulse: 1, different_level: false}, possible: true},
          {pulse: {pulse: 2, different_level: false}, possible: true},
          {pulse: {pulse: 3, different_level: false}, possible: true}
        ],
        [
          {pulse: {pulse: 1, different_level: true}, possible: true},
          {pulse: {pulse: 2, different_level: true}, possible: true},
          {pulse: {pulse: 3, different_level: true}, possible: true}
        ]
      ]

      let filtered = all_options
        .map(row => row.filter(o => determineChild(this.node, {pulse: o.pulse.pulse, different_level: o.pulse.different_level ?? false})))

      filtered.forEach(row => row.forEach(option => {
        if (option.pulse.pulse == 3 && !this.panel_state.triple) option.possible = false
        if (option.pulse.different_level != this.panel_state.different_level) option.possible = false
      }))

      // filtered = filtered.map(row => row.filter(o => o.possible))

      this.state.set({
        back: this.node.parent != undefined, options: filtered.filter(r => r.length > 0)
      })
    }

    private buttons: {
      input: Pulse,
      area: ScreenRectangle
    }[] = []

    private back: ScreenRectangle = null

    private auto_info: Pulse = null

    render(overlay: OverlayGeometry) {
      const state = this.state.value()

      console.log("Rendering")
      console.log(state)

      if (!state) return

      this.buttons = []
      this.back = null
      this.auto_info = null

      const GUTTER = 5

      const origin = this.config.position

      const back: ScreenRectangle = {
        origin: origin,
        size: {x: 80, y: 25}
      }

      if (state.back) {
        this.back = back

        overlay.rect2(back, {
          width: 2,
          color: A1Color.fromHex("#ffffff")
        })

        overlay.rect2(back, {
          width: 1,
          color: A1Color.fromHex("#010101")
        })

        overlay.text("< Back", Vector2.add(ScreenRectangle.center(back), {x: 2, y: -2}), {
          width: 16,
          color: A1Color.fromHex("#FFFFFF"),
          centered: true
        })
      }

      const needed_info = Math.log2(this.node.root.root_node.remaining_candidates.length)
      const remaining_info = Math.log2(this.node.remaining_candidates.length)

      const progress = 1 - (remaining_info / needed_info)

      //const progress = 1 - this.node.remaining_candidates.length / this.node.root.root_node.remaining_candidates.length

      const PROGRESS_BAR_HEIGHT = 3
      const PROGRESS_BAR_BORDER = 2
      const PROGRESS_BAR_TOTAL_HEIGHT = PROGRESS_BAR_BORDER + PROGRESS_BAR_HEIGHT

      const progress_bar_space = {x: this.config.width - 2 * back.size.x, y: back.size.y}

      const progress_bar_center = Vector2.add(back.origin, {x: back.size.x, y: 0}, Vector2.scale(0.5, {x: progress_bar_space.x, y: PROGRESS_BAR_TOTAL_HEIGHT}))

      overlay.progressbar(progress_bar_center, progress_bar_space.x - 2 * GUTTER, progress, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_BORDER)
      overlay.text(`${plural(this.node.remaining_candidates.length, "spot")} remain`, Vector2.add(progress_bar_center, {x: 0, y: 12}), {
        width: 12,
        color: A1Color.fromHex("#FFFFFF"),
      })

      const rows_n = state.options.length

      const row_height = (this.config.height - (rows_n - 1) * GUTTER) / rows_n

      const options_origin = Vector2.add(this.config.position, {x: 0, y: back.size.y + GUTTER})

      this.buttons = []

      const possibles = state.options.flat().filter(o => o.possible)

      const only_one_possible = possibles.length == 1

      if (only_one_possible) this.auto_info = possibles[0].pulse

      state.options.forEach((row, row_i) => {
        const column_n = row.length

        const column_width = (this.config.width - (column_n - 1) * GUTTER) / column_n
        const row_origin = Vector2.add(options_origin, {x: 0, y: row_i * (row_height + GUTTER)})

        row.forEach((option, column_i) => {
          const option_origin = Vector2.add(row_origin, {x: column_i * (column_width + GUTTER), y: 0})

          const rect: ScreenRectangle = {
            origin: option_origin,
            size: {x: column_width, y: row_height}
          }

          overlay.rect2(rect, {
            width: (only_one_possible && option.possible) ? 8 : (option.possible ? 4 : 3),
            color: A1Color.fromHex(pulsecolors[option.pulse.pulse])
          })

          overlay.rect2(rect, {
            width: 2,
            color: A1Color.fromHex("#010101")
          })

          this.buttons.push({area: rect, input: option.pulse})
        })
      })
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
  }

  const pulsecolors: string[] = [
    "#00ff2a", // 0 is special for "different level"
    "#0f91d3",
    "#e1a53f",
    "#d51918"
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