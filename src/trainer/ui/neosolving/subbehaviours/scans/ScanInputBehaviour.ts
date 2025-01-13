import Behaviour from "../../../../../lib/ui/Behaviour";
import {Rectangle, Vector2} from "../../../../../lib/math";
import {Process} from "../../../../../lib/Process";
import {OverlayGeometry} from "../../../../../lib/alt1/OverlayGeometry";
import {util} from "../../../../../lib/util/util";
import {ewent} from "../../../../../lib/reactive";
import {ScanCaptureService} from "./ScanPanelReader";
import {Alt1MainHotkeyEvent} from "../../../../../lib/alt1/Alt1MainHotkeyEvent";

export class ScanControlPrototype extends Behaviour {
  private process: ScanControlPrototype.OverlayProcess = null

  private input_registered = ewent<ScanControlPrototype.Input>()

  constructor(
    private hotkey: Alt1MainHotkeyEvent,
    private panel_reader: ScanCaptureService) {
    super();
  }

  protected begin() {
    this.process = new ScanControlPrototype.OverlayProcess()

    this.process.run()

    this.hotkey.subscribe(1, event => {
      console.log(event.mouse)

      const pulse: 1 | 2 | 3 | undefined = (() => {
        if (this.panel_reader.getState().triple) return 3

        if (Rectangle.contains(this.process.single, event.mouse)) return 1
        if (Rectangle.contains(this.process.double, event.mouse)) return 2

        return undefined
      })()

      // TODO: This gets the last confirmed state, which might be a problem

      this.input_registered.trigger({
        different_level: this.panel_reader.getState().different_level,
        pulse: pulse
      })
    }).bindTo(this.lifetime_manager)
  }

  protected end() {
    this.process.overlay.clear().render()

    this.process?.stop()
  }

  onInput(f: (_: ScanControlPrototype.Input) => void) {
    this.input_registered.on(f)
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

    constructor() {
      super(5000);

      this.overlay = new OverlayGeometry()

      this.single = Rectangle.fromOriginAndSize(position, {x: size, y: size})
      this.double = Rectangle.move(this.single, {x: size + space, y: 0})

      this.overlay.rect(this.single, {color: A1Color.fromHex("#0000FF")})
      this.overlay.rect(this.double, {color: A1Color.fromHex("#dc9936")})
    }

    tick(): void {
      this.overlay.render() // Refresh rendering periodically
    }
  }

  export type Input = {
    different_level: boolean | undefined,
    pulse: 1 | 2 | 3 | undefined
  }
}