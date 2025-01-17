import Behaviour from "../ui/Behaviour";
import {OverlayGeometry} from "./OverlayGeometry";
import {Process} from "../Process";

export abstract class Alt1Overlay extends Behaviour {

  private overlay: OverlayGeometry = new OverlayGeometry()

  private process: Process

  constructor(private clear_before_render: boolean,
              private minimum_refresh_rate: number = 20000) {
    super();

    this.overlay = new OverlayGeometry().withTime(minimum_refresh_rate + 1000)

    const self = this
    this.process = new class extends Process.Interval {
      constructor() {super(minimum_refresh_rate);}

      tick(): void | Promise<void> {
        self.refresh()
      }
    }
  }

  public refresh() {
    if (!this.isActive()) return

    if (this.clear_before_render) this.overlay.clear()

    this.render(this.overlay)

    this.overlay.render()
  }


  protected begin() {
    this.process.run()
  }

  protected end() {
    this.process.stop()

    this.overlay.clear().render()
  }

  abstract render(overlay: OverlayGeometry)
}