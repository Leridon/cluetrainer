import {ewent} from "../../../../lib/reactive";
import {LegacyOverlayGeometry} from "../../../../lib/alt1/LegacyOverlayGeometry";
import {AbstractCaptureService, CapturedImage, CaptureInterval} from "../../../../lib/alt1/capture";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import Behaviour from "../../../../lib/ui/Behaviour";
import {Alt1ScreenCaptureService} from "../../../../lib/alt1/capture/Alt1ScreenCaptureService";
import {Alt1} from "../../../../lib/alt1/Alt1";
import {Alt1Overlay} from "../../../../lib/alt1/overlay/Alt1Overlay";

export abstract class AbstractPuzzleProcess extends Behaviour {
  puzzle_closed = ewent<this>()

  solution_overlay = this.withSub(new Alt1Overlay())

  protected start_time: number

  private token: AbstractCaptureService.InterestToken<Alt1ScreenCaptureService.Options, CapturedImage>

  protected constructor() {
    super()
  }

  protected begin() {
    this.start_time = Date.now();

    this.lifetime_manager.bind(
      this.token = Alt1.instance().capturing.subscribe({
        options: (time: AbstractCaptureService.CaptureTime) => ({interval: CaptureInterval.fromApproximateInterval(20), area: this.area()}),
        handle: async (value: AbstractCaptureService.TimedValue<CapturedImage, Alt1ScreenCaptureService.Options>) => {
          try {
            this.tick(value.value)
          } catch (e) {
            console.error(e.toString())
          }
        },
        paused: () => this.capturingPaused()
      })
    )
  }

  capturingPaused(): boolean {
    return false
  }

  protected end() {
  }

  abstract area(): ScreenRectangle

  abstract tick(capture: CapturedImage): void

  protected puzzleClosed() {
    this.stop()
    this.puzzle_closed.trigger(this)
  }
}