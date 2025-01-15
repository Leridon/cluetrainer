import Behaviour from "../../../../../lib/ui/Behaviour";
import {Vector2} from "../../../../../lib/math";
import {Process} from "../../../../../lib/Process";
import {OverlayGeometry} from "../../../../../lib/alt1/OverlayGeometry";
import {util} from "../../../../../lib/util/util";
import {ewent, observe} from "../../../../../lib/reactive";
import {ScanCaptureService} from "./ScanPanelReader";
import {Alt1MainHotkeyEvent} from "../../../../../lib/alt1/Alt1MainHotkeyEvent";
import {Circle} from "../../../../../lib/math/Circle";
import {Alt1Overlay} from "../../../../../lib/alt1/Alt1Overlay";
import {ScanTree} from "../../../../../lib/cluetheory/scans/ScanTree";
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;


export class ScanControlPrototype extends Behaviour {
  private overlay: ScanControlPrototype.Overlay

  constructor(
    private hotkey: Alt1MainHotkeyEvent,
    private panel_reader: ScanCaptureService) {
    super();

    this.overlay = this.withSub(new ScanControlPrototype.Overlay(hotkey))

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
  export const position: Vector2 = {x: 1105, y: 449}
  export const size: number = 100
  export const space: number = 10

  function isDetectable(node: AugmentedScanTreeNode): boolean {
    if (!node.parent) return false

    if (node.parent.key.pulse == 3 && (!node.parent.key.spot || count(node.parent.node.children, c => c.key.pulse == 3) == 1)) return true

    // If it's the only one with/without different level, it's also detectable
    return count(node.parent.node.children, c => (c.key.different_level ?? false) == (node.parent.key.different_level ?? false)) == 1
  }

  export class Overlay extends Alt1Overlay {
    public back: Circle = null
    public single: Circle = null
    public double: Circle = null

    private node: AugmentedScanTreeNode = null
    private panel_state: ScanCaptureService.ScanState = null

    private state = observe<Overlay.State>(null).structuralEquality()

    public node_selection = ewent<AugmentedScanTreeNode>()

    constructor(private hotkey: Alt1MainHotkeyEvent) {
      super(true);

      this.hotkey.subscribe(1, event => {

        const node = ((): AugmentedScanTreeNode => {
          if (this.back && Circle.contains(this.back, event.mouse)) return this.node.parent.node

          if (this.state.value()?.auto_input) return determineChild(this.node, this.state.value()?.auto_input)

          if (Circle.contains(this.single, event.mouse)) return determineChild(this.node, {pulse: 1, different_level: this.panel_state.different_level})
          if (Circle.contains(this.double, event.mouse)) return determineChild(this.node, {pulse: 2, different_level: this.panel_state.different_level})

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

      this.state.set({back: this.node.parent != undefined, auto_input: auto_input, no_children: this.node.children.every(c => c.key.pulse == 3)})
    }

    render(overlay: OverlayGeometry) {
      const state = this.state.value()

      console.log("Rendering")
      console.log(state)

      if (!state) return

      this.single = {
        center: Vector2.add(position, {x: -(size + space), y: 0}),
        radius: size
      }

      this.double = {
        center: Vector2.add(position, {x: (size + space), y: 0}),
        radius: size
      }

      this.back = state.back
        ? {center: Vector2.add(position, {x: 0, y: -60}), radius: 30}
        : null

      const auto_color: number = state.auto_input ? A1Color.fromHex(pulsecolors[state.auto_input?.pulse ?? (state.auto_input?.different_level ? 0 : undefined)]) : null

      if (!state.no_children) {
        overlay.circle(this.single, 16, {color: auto_color ?? A1Color.fromHex("#0f91d3"), width: 3})
        overlay.circle(this.double, 16, {color: auto_color ?? A1Color.fromHex("#dc9936"), width: 3})
      }

      if (state.back) {
        overlay.circle(this.back, 20, {color: A1Color.fromHex("#b836dc"), width: 3})
        overlay.text("Back", Vector2.add(position, {x: 0, y: -60}), {color: A1Color.fromHex("#b836dc"), width: 12, centered: true})
      }

      if (state.auto_input) {
        let pretty = ["Single", "Double", "Triple"][state.auto_input.pulse - 1]

        if (state.auto_input.different_level) pretty += " (Different Level)"

        overlay.text(`Auto: ${pretty}`, position, {color: A1Color.fromHex("#ffffff"), width: 15, centered: true, shadow: true})
      }
    }

  }

  export namespace Overlay {

    export type State = {
      back: boolean,
      auto_input?: Input,
      no_children: boolean
    }
  }

  const pulsecolors: string[] = [
    "#00ff2a", // 0 is special for "different level"
    "#0f91d3",
    "#e1a53f",
    "#d51918"
  ]

  export function determineChild(node: AugmentedScanTreeNode, info: ScanControlPrototype.Input): AugmentedScanTreeNode {
    {
      const candidates = node.children.filter(c => {
        return (info.pulse == undefined || c.key.pulse == info.pulse) &&
          (info.different_level == undefined || (c.key.different_level ?? false) == info.different_level)
      })

      if (candidates.length == 1) return candidates[0].value
    }

    if (info.different_level != undefined) {
      const candidates = node.children.filter(c => (c.key.different_level ?? false) == info.different_level)

      if (candidates.length == 1) return candidates[0].value
    }

    if (info.pulse != undefined) {
      const candidates = node.children.filter(c => c.key.pulse == info.pulse)

      if (candidates.length == 1) return candidates[0].value
    }

    return undefined
  }


  export class OverlayProcess extends Process.Interval {
    public overlay: OverlayGeometry = null

    public single: Circle = null
    public double: Circle = null

    constructor() {
      super(5000);

      this.overlay = new OverlayGeometry()
    }

    tick(): void {

      this.single = {
        center: Vector2.add(position, {x: -(size + space), y: 0}),
        radius: size
      }

      this.double = {
        center: Vector2.add(position, {x: (size + space), y: 0}),
        radius: size
      }

      this.overlay.clear()

      this.overlay.circle(this.single, 16, {color: A1Color.fromHex("#0000FF"), width: 3})
      this.overlay.circle(this.double, 16, {color: A1Color.fromHex("#dc9936"), width: 3})

      console.log("Rendering")

      this.overlay.render() // Refresh rendering periodically
    }
  }

  export type Input = {
    different_level: boolean | undefined,
    pulse: 1 | 2 | 3 | undefined
  }
}