import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {ClueReader} from "../cluereader/ClueReader";
import {CapturedImage, ScreenCaptureService} from "../../../../lib/alt1/capture";
import {CapturedModal} from "../cluereader/capture/CapturedModal";
import {TowersReader} from "../cluereader/TowersReader";
import {Towers} from "../../../../lib/cluetheory/Towers";
import {mixColor} from "alt1";
import {Vector2} from "../../../../lib/math";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import {AbstractPuzzleSolving} from "./AbstractPuzzleSolving";
import {AbstractPuzzleProcess} from "./AbstractPuzzleProcess";
import {deps} from "../../../dependencies";
import {util} from "../../../../lib/util/util";
import async_init = util.async_init;
import {Alt1Color} from "../../../../lib/alt1/Alt1Color";

class TowersSolvingProcess extends AbstractPuzzleProcess {
  settings = deps().app.settings.settings.solving.puzzles.towers

  last_successful_read: number

  puzzle: Towers.PuzzleState
  isSolved: boolean = false

  private was_solved_data: boolean[][] = Towers.Blocks.empty().rows.map(r => r.map(() => false))

  private initialization: util.AsyncInitialization<{ reader: TowersReader }>

  constructor(private parent: TowersSolving, capturing: ScreenCaptureService) {
    super(capturing);

    this.last_successful_read = Date.now()

    this.initialization = async_init(async () => {
      return {
        reader: await TowersReader.instance()
      }
    })
  }

  private debugOverlay(reader: TowersReader.CapturedTowers) {

    this.solution_overlay.clear()

    const hints = reader.getHints()

    hints.top.forEach((h, i) => {
      this.solution_overlay.text(
        h?.toString() ?? "N",
        reader.tileOrigin({x: i, y: -1}, true),
      )
    })
    hints.bottom.forEach((h, i) => {
      this.solution_overlay.text(
        h?.toString() ?? "N",
        reader.tileOrigin({x: i, y: 5}, true),
      )
    })
    hints.left.forEach((h, i) => {
      this.solution_overlay.text(
        h?.toString() ?? "N",
        reader.tileOrigin({x: -1, y: i}, true),
      )
    })

    hints.right.forEach((h, i) => {
      this.solution_overlay.text(
        h?.toString() ?? "N",
        reader.tileOrigin({x: 5, y: i}, true),
      )
    })

    this.solution_overlay.render()
  }

  showSolutionOverlay(reader: TowersReader.CapturedTowers, currentState: Towers.PuzzleState, solution: Towers.PuzzleState, hidden_by_context_menu: ScreenRectangle = null) {
    this.solution_overlay.clear()

    const blocked_area = hidden_by_context_menu
      ? ScreenRectangle.extend(hidden_by_context_menu, {x: 7, y: 11})
      : null

    const blocked = (pos: Vector2): boolean => blocked_area && ScreenRectangle.contains(blocked_area, pos)

    const TR_OVERLAY_OFFSET = {x: 33, y: 10}
    const TL_OVERLAY_OFFSET = {x: 12, y: 10}

    let isSolved = true

    for (let y = 0; y < solution.blocks.rows.length; y++) {
      const row = solution.blocks.rows[y]
      for (let x = 0; x < row.length; x++) {

        const should = solution.blocks.rows[y][x]
        const is = currentState.blocks.rows[y][x] ?? 0

        const origin = reader.tileOrigin({x, y}, true)

        const TR = Vector2.add(origin, TR_OVERLAY_OFFSET)
        const TL = Vector2.add(origin, TL_OVERLAY_OFFSET)

        const difference = (6 + should - is) % 6

        const correct = should == is

        isSolved &&= correct

        if (correct) {
          this.was_solved_data[y][x] = true

          if (this.settings.show_correct) {
            if (!blocked(TR)) {

              /*
              this.solution_overlay.text(
                "✓",
                TR, {
                  color: Alt1Color.fromHex("#41740e"),
                  width: 8
                }
              )*/

              this.solution_overlay.rect2(
                {origin: Vector2.add(origin, {x: -1, y: -1}), size: Vector2.add(TowersReader.TILE_SIZE, {x: 3, y: 3})}, {
                  color: Alt1Color.green,
                  width: 2
                }
              )
            }
          }
        } else {
          if (this.settings.solution_mode == "target" || this.settings.solution_mode == "both") {
            if (!blocked(TR)) {
              this.solution_overlay.text(
                should.toString(),
                TR, {
                  color: Alt1Color.fromHex("#C8C8C8"),
                  width: 10
                }
              )
            }
          }

          if (this.settings.solution_mode == "delta" || this.settings.solution_mode == "both") {
            const tr_taken = this.settings.solution_mode == "both"

            const pos = tr_taken ? TL : TR

            if (!blocked(pos)) {
              this.solution_overlay.text(
                "+" + difference.toString(),
                pos, {
                  color: Alt1Color.fromHex("#C8C8C8"),
                  width: 10
                }
              )
            }
          }

          if (this.was_solved_data[y][x] && this.settings.show_overshot) {
            if (!blocked(TR)) {

              this.solution_overlay.rect2(
                {origin: Vector2.add(origin, {x: -1, y: -1}), size: Vector2.add(TowersReader.TILE_SIZE, {x: 3, y: 3})}, {
                  color: Alt1Color.red,
                  width: 2
                }
              )
            }
          }
        }
      }
    }

    this.isSolved = isSolved

    if (isSolved) {

      this.solution_overlay.text(
        "Solved",
        Vector2.add(reader.tileOrigin({x: 2, y: 2}, true), {x: 21, y: 21}), {
          color: Alt1Color.green,
          width: 20
        }
      )

      const CHECK_RECTANGLE: ScreenRectangle = {origin: {x: 317, y: 243}, size: {x: 150, y: 25}}

      this.solution_overlay.rect2(
        ScreenRectangle.subRect(reader.modal.body.screenRectangle(), CHECK_RECTANGLE),
        {
          color: Alt1Color.green,
          width: 2,
        }
      )
    }

    this.solution_overlay.render()
  }

  area(): ScreenRectangle {
    return this.parent.lockbox.reader.modal.body.screenRectangle();
  }

  tick(capt: CapturedImage) {
    try {
      if (!this.initialization.isInitialized()) return

      if (!capt) return

      const capture = CapturedModal.assumeBody(capt)
      const reader = new TowersReader.CapturedTowers(capture, this.initialization.get().reader)

      let puzzle = reader.getPuzzle()

      const context_menu_area = reader.findContextMenu()

      if (puzzle) {
        if (this.puzzle && context_menu_area) puzzle.blocks = Towers.Blocks.combine(puzzle.blocks, this.puzzle.blocks)

        this.puzzle = puzzle
      }

      if (this.puzzle) {
        const solution = Towers.solve(this.puzzle.hints)

        this.showSolutionOverlay(reader, this.puzzle, solution, context_menu_area)
      }

      if (reader.getState() == "likelyclosed") this.puzzleClosed()

    } catch (e) {
      console.error(e.toString())
    }
  }

  protected begin() {
    this.puzzle = this.parent.lockbox.reader.getPuzzle() // This should already be cached

    super.begin();
  }
}

export class TowersSolving extends AbstractPuzzleSolving<ClueReader.Result.Puzzle.Towers, TowersSolvingProcess> {

  constructor(parent: NeoSolvingBehaviour,
              public lockbox: ClueReader.Result.Puzzle.Towers) {
    super(parent, lockbox, deps().app.settings.settings.solving.puzzles.towers.autostart, "Towers Puzzle", "towers");
  }

  protected begin() {
    super.begin();

    this.modal.setImage(this.lockbox.reader.puzzle_area.getData())
  }

  protected constructProcess(): TowersSolvingProcess {
    return new TowersSolvingProcess(this, this.parent.app.capture_service)
  }

  pausesClueReader(): boolean {
    return this.process && !this.process.isSolved
  }
}

export namespace TowersSolving {
  export type Settings = {
    autostart: boolean,
    solution_mode: "target" | "delta" | "both",
    show_correct: boolean,
    show_overshot: boolean,
  }

  export namespace Settings {
    export const DEFAULT: Settings = {
      autostart: true,
      solution_mode: "delta",
      show_correct: true,
      show_overshot: true,
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return DEFAULT

      if (![true, false].includes(settings.autostart)) settings.autostart = DEFAULT.autostart
      if (!["target", "delta", "both"].includes(settings.solution_mode)) settings.solution_mode = DEFAULT.solution_mode
      if (![true, false].includes(settings.show_correct)) settings.show_correct = DEFAULT.show_correct
      if (![true, false].includes(settings.show_overshot)) settings.show_overshot = DEFAULT.show_overshot

      return settings
    }
  }
}