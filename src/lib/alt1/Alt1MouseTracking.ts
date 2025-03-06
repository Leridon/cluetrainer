import * as a1lib from "alt1/base"
import {ewent, EwentHandler, observe} from "../reactive";
import {Vector2} from "lib/math/Vector2";
import {Process} from "../Process";
import {timeSync} from "../gamemap/GameLayer";
import {ScreenRectangle} from "./ScreenRectangle";
import {Alt1Overlay} from "./overlay/Alt1Overlay";
import {Alt1OverlayDrawCalls} from "./overlay/Alt1OverlayDrawCalls";

export class Alt1MouseTracking {
  private process: Process
  private position = observe<Vector2>(null).structuralEquality()
  private click = ewent<Vector2>()

  private last_active: number = undefined

  constructor() {

    this.click.on(pos => {
      console.log(`Active at ${Vector2.toString(pos)}`)

      Alt1Overlay.oneOff(
        new Alt1OverlayDrawCalls.GeometryBuilder()
          .rectangle(ScreenRectangle.centeredOn(pos, 5))
          .buffer(),
        1000
      )
    })

    this.startTracking()

  }

  private startTracking() {
    const self = this

    if (this.process) return

    this.process = new class extends Process.Interval {
      constructor() {super(50);}

      tick(): void {
       // timeSync("tick", () => {
          if (self.position.changed.handlerCount() == 0 && self.click.handlerCount() == 0) {
            this.stop()

            self.process = null

            return
          }

          self.position.set(a1lib.getMousePosition())

          const last_active = alt1.rsLastActive
          const last_active_absolute = Date.now() - last_active
          const is_new_event = Math.abs(self.last_active - last_active_absolute) >= 2

          if (is_new_event && last_active < 100) self.click.trigger(self.position.value())

          self.last_active = last_active_absolute
       // })
      }
    }

    this.process.run()
  }

  subscribe(f: (_: Vector2) => void): EwentHandler<any> {
    const handler = this.position.subscribe2(pos => {
      if (pos) f(pos)
    })

    this.startTracking()

    return handler
  }
}