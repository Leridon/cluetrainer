import Behaviour from "../../lib/ui/Behaviour";
import ClueSolvingBehaviour from "./ClueSolvingBehaviour";
import {ClueReader} from "./cluereader/ClueReader";
import {AbstractCaptureService, CapturedImage, CaptureInterval} from "../../lib/alt1/capture";
import {Alt1} from "../../lib/alt1/Alt1";
import {deps} from "../dependencies";
import {Notification} from "../ui/NotificationBar";
import {Log} from "../../lib/util/Log";
import {Alt1GLCapturedFrame} from "../../lib/alt1gl/Alt1GLCapturedFrame";
import {Alt1GL} from "../../lib/alt1gl/Alt1GL";
import {clue_data} from "../../data/clues";
import notification = Notification.notification;
import log = Log.log;
import gielinor_compass = clue_data.gielinor_compass;

/**
 * ClueReadingBehaviour is a behaviour that automatically reads clues from screen using the alt1 api.
 * It can periodically query the screen and also be triggered manually.
 */
export class ClueReadingBehaviour extends Behaviour {
  reader: ClueReader

  private autoSolve: boolean = false

  constructor(private parent: ClueSolvingBehaviour) {
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

  private solveGL(frame: Alt1GLCapturedFrame): ClueReader.Result {
    for (const render of frame.renders) {
      if (!render.raw.program || !render.raw.uniformState) continue;

      const mesh = render.mesh.get()

      if (!mesh) continue

      if (mesh.cached.known.meshdatas[0].posbufferhash == 1998275936) {
        const res: ClueReader.Result.CompassClue = {
          type: "compass",
          step: gielinor_compass,
          capture: null
        }

        this.parent.setClueWithAutomaticMethod({step: gielinor_compass, text_index: 0}, res)

        return res
      }
    }

    return null
  }

  setAutoSolve(v: boolean) {
    this.autoSolve = v

    if (Alt1GL.exists()) {
      Alt1GLCapturedFrame.subscribe({
        features: ["full"]
      }, frame => {
        this.solveGL(frame)
      })
    }
  }

  async solveManuallyTriggered() {
    if (!this.reader.initialization.isInitialized()) {
      notification("Clue reader is not fully initialized yet.", "error").show()
      return
    }

    try {

      const found =
        (await (async () => {
          if (!Alt1GL.exists()) return null

          return this.solveGL(await Alt1GLCapturedFrame.capture())
        })()) ??
        (await (async () => {
          if (!Alt1.exists()) return null

          const img = await Alt1.instance().capturing.captureOnce({options: {area: null, interval: null}})

          return this.solve(img.value, false)
        })())
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
