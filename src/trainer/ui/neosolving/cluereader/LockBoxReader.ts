import {CapturedImage} from "../../../../lib/alt1/ImageCapture";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import {Lockboxes} from "../../../../lib/cluetheory/Lockboxes";
import {ImageFingerprint} from "../../../../lib/util/ImageFingerprint";
import {ImageDetect} from "@alt1/base";
import {LazyAsync} from "../../../../lib/properties/Lazy";
import {Vector2} from "../../../../lib/math";
import {util} from "../../../../lib/util/util";
import {CapturedModal} from "./capture/CapturedModal";

export namespace LockBoxReader {

  import findBestMatch = util.findBestMatch;
  import count = util.count;
  export const TILE_SIZE = {x: 30, y: 30}
  const SPACE_BETWEEN_TILES = {x: 8, y: 8}
  const TILE_OFFSET = Vector2.add(TILE_SIZE, SPACE_BETWEEN_TILES)
  const TILE_KERNEL_SIZE = {x: 5, y: 5}
  const SIZE = 5
  const FINGERPRINT_TYPE = ImageFingerprint.TypeRGB

  const tile_reference = new LazyAsync<{
    value: Lockboxes.Tile,
    reference_fingerprint: ImageFingerprint
  }[]>(async () => {
    return [
      {
        value: 0, reference_fingerprint: ImageFingerprint.get(await ImageDetect.imageDataFromUrl("alt1anchors/lockbox_tiles/melee.png"),
          {x: 0, y: 0}, TILE_SIZE, TILE_KERNEL_SIZE, FINGERPRINT_TYPE)
      },
      {
        value: 1, reference_fingerprint: ImageFingerprint.get(await ImageDetect.imageDataFromUrl("alt1anchors/lockbox_tiles/range.png"),
          {x: 0, y: 0}, TILE_SIZE, TILE_KERNEL_SIZE, FINGERPRINT_TYPE)
      },
      {
        value: 2, reference_fingerprint: ImageFingerprint.get(await ImageDetect.imageDataFromUrl("alt1anchors/lockbox_tiles/mage.png"),
          {x: 0, y: 0}, TILE_SIZE, TILE_KERNEL_SIZE, FINGERPRINT_TYPE)
      },
      {
        value: 0, reference_fingerprint: ImageFingerprint.get(await ImageDetect.imageDataFromUrl("alt1anchors/lockbox_tiles/melee_active.png"),
          {x: 0, y: 0}, TILE_SIZE, TILE_KERNEL_SIZE, FINGERPRINT_TYPE)
      },
      {
        value: 1, reference_fingerprint: ImageFingerprint.get(await ImageDetect.imageDataFromUrl("alt1anchors/lockbox_tiles/range_active.png"),
          {x: 0, y: 0}, TILE_SIZE, TILE_KERNEL_SIZE, FINGERPRINT_TYPE)
      },
      {
        value: 2, reference_fingerprint: ImageFingerprint.get(await ImageDetect.imageDataFromUrl("alt1anchors/lockbox_tiles/mage_active.png"),
          {x: 0, y: 0}, TILE_SIZE, TILE_KERNEL_SIZE, FINGERPRINT_TYPE)
      },
    ]
  })

  const MODAL_BODY_TO_TL_TILE_OFFSET = {x: 42, y: 17}

  export type ReadTile = {
    value: Lockboxes.Tile,
    image: ImageFingerprint
  }

  export class LockBoxReader {

    private debug_overlay: OverlayGeometry

    tile_area: CapturedImage

    private tiles: ReadTile[][]
    private puzzle_computed = false
    private puzzle: Lockboxes.State = null

    public isBroken = false
    public brokenReason: string = ""

    constructor(public modal: CapturedModal) {

      this.tile_area = modal.body.getSubSection(
        {
          origin: MODAL_BODY_TO_TL_TILE_OFFSET,
          size: Vector2.add(Vector2.scale(SIZE, TILE_SIZE), Vector2.scale(SIZE - 1, SPACE_BETWEEN_TILES))
        },
      )

      this.tiles = new Array(SIZE).fill(null).map(() => new Array(SIZE).fill(null))
    }

    public tileOrigin(tile: Vector2, on_screen: boolean = false): Vector2 {
      if (on_screen) {
        return Vector2.add(Vector2.mul(TILE_OFFSET, tile), this.tile_area.screenRectangle().origin)
      } else {
        return Vector2.add(Vector2.mul(TILE_OFFSET, tile))
      }
    }

    public async getTile(index: Vector2): Promise<ReadTile> {
      if (!this.tiles[index.y][index.x]) {
        const o = this.tileOrigin(index)

        const fingerprint = ImageFingerprint.get(
          this.tile_area.getData(),
          o,
          TILE_SIZE,
          TILE_KERNEL_SIZE,
          FINGERPRINT_TYPE
        )

        const best = findBestMatch(await tile_reference.get(), ref => ImageFingerprint.similarity(ref.reference_fingerprint, fingerprint))

        this.tiles[index.y][index.x] = {
          image: fingerprint,
          value: best.score < 0.8 ? null : best.value.value,
        }
      }

      return this.tiles[index.y][index.x]
    }

    public async readGrid(): Promise<ReadTile[][]> {
      for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
          await this.getTile({x, y})
        }
      }

      return this.tiles
    }

    async getState(): Promise<"okay" | "likelyconcealed" | "likelyclosed"> {
      const grid = await this.readGrid()

      const broken_count = count(grid.flat(), t => t.value == null)

      if (broken_count > 15) return "likelyclosed"
      else if (broken_count > 0) return "likelyconcealed"
      else return "okay"
    }

    async getPuzzle(): Promise<Lockboxes.State> {
      if (!this.puzzle_computed) {
        const grid = await this.readGrid()

        const is_broken = grid.some(row => row.some(t => t.value == null))

        if (is_broken) this.puzzle = null
        else this.puzzle = {
          tile_rows: grid.map(r => r.map(t => t.value))
        }
        this.puzzle_computed = true
      }

      return this.puzzle
    }

    showDebugOverlay() {
      if (!this.debug_overlay) {
        this.debug_overlay = new OverlayGeometry()
      }

      this.debug_overlay.clear()

      this.debug_overlay.render()
    }
  }
}