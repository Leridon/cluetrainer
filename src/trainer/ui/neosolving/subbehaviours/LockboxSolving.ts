import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {ClueReader} from "../cluereader/ClueReader";
import {Lockboxes} from "../../../../lib/cluetheory/Lockboxes";
import {CapturedImage} from "../../../../lib/alt1/capture";
import {LockBoxReader} from "../cluereader/LockBoxReader";
import {Vector2} from "../../../../lib/math";
import * as lodash from "lodash";
import {CapturedModal} from "../cluereader/capture/CapturedModal";
import {AbstractPuzzleProcess} from "./AbstractPuzzleProcess";
import {AbstractPuzzleSolving} from "./AbstractPuzzleSolving";
import {deps} from "../../../dependencies";
import {Log} from "../../../../lib/util/Log";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import {util} from "../../../../lib/util/util";
import {Alt1Color} from "../../../../lib/alt1/Alt1Color";
import log = Log.log;
import async_init = util.async_init;

class LockboxSolvingProcess extends AbstractPuzzleProcess {

  settings = deps().app.settings.settings.solving.puzzles.lockboxes

  public cost_function: (_: Lockboxes.MoveMap) => number = Lockboxes.MoveMap.scoring([0, 1, this.settings.two_click_factor])

  puzzle: Lockboxes.State
  isSolved: boolean = false

  private initialization: util.AsyncInitialization<{ reader: LockBoxReader }>

  constructor(private parent: LockboxSolving) {
    super();

    this.initialization = async_init(async () => {
      return {
        reader: await LockBoxReader.instance()
      }
    })
  }

  private overlay(solution: Lockboxes.MoveMap, reader: LockBoxReader.CapturedLockbox, is_desynced: boolean) {
    this.solution_overlay.clear()

    for (let y = 0; y < solution.length; y++) {
      const row = solution[y]

      for (let x = 0; x < row.length; x++) {
        const tile = row[x]

        if (tile == 0) continue

        this.solution_overlay.text(tile.toString(),
          Vector2.add(Vector2.scale(0.5, LockBoxReader.TILE_SIZE), reader.tileOrigin({x, y}, true), {x: 3, y: 0}),
          {
            width: 24,
            color: Alt1Color.fromNumber(this.settings.overlay_color)
          }
        )
      }
    }

    if (is_desynced) {
      this.solution_overlay.text("Detected Client Desync - Overlay paused", reader.tileOrigin({x: 2, y: -2}, true), {
        width: 16,
        color: Alt1Color.fromHex("#C80000"),
        centered: true,
        shadow: true
      })
    }

    this.solution_overlay.render()
  }

  private last_state: {
    state: Lockboxes.State,
    solution: Lockboxes.Solution,
    timestamp: number,
    visually_desynced?: boolean
  } = null

  area(): ScreenRectangle {
    return this.parent.lockbox.reader.modal.body.screenRectangle();
  }

  async tick(capt: CapturedImage) {
    if (!capt) return
    if (!this.initialization.isInitialized()) return

    const capture = CapturedModal.assumeBody(capt)
    const reader = new LockBoxReader.CapturedLockbox(capture, this.initialization.get().reader)

    const puzzle = reader.getPuzzle()

    if (reader.getState() == "likelyclosed") this.puzzleClosed()

    if (puzzle) {

      if (this.last_state) {
        // If there is already a previous solution, find the most similar solution

        const is_visually_desynced = (() => {
            const required_moves_from_last_accepted_state = Lockboxes.solve(puzzle, {
              target_override: this.last_state.state,
              modulo_targets_allowed: false,
              minimize: true,
              minimize_by: Lockboxes.MoveMap.clickScore
            })

            const moves_required = Lockboxes.MoveMap.clickScore(required_moves_from_last_accepted_state.moves)

            // Assumes a maximum click rate of 20/s
            const max_plausible_moves = Math.ceil((capt.capture.timestamp - this.last_state.timestamp) / 80) + 1

            return moves_required > max_plausible_moves
          }
        )()

        if (!is_visually_desynced) {
          if (this.last_state.visually_desynced) log().log("Visual desync ended", "Lockboxes")

          const solution = Lockboxes.solve(puzzle, {
            target_override: this.last_state.solution.target,
            minimize: true,
            modulo_targets_allowed: true,
            minimize_by: s => Lockboxes.MoveMap.difference(s, this.last_state.solution.moves)
          })

          this.last_state = {
            state: puzzle,
            solution: solution,
            timestamp: capt.capture.timestamp
          }
        } else {
          if (!this.last_state.visually_desynced) log().log("Visual desync detected", "Lockboxes")

          this.last_state.visually_desynced = true

          const DESYNC_TIMEOUT = 3000

          if ((capt.capture.timestamp - this.last_state.timestamp) > DESYNC_TIMEOUT) {
            log().log("Desync timed out, Resolving", "Lockboxes")

            this.last_state = null
          }
        }
      }

      // This is intentionally not an else because the previous conditional can set the last_solution back to null
      if (!this.last_state) {
        // If there is no solution, do an initial solve with the cost function
        const solution = Lockboxes.solve(puzzle, {
          modulo_targets_allowed: true,
          minimize: true,
          minimize_by: this.cost_function
        })

        this.last_state = {
          state: puzzle,
          solution: solution,
          timestamp: capt.capture.timestamp
        }
      }

      this.overlay(this.last_state.solution.moves, reader, this.last_state.visually_desynced)
    }
  }

  protected begin() {
    this.puzzle = this.parent.lockbox.reader.getPuzzle() // This should already be cached

    super.begin()
  }
}

export class LockboxSolving extends AbstractPuzzleSolving<ClueReader.Result.Puzzle.Lockbox, LockboxSolvingProcess> {

  constructor(parent: NeoSolvingBehaviour,
              public lockbox: ClueReader.Result.Puzzle.Lockbox) {
    super(parent, lockbox, deps().app.settings.settings.solving.puzzles.lockboxes.autostart, "Lockbox Puzzle", "lockboxes");
  }

  protected constructProcess(): LockboxSolvingProcess {
    return new LockboxSolvingProcess(this)
  }

  protected begin() {
    super.begin();

    this.modal.setImage(this.lockbox.reader.tile_area.getData())
  }

  pausesClueReader(): boolean {
    return this.process && !this.process?.isSolved
  }
}

export namespace LockboxSolving {
  export type Settings = {
    autostart: boolean,
    two_click_factor: number,
    overlay_color: number
  }

  export namespace Settings {
    export const DEFAULT: Settings = {
      autostart: true,
      two_click_factor: 1.3,
      overlay_color: Alt1Color.white.for_overlay
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return DEFAULT

      if (![true, false].includes(settings.autostart)) settings.autostart = DEFAULT.autostart
      if (typeof settings.overlay_color != "number") settings.overlay_color = DEFAULT.overlay_color
      if (typeof settings.two_click_factor != "number") settings.two_click_factor = DEFAULT.two_click_factor

      settings.two_click_factor = lodash.clamp(settings.two_click_factor, 1, 5)

      return settings
    }
  }
}