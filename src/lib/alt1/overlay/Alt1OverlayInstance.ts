import {Alt1OverlayDrawCalls} from "../OverlayGeometry";
import {util} from "../../util/util";
import Behaviour from "../../ui/Behaviour";
import {Alt1OverlayManager} from "../Alt1OverlayManager";
import {observe} from "../../reactive";
import uuid = util.uuid;

export class Alt1OverlayInstance extends Behaviour {
  private group_name: string = uuid()
  private is_frozen = false
  private visible = observe(true)

  private overlay: Alt1OverlayDrawCalls.Buffer = new Alt1OverlayDrawCalls.Buffer([])

  constructor(private heartbeater: Alt1OverlayManager) {
    super();

    this.visible.subscribe(() => this.refresh())
  }

  public setGeometry(geometry: Alt1OverlayDrawCalls.Buffer): void {
    this.overlay = geometry
    this.refresh()
  }

  private refresh() {
    if (!this.isActive()) return

    const visible = this.visible.value()

    this.freeze()
    alt1.overLayClearGroup(this.group_name)
    if (visible) this.overlay.playback()
    alt1.overLayRefreshGroup(this.group_name)
  }

  protected begin() {
    this.heartbeater.onHeartbeat(() => this.refresh())
      .bindTo(this.lifetime_manager)

    this.refresh()
  }

  protected end() {
  }

  private freeze() {
    if (this.group_name) {
      alt1.overLayFreezeGroup(this.group_name)
      this.is_frozen = true
    }
  }
}