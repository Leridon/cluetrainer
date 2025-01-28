import Behaviour from "../ui/Behaviour";
import {OverlayGeometry} from "./OverlayGeometry";
import {Process} from "../Process";
import {observe} from "../reactive";

export abstract class Alt1Overlay extends Behaviour {
  private overlay: OverlayGeometry = new OverlayGeometry()

  private heartbeat_process: Process

  private parent: Alt1Overlay | null = null

  protected visible = observe(true)

  constructor(private clear_before_render: boolean,
              private minimum_refresh_rate: number = 20000) {
    super();

    this.overlay = new OverlayGeometry().withTime(minimum_refresh_rate + 1000)

    this.visible.subscribe(() => this.refresh())
  }

  setVisible(v: boolean): this {
    this.visible.set(v)

    return this
  }

  public isVisible(): boolean {
    return this.isActive() && this.visible.value()
  }

  public refresh() {
    if (!this.isActive()) return

    const visible = this.visible.value()

    if (this.clear_before_render || !visible) this.overlay.clear()

    if (visible) this.renderSelf(this.overlay)

    this.overlay.render()
  }

  protected begin() {
    if (!this.parent) {
      const self = this

      this.heartbeat_process = new class extends Process.Interval {
        constructor() {super(self.minimum_refresh_rate);}

        tick(): void | Promise<void> {
          self.overlay.render()
        }
      }
      this.heartbeat_process.run()
    }

    this.refresh()
  }

  protected end() {
    this.heartbeat_process.stop()

    this.overlay.clear().render()
  }

  abstract renderSelf(overlay: OverlayGeometry)

  public setId(id: string) {
    this.overlay.setGroupName(id)
  }
}