import * as a1lib from "alt1/base"
import {ewent, EwentHandler, observe} from "../reactive";
import {Vector2} from "lib/math/Vector2";
import {Process} from "../Process";
import {timeSync} from "../gamemap/GameLayer";
import {OverlayGeometry} from "./OverlayGeometry";
import {ScreenRectangle} from "./ScreenRectangle";

export class Alt1MouseTracking {
  private process: Process
  private position = observe<Vector2>(null).structuralEquality()
  private click = ewent<Vector2>()

  constructor() {

    this.click.on(pos => {
      console.log(`Active at ${Vector2.toString(pos)}`)

      new OverlayGeometry().withTime(1000)
        .rect2(ScreenRectangle.centeredOn(pos, 5))
        .render()
    })

    this.startTracking()

  }

  private startTracking() {
    const self = this

    if (this.process) return

    this.process = new class extends Process.Interval {
      constructor() {super(50);}

      tick(): void {
        timeSync("tick", () => {
          if (self.position.changed.handlerCount() == 0 && self.click.handlerCount() == 0) {
            this.stop()

            self.process = null

            return
          }

          self.position.set(a1lib.getMousePosition())

          if (alt1.rsLastActive < 50) self.click.trigger(a1lib.getMousePosition())
        })
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