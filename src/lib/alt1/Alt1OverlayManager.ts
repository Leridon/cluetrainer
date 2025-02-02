import {Process} from "../Process";
import {ewent, EwentHandler} from "../reactive";
import {Alt1Overlay} from "./overlay/Alt1Overlay";

export class Alt1OverlayManager {
  private process: Process

  private heartbeat = ewent<null>()

  constructor() {}

  private startTracking() {
    if (this.process) return

    const self = this

    this.process = new class extends Process.Interval {
      constructor() {
        super(20_000); // Beat every 20 seconds
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

  create(): Alt1Overlay {
    return new Alt1Overlay(this)
  }
}