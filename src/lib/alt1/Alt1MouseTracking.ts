import * as a1lib from "alt1/base"
import {EwentHandler, observe} from "../reactive";
import {Vector2} from "lib/math/Vector2";
import {Process} from "../Process";

export class Alt1MouseTracking {
  private process: Process
  private position = observe<Vector2>(null)

  constructor() {}

  private startTracking() {
    const self = this

    if (this.process) return

    this.process = new class extends Process.Interval {
      constructor() {super(20);}

      tick(): void {
        if (self.position.changed.handlerCount() == 0) {
          this.stop()

          self.process = null

          return
        }

        self.position.set(a1lib.getMousePosition())
      }

    }
  }

  subscribe(f: (_: Vector2) => void): EwentHandler<any> {
    const handler = this.position.subscribe2(pos => {
      if (pos) f(pos)
    })

    this.startTracking()

    return handler
  }
}