import Behaviour from "../../../../../lib/ui/Behaviour";
import {Rectangle, Vector2} from "../../../../../lib/math";
import {ScanTreeSolving} from "../../subbehaviours/scans/ScanTreeSolving";
import {Process} from "../../../../../lib/Process";
import {OverlayGeometry} from "../../../../../lib/alt1/OverlayGeometry";
import {util} from "../../../../../lib/util/util";
import {Scans} from "../../../../../lib/runescape/clues/scans";
import Pulse = Scans.Pulse;

export class ScanControlPrototype extends Behaviour {
  private process: ScanControlPrototype.OverlayProcess = null

  constructor(private parent: ScanTreeSolving) {
    super();
  }

  protected begin() {
    this.process = new ScanControlPrototype.OverlayProcess()

    this.process.run()

    this.parent.parent.app.main_hotkey.subscribe(1, event => {
      console.log(event.mouse)

      const pulse = ((): Pulse => {
        if (Rectangle.contains(this.process.single, event.mouse)) return {pulse: 1}
        if (Rectangle.contains(this.process.double, event.mouse)) return {pulse: 2}
        if (Rectangle.contains(this.process.triple, event.mouse)) return {pulse: 3}

        return null
      })()

      if (pulse) {
        const candidates = this.parent.node.children.filter(c => c.key.pulse == pulse.pulse)

        if (candidates.length == 1) this.parent.setNode(candidates[0].value)
      }
    }).bindTo(this.lifetime_manager)
  }

  protected end() {
    this.process.overlay.clear().render()

    this.process?.stop()
  }
}

export namespace ScanControlPrototype {
  import A1Color = util.A1Color;
  export const position: Vector2 = {x: 942, y: 323}
  export const size: number = 100
  export const space: number = 10

  export class OverlayProcess extends Process.Interval {
    public overlay: OverlayGeometry = null

    public single: Rectangle = null
    public double: Rectangle = null
    public triple: Rectangle = null

    constructor() {
      super(5000);

      this.overlay = new OverlayGeometry()

      this.single = Rectangle.fromOriginAndSize(position, {x: size, y: size})
      this.double = Rectangle.move(this.single, {x: size + space, y: 0})
      this.triple = Rectangle.move(this.double, {x: size + space, y: 0})

      this.overlay.rect(this.single, {color: A1Color.fromHex("#0000FF")})
      this.overlay.rect(this.double, {color: A1Color.fromHex("#dc9936")})
      this.overlay.rect(this.triple, {color: A1Color.fromHex("#FF0000")})
    }

    tick(): void {
      this.overlay.render() // Refresh rendering periodically
    }
  }
}