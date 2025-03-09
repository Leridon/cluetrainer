import {CapturedImage, NeedleImage} from "../../../../lib/alt1/capture";
import {Vector2} from "../../../../lib/math";
import {CapturedModal} from "./capture/CapturedModal";
import {Towers} from "../../../../lib/cluetheory/Towers";
import * as OCR from "alt1/ocr";
import {util} from "../../../../lib/util/util";
import {async_lazy, Lazy} from "../../../../lib/Lazy";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";

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
  const font: OCR.FontDefinition = require("alt1/fonts/aa_10px_mono.js");
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

    public tileOrigin(tile: Vector2, on_screen: boolean = false): Vector2 {
      if (on_screen) {
        return Vector2.add(Vector2.mul(TILE_OFFSET, tile), this.tile_area.screenRectangle().origin)
      } else {
        return Vector2.add(Vector2.mul(TILE_OFFSET, tile))
      }
    }

    private readCharacter(pos: Vector2, in_grid: boolean = true): Towers.Tower | null {
      const COLOR: OCR.ColortTriplet[] = in_grid
        ? [[255, 255, 255]]
        : [[255, 205, 10], [102, 102, 102]];

      const wiggle_candidates = [-3, -2, -1, -4, 0]

      for (let col of COLOR) {
        for (const wiggle_x of wiggle_candidates) {
          const res = OCR.readChar(this.modal.body.getData(),
            font_with_just_digits,
            col,
            pos.x + wiggle_x,
            pos.y,
            false,
            true);

          if (res) {
            //console.log(`${wiggle_x} | 0`)
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

        const start = {
          top: {x: 60, y: 25},
          bottom: {x: 60, y: 275},
          left: {x: 23, y: 62},
          right: {x: 274, y: 62},
        }

        for (let i = 0; i < SIZE; i++) {
          hints.top[i] = this.readCharacter(Vector2.add(start.top, Vector2.mul({x: i, y: 0}, TILE_OFFSET)), false)
          hints.bottom[i] = this.readCharacter(Vector2.add(start.bottom, Vector2.mul({x: i, y: 0}, TILE_OFFSET)), false)
          hints.left[i] = this.readCharacter(Vector2.add(start.left, Vector2.mul({x: 0, y: i}, TILE_OFFSET)), false)
          hints.right[i] = this.readCharacter(Vector2.add(start.right, Vector2.mul({x: 0, y: i}, TILE_OFFSET)), false)
        }

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
      const TL_START = {x: 60, y: 62}


      if (!this._tile_cache) {
        const blocks = Towers.Blocks.empty()

        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            blocks.rows[y][x] = this.readCharacter(Vector2.add(TL_START, Vector2.mul({x, y}, TILE_OFFSET)), true) as Towers.Tower
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