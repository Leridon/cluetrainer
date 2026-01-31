import {CapturedImage, NeedleImage} from "../../../../lib/alt1/capture";
import {Vector2} from "../../../../lib/math";
import {CapturedModal} from "./capture/CapturedModal";
import {Towers} from "../../../../lib/cluetheory/Towers";
import * as OCR from "alt1/ocr";
import {util} from "../../../../lib/util/util";
import {async_lazy, Lazy} from "../../../../lib/Lazy";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import ClueFont from "./ClueFont";

export class TowersReader {
  constructor(private context_menu_anchor: NeedleImage) {

  }

  findContextMenu(image: CapturedImage): ScreenRectangle {
    const context_menu = image.root().findNeedle(this.context_menu_anchor)

    if (context_menu.length > 0) {

      return ScreenRectangle.move(context_menu[0].screenRectangle(),
        {x: -4, y: -2},
        {x: 113, y: 149}
      )
    }

    return null
  }
}

export namespace TowersReader {
  export const _instance = async_lazy<TowersReader>(async () => new TowersReader(await context_menu_anchor.get()))

  export async function instance(): Promise<TowersReader> {
    return _instance.get()
  }

  const context_menu_anchor = new Lazy(() => NeedleImage.fromURL("/alt1anchors/contextborder.png"))

  import count = util.count;
  const font: OCR.FontDefinition = ClueFont;
  const font_with_just_digits = {...font, chars: font.chars.filter(c => !isNaN(+c.chr))};

  export const TILE_SIZE = {x: 42, y: 42}
  const SPACE_BETWEEN_TILES = {x: 2, y: 2}
  const TILE_OFFSET = Vector2.add(TILE_SIZE, SPACE_BETWEEN_TILES)
  const SIZE = 5

  const MODAL_BODY_TO_TL_TILE_OFFSET = {x: 41, y: 38}

  export class CapturedTowers {

    tile_area: CapturedImage
    puzzle_area: CapturedImage

    private puzzle_computed = false
    private puzzle: Towers.PuzzleState = null

    private broken_hint_count: number = 0

    private _hint_cache: Towers.Hints = null
    private _tile_cache: Towers.Blocks = null

    constructor(public modal: CapturedModal, private reader: TowersReader) {

      this.tile_area = modal.body.getSubSection(
        {
          origin: MODAL_BODY_TO_TL_TILE_OFFSET,
          size: Vector2.add(Vector2.scale(SIZE, TILE_SIZE), Vector2.scale(SIZE - 1, SPACE_BETWEEN_TILES))
        },
      )

      this.puzzle_area = modal.body.getSubSection(
        {
          origin: {x: 10, y: 5},
          size: {x: 284, y: 284}
        },
      )
    }

    public tileOriginScreenCoordinates(tile: Vector2): Vector2 {
      return Vector2.add(Vector2.mul(TILE_OFFSET, tile), this.tile_area.screenRectangle().origin)
    }

    private readCell(tile: Vector2): Towers.Tower | null {
      const in_grid = tile.x >= 0 && tile.x < SIZE && tile.y >= 0 && tile.y < SIZE;

      const cell_origin = Vector2.add(MODAL_BODY_TO_TL_TILE_OFFSET, Vector2.mul(TILE_OFFSET, tile))

      const CENTER_OF_CHAR_BASELINE_FROM_CELL_ORIGIN: Vector2 = {x: 22, y: 22}

      const center_of_char_baseline = Vector2.add(cell_origin, CENTER_OF_CHAR_BASELINE_FROM_CELL_ORIGIN)

      // The outer rows (hints at x/y = -1/5) are not aligned with the rest of the grid.
      const OUTER_ROW_INSET = 7
      if (tile.x == -1) center_of_char_baseline.x += OUTER_ROW_INSET
      else if (tile.x == SIZE) center_of_char_baseline.x -= OUTER_ROW_INSET
      if (tile.y == -1) center_of_char_baseline.y += OUTER_ROW_INSET
      else if (tile.y == SIZE) center_of_char_baseline.y -= OUTER_ROW_INSET

      const COLOR: OCR.ColortTriplet[] = in_grid
        ? [[255, 255, 255]]
        : [[255, 205, 10], [102, 102, 102]];

      const wiggle_candidates = [-4, -5]

      for (const col of COLOR) {
        for (const wiggle_x of wiggle_candidates) {

          const res = OCR.readChar(this.modal.body.getData(),
            font_with_just_digits,
            col,
            center_of_char_baseline.x + wiggle_x,
            center_of_char_baseline.y,
            false,
            true);

          if (res) {
            const num = Number(res.chr);

            if (Number.isNaN(num) || num < 1 || num > 5) return null
            else return num as Towers.Tower
          }
        }
      }

      return null
    }

    getHints(): Towers.Hints {
      if (!this._hint_cache) {
        const hints = Towers.Hints.empty()

        for (let i = 0; i < SIZE; i++) {
          hints.top[i] = this.readCell({x: i, y: -1})
          hints.bottom[i] = this.readCell({x: i, y: SIZE})
          hints.left[i] = this.readCell({x: -1, y: i})
          hints.right[i] = this.readCell({x: SIZE, y: i})
        }

        console.log(hints)

        this.broken_hint_count = count([
          ...hints.top,
          ...hints.bottom,
          ...hints.left,
          ...hints.right,
        ], h => h == null)

        this._hint_cache = hints
      }

      return this._hint_cache
    }

    getBlocks(): Towers.Blocks {
      if (!this._tile_cache) {
        const blocks = Towers.Blocks.empty()

        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            blocks.rows[y][x] = this.readCell({x, y})
          }
        }

        this._tile_cache = blocks
      }

      return this._tile_cache
    }

    findContextMenu(): ScreenRectangle {
      return this.reader.findContextMenu(this.modal.body)
    }

    getState(): "okay" | "likelyconcealed" | "likelyclosed" {
      this.getHints()

      if (this.broken_hint_count == 20) return "likelyclosed"
      else if (this.broken_hint_count > 0) return "likelyconcealed"
      else return "okay"
    }

    getPuzzle(): Towers.PuzzleState {
      if (!this.puzzle_computed) {
        const hints = this.getHints()
        const blocks = this.getBlocks()

        if (this.broken_hint_count > 0) this.puzzle = null
        else {
          this.puzzle = {
            hints: hints,
            blocks: blocks
          }
        }

        this.puzzle_computed = true
      }

      return this.puzzle
    }
  }
}