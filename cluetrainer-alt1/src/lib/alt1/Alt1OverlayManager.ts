import {Process} from "../Process";
import {ewent, EwentHandler} from "../reactive";
import {Alt1Overlay} from "./overlay/Alt1Overlay";
import {LifetimeManager} from "../lifetime/LifetimeManager";

export class Alt1OverlayManager {
  private process: Process

  public readonly HEARTBEAT = 20_000

  private heartbeat = ewent<null>()

  private page_lifetime_manager = new LifetimeManager()

  constructor() {
    window.addEventListener("pagehide", () => {
      this.page_lifetime_manager.endLifetime()
    })
  }

  private startTracking() {
    if (this.process) return

    const self = this

    this.process = new class extends Process.Interval {
      constructor() {
        super(self.HEARTBEAT); // Beat every 20 seconds
      }

      tick(): void {
        self.heartbeat.trigger(null)
      }
    }

    this.process.run()
  }

  onHeartbeat(f: () => void): EwentHandler<any> {
    const handler = this.heartbeat.on(f)

    this.startTracking()

    return handler
  }

  bindToPageLifetime(overlay: Alt1Overlay) {
    this.page_lifetime_manager.bind(overlay)
  }

  create(): Alt1Overlay {
    return new Alt1Overlay(undefined, this)
  }
}