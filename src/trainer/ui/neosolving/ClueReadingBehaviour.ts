import Behaviour from "../../../lib/ui/Behaviour";
import NeoSolvingBehaviour from "./NeoSolvingBehaviour";
import {ClueReader} from "./cluereader/ClueReader";
import {AbstractCaptureService, CapturedImage, CaptureInterval} from "../../../lib/alt1/capture";
import {Alt1} from "../../../lib/alt1/Alt1";
import {deps} from "../../dependencies";
import {Notification} from "../NotificationBar";
import {Log} from "../../../lib/util/Log";
import notification = Notification.notification;
import log = Log.log;

/**
 * ClueReadingBehaviour is a behaviour that automatically reads clues from screen using the alt1 api.
 * It can periodically query the screen and also be triggered manually.
 */
export class ClueReadingBehaviour extends Behaviour {
  reader: ClueReader

  private autoSolve: boolean = false

  constructor(private parent: NeoSolvingBehaviour) {
    super();

    this.reader = new ClueReader(this.parent.tetracompass_only)
  }

  protected begin() {
    const interval = CaptureInterval.fromApproximateInterval(300)

    // Subscribe to screen captures. Automatically paused by the this.autoSolve variable OR by the active clue behaviour
    this.lifetime_manager.bind(Alt1.instance().capturing.subscribe({
      options: (time: AbstractCaptureService.CaptureTime) => ({interval: interval, area: null}),
      paused: () => (!this.autoSolve || this.parent.active_behaviour.get()?.pausesClueReader()),
      handle: (img) => this.solve(img.value, true)
    }))
  }

  protected end() {
    this.setAutoSolve(false)
  }

  private solve(img: CapturedImage, is_autosolve: boolean): ClueReader.Result {
    const res = this.reader.read(img)

    if (res) {
      switch (res.type) {
        case "textclue":
          this.parent.setClueWithAutomaticMethod(res.step, res)
          break;
        case "scan":
        case "compass":
          this.parent.setClueWithAutomaticMethod({step: res.step, text_index: 0}, res)
          break;
        case "puzzle":
          const is_new_one = this.parent.setPuzzle(res.puzzle)

          if (is_autosolve && res.puzzle.type == "slider" && is_new_one) {
            deps().app.crowdsourcing.pushSlider(res.puzzle.puzzle)
          }

          break;
      }
    }

    return res
  }

  setAutoSolve(v: boolean) {
    this.autoSolve = v
  }

  async solveManuallyTriggered() {
    if (!this.reader.initialization.isInitialized()) {
      notification("Clue reader is not fully initialized yet.", "error").show()
      return
    }

    try {
      const img = await Alt1.instance().capturing.captureOnce({options: {area: null, interval: null}})

      const found = this.solve(img.value, false)

      if (!found) {
        notification("No clue found on screen.", "error").show()
      }
    } catch (e) {
      notification("Error while looking for a clue. See the log (F6) for details.", "error").show()

      if (e instanceof Error) {
        log().log(e.toString())
        log().log(e.stack)
      } else {
        console.error(e.toString())
      }
    }
  }
}
