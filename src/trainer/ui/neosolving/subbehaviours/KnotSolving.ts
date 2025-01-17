import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {ClueReader} from "../cluereader/ClueReader";
import {CapturedImage} from "../../../../lib/alt1/capture";
import {KnotReader} from "../cluereader/KnotReader";
import {CelticKnots} from "../../../../lib/cluetheory/CelticKnots";
import {Vector2} from "../../../../lib/math";
import {mixColor} from "alt1";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import {CapturedModal} from "../cluereader/capture/CapturedModal";
import {AbstractPuzzleProcess} from "./AbstractPuzzleProcess";
import {AbstractPuzzleSolving} from "./AbstractPuzzleSolving";
import {deps} from "../../../dependencies";
import {Log} from "../../../../lib/util/Log";
import {util} from "../../../../lib/util/util";
import PuzzleState = CelticKnots.PuzzleState;
import log = Log.log;
import async_init = util.async_init;
import { Alt1Color } from "lib/alt1/Alt1Color";

const CENTER_TEXT_SIZE = 20
const MOVE_FONT_SIZE = 24
const CENTRAL_TEXT_OFFSET = {x: 0, y: -150}

class KnotSolvingProcess extends AbstractPuzzleProcess {
  last_successful_read: number
  last_read_puzzle: PuzzleState = null

  puzzle: CelticKnots.PuzzleState
  solution: CelticKnots.Solution

  isSolved: boolean = false

  bug_detected: boolean = false

  private initialization: util.AsyncInitialization<{ reader: KnotReader }>

  constructor(private parent: KnotSolving) {
    super(parent.parent.app.capture_service);

    this.last_successful_read = Date.now()

    this.initialization = async_init(async () => {
      const finder = await KnotReader.instance()

      return {
        reader: finder
      }
    })
  }

  area(): ScreenRectangle {
    return this.parent.knot.reader.ui.body.screenRectangle();
  }

  tick(capt: CapturedImage) {
    if (!this.initialization.isInitialized()) return

    const capture = CapturedModal.assumeBody(capt)
    const reader = new KnotReader.CapturedKnot(capture, this.initialization.get().reader)

    const puzzle = reader.readPuzzle()
    const now = Date.now()

    if (!!puzzle) {
      this.last_successful_read = now
    }

    const matches_last_read = CelticKnots.PuzzleState.equal(puzzle, this.last_read_puzzle)

    this.last_read_puzzle = puzzle

    if (matches_last_read && puzzle) {
      const new_puzzle = CelticKnots.unify(puzzle, this.puzzle)
      const new_solution = CelticKnots.solve(new_puzzle)

      if (!new_puzzle) {
        log().log("Could not unify knot states! Discarding last read.", "Knot Solving", {
          existing: this.puzzle?.snakes?.map(s => CelticKnots.Snake.toString(s)),
          new: puzzle?.snakes?.map(s => CelticKnots.Snake.toString(s)),
          unified: new_puzzle?.snakes?.map(s => CelticKnots.Snake.toString(s)),
        })

        return
      }

      if (!new_solution && this.solution) {
        log().log("Misread detected because of disappearing solution. Discarding last read.", "Knot Solving")
        return
      }

      this.puzzle = new_puzzle
      this.solution = new_solution

      const buttons = this.parent.knot.reader.getButtons()

      this.solution_overlay.clear()

      this.isSolved = CelticKnots.PuzzleState.isSolved(this.puzzle)

      if (this.solution) {
        if (buttons) {
          this.solution.moves.forEach(move => {
            if (move.offset == 0) return // Don't render 0 moves

            const button = buttons[move.snake_index]

            const pos = move.offset < 0 ? button.counterclockwise : button.clockwise

            this.solution_overlay.text(Math.abs(move.offset).toString(),
              Vector2.add(reader.tileOrigin(pos, true), {x: 12, y: 12}), {
                color: Alt1Color.white,
                centered: true,
                shadow: true,
                width: MOVE_FONT_SIZE
              }
            )
          })
        } else {
          this.solution_overlay.text(CelticKnots.PuzzleShape.hash(this.puzzle.shape).toString(),
            Vector2.add(reader.ui.body.screenRectangle().origin, CENTRAL_TEXT_OFFSET, Vector2.scale(0.5, reader.ui.body.screenRectangle().size)),
            {
              color: Alt1Color.white,
              width: CENTER_TEXT_SIZE,
            }
          )
        }


      } else {
        this.solution_overlay.text("Not enough information",
          Vector2.add(reader.ui.body.screenRectangle().origin, CENTRAL_TEXT_OFFSET, Vector2.scale(0.5, reader.ui.body.screenRectangle().size)),
          {
            color: Alt1Color.white,
            width: CENTER_TEXT_SIZE,
          }
        )

        this.solution_overlay.rect2(
          ScreenRectangle.move(reader.ui.body.screenRectangle(), {x: 4, y: 282}, {x: 121, y: 26}),
          {
            color: Alt1Color.white,
            width: 2,
          }
        )
      }

      if (this.isSolved) {
        this.solution_overlay.text("Solved",
          Vector2.add(reader.ui.body.screenRectangle().origin, CENTRAL_TEXT_OFFSET, Vector2.scale(0.5, reader.ui.body.screenRectangle().size)),
          {
            color: Alt1Color.green,
            width: CENTER_TEXT_SIZE,
          }
        )

        this.solution_overlay.rect2(
          ScreenRectangle.move(reader.ui.body.screenRectangle(), {x: 372, y: 282}, {x: 121, y: 26}),
          {
            color: Alt1Color.green,
            width: 2,
          }
        )
      }

      this.solution_overlay.render()

      //await (reader.showDebugOverlay(true))
    } else {
      if (this.isSolved && this.last_successful_read + 500 < now) {
        this.puzzleClosed()
      }
    }

    if (this.last_successful_read + 3000 < now) {
      // Or immediately if state is solved
      this.puzzleClosed()
    }
  }

  protected begin() {
    this.last_read_puzzle = this.puzzle = this.parent.knot.reader.readPuzzle() // This should already be cached
    super.begin()
  }
}

export class KnotSolving extends AbstractPuzzleSolving<
  ClueReader.Result.Puzzle.Knot,
  KnotSolvingProcess
> {
  constructor(parent: NeoSolvingBehaviour,
              public knot: ClueReader.Result.Puzzle.Knot) {
    super(parent, knot, deps().app.settings.settings.solving.puzzles.knots.autostart, "Celtic Knot Puzzle", "knots");
  }

  protected constructProcess(): KnotSolvingProcess {
    return new KnotSolvingProcess(this)
  }

  protected begin() {
    super.begin()
    this.modal.setImage(this.knot.reader.relevant_body.getData())
  }

  pausesClueReader(): boolean {
    return this.process && !this.process.isSolved && (Date.now() - this.process.last_successful_read) < 500
  }
}

export namespace KnotSolving {
  export type Settings = {
    autostart: boolean,
  }

  export namespace Settings {
    export const DEFAULT: Settings = {
      autostart: true
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return DEFAULT

      if (![true, false].includes(settings.autostart)) settings.autostart = DEFAULT.autostart

      return settings
    }
  }
}