import {CelticKnots} from "../../../../lib/cluetheory/CelticKnots";
import {Rectangle, Vector2} from "../../../../lib/math";
import {util} from "../../../../lib/util/util";
import {LegacyOverlayGeometry} from "../../../../lib/alt1/LegacyOverlayGeometry";
import {ImageDetect, mixColor} from "alt1";
import {ImageFingerprint} from "../../../../lib/util/ImageFingerprint";
import * as lodash from "lodash";
import {identity} from "lodash";
import {CapturedImage} from "../../../../lib/alt1/capture";
import {CapturedModal} from "./capture/CapturedModal";
import {async_lazy, lazy} from "../../../../lib/Lazy";
import {Alt1Color} from "../../../../lib/alt1/Alt1Color";

export class KnotReader {
  constructor(private rune_references: ImageFingerprint[]) {}

  public identifyRune(img: ImageFingerprint): number {
    const similarities = this.rune_references.map((r, i) => {
      return {id: i, certainty: ImageFingerprint.similarity(img, r)}
    })

    const best = lodash.maxBy(similarities, e => e.certainty)

    if (best && best.certainty > 0.9) {
      return best.id
    } else {
      return null
    }
  }
}

export namespace KnotReader {
  const _instance = async_lazy<KnotReader>(async () => {
    const atlas = await ImageDetect.imageDataFromUrl("/alt1anchors/knot_runes/atlas.png")

    const fingerprints: ImageFingerprint[] = []

    for (let i = 0; i < Math.floor(atlas.width / 12); i++) {
      fingerprints.push(ImageFingerprint.get(atlas, {x: i * 12, y: 0}, KnotReader.RUNE_REFERENCE_SIZE, KnotReader.RUNE_KERNEL_SIZE, ImageFingerprint.TypeRGB))
    }

    return new KnotReader(fingerprints)
  })

  export async function instance(): Promise<KnotReader> {
    return _instance.get()
  }

  import rgbSimilarity = util.rgbSimilarity;
  import count = util.count;
  const TILE_SIZE = {x: 24, y: 24}
  const RUNE_SIZE = {x: 25, y: 25}
  const DIAGONAL_SPACING = {x: 24, y: 24}
  const FROM_ANCHOR_TO_TILE = {x: -11, y: 9}
  const MAX_GRID_SIZE = {x: 15, y: 13}

  export const RUNE_REFERENCE_SIZE = {x: 12, y: 12}
  export const RUNE_KERNEL_SIZE = {x: 3, y: 3}

  const SCANNING_X = 107

  const button_positions: {
    hash: number[],
    buttons: ButtonPositions
  }[] = [{
    hash: [16, 16, 16, 30113, 40214, 60110, 70211, 1050203, 1070207, 1090209, 1110213],
    buttons: [
      {clockwise: {x: 0, y: 1}, counterclockwise: {x: 0, y: 3}},
      {clockwise: {x: 12, y: 5}, counterclockwise: {x: 12, y: 3}},
      {clockwise: {x: 4, y: 9}, counterclockwise: {x: 6, y: 9}},
    ]
  }, {
    hash: [16, 16, 16, 10115, 20214, 60210, 70109, 1010215, 1070209],
    buttons: [
      {clockwise: {x: -1, y: 3}, counterclockwise: {x: -1, y: 5}},
      {clockwise: {x: 5, y: 9}, counterclockwise: {x: 7, y: 9}},
      {clockwise: {x: 13, y: 5}, counterclockwise: {x: 13, y: 3}},
    ]
  }, {
    hash: [10, 16, 18, 10, 30201, 40103, 60216, 80101, 1020217, 1040203, 1060205, 1070208, 1090210, 1100303, 1110214, 1120309, 2120304, 2150301],
    buttons: [
      {clockwise: {x: 12, y: 3}, counterclockwise: {x: 12, y: 1}},
      {clockwise: {x: 5, y: 0}, counterclockwise: {x: 2, y: 3}},
      {clockwise: {x: 5, y: 10}, counterclockwise: {x: 7, y: 10}},
      {clockwise: {x: 1, y: 6}, counterclockwise: {x: 1, y: 8}},
    ]
  },
    {
      hash: [28, 14, 14, 10113, 30101, 80201, 100203, 150206, 170208, 220108, 240110],
      buttons: [
        {clockwise: {x: 10, y: 0}, counterclockwise: {x: 2, y: 0}},
        {clockwise: {x: 0, y: 4}, counterclockwise: {x: 0, y: 6}},
        {clockwise: {x: 12, y: 6}, counterclockwise: {x: 12, y: 4}},
      ]
    },
    {
      hash: [16, 16, 16, 10115, 20214, 30103, 40204, 90207, 100106, 110211, 120112, 1010215, 1070209],
      buttons: [
        {clockwise: {x: 6, y: 9}, counterclockwise: {x: 8, y: 9}},
        {clockwise: {x: 0, y: 5}, counterclockwise: {x: 0, y: 7}},
        {clockwise: {x: 12, y: 3}, counterclockwise: {x: 12, y: 1}},
      ]
    },
    {
      hash: [16, 16, 16, 20115, 40103, 90104, 110114, 1060204, 1070211, 1110213, 1120202],
      buttons: [
        {clockwise: {x: 12, y: 7}, counterclockwise: {x: 12, y: 5}},
        {clockwise: {x: 11, y: 2}, counterclockwise: {x: 9, y: 0}},
        {clockwise: {x: 0, y: 3}, counterclockwise: {x: 0, y: 5}},
      ]
    },
    {
      hash: [12, 12, 12, 12, 10111, 30109, 50201, 70211, 1050301, 1070311, 2030309, 2050307],
      buttons: [
        {clockwise: {x: 3, y: 0}, counterclockwise: {x: 1, y: 2}},
        {clockwise: {x: 11, y: 2}, counterclockwise: {x: 9, y: 0}},
        {clockwise: {x: 1, y: 8}, counterclockwise: {x: 3, y: 10}},
        {clockwise: {x: 9, y: 10}, counterclockwise: {x: 11, y: 8}},
      ]
    },
    {
      hash: [16, 24, 20, 20105, 50203, 110217, 140101, 1020219, 1040201, 1110204, 1140209, 1160211, 1190216],
      buttons: [
        {clockwise: {x: 8, y: 0}, counterclockwise: {x: 4, y: 0}},
        {clockwise: {x: 12, y: 6}, counterclockwise: {x: 12, y: 2}},
        {clockwise: {x: 0, y: 6}, counterclockwise: {x: 0, y: 8}},
      ]
    },
    {
      hash: [16, 16, 16, 10115, 20214, 40204, 50105, 90107, 100206, 120212, 130113, 1010215, 1030203, 1090207, 1110211],
      buttons: [
        {clockwise: {x: 11, y: 7}, counterclockwise: {x: 11, y: 5}},
        {clockwise: {x: 5, y: 9}, counterclockwise: {x: 7, y: 9}},
        {clockwise: {x: 1, y: 5}, counterclockwise: {x: 1, y: 7}},
      ]
    }
  ]

  export function getButtons(shape: CelticKnots.PuzzleShape): ButtonPositions {
    const hash = CelticKnots.PuzzleShape.hash(shape)
    return button_positions.find(entry => lodash.isEqual(entry.hash, hash))?.buttons
  }

  type ButtonPositions = {
    clockwise: Vector2,
    counterclockwise: Vector2
  }[]

  function isBackground(color: [number, number, number]): boolean {
    const samples: [number, number, number][] = [
      [159, 145, 86],
      [177, 161, 95],
      [144, 131, 79]
    ]

    return lodash.max(samples.map(s => rgbSimilarity(s, color))) > 0.9
  }


  let rune_references: ImageFingerprint[] = undefined

  export async function getRuneReferences(): Promise<ImageFingerprint[]> {

    if (rune_references == undefined) {
      const atlas = await ImageDetect.imageDataFromUrl("/alt1anchors/knot_runes/atlas.png")

      const fingerprints: ImageFingerprint[] = []

      for (let i = 0; i < Math.floor(atlas.width / 12); i++) {
        fingerprints.push(ImageFingerprint.get(atlas, {x: i * 12, y: 0}, RUNE_REFERENCE_SIZE, RUNE_KERNEL_SIZE, ImageFingerprint.TypeRGB))
      }

      rune_references = fingerprints
    }

    return rune_references
  }

  function getTrackColor(samples: [number, number, number][]): { lane_id: number, certainty: number } {
    const refs: {
      track_id: number | null,
      colors: [number, number, number][]
    }[] =
      [
        {track_id: 0, colors: [[46, 46, 77], [45, 45, 75], [28, 28, 47], [28, 28, 47], [35, 25, 58], [50, 50, 85]]},// blue
        {track_id: 1, colors: [[137, 60, 43], [67, 29, 21], [97, 43, 30], [62, 27, 17]],}, // red
        {track_id: 2, colors: [[12, 12, 18], [11, 11, 16], [18, 18, 27]],}, //darkblue
        {track_id: 3, colors: [[43, 30, 0], [159, 112, 0], [205, 146, 0], [104, 74, 0], [137, 97, 0]]}, // yellow
        {track_id: 4, colors: [[95, 89, 76], [123, 116, 98], [30, 28, 24]]}, // gray
      ]

    const res = lodash.maxBy(refs.map(r => ({
      lane_id: r.track_id,
      certainty: lodash.sum(samples.map(col => lodash.max(r.colors.map(ref_color => rgbSimilarity(ref_color, col))))) / samples.length
    })), e => e.certainty)

    if (res.certainty > 0.8) return res
    else return null
  }

  export type Result = {
    state: CelticKnots.PuzzleState,
    buttons: {
      clockwise: Vector2,
      counterclockwise: Vector2
    }[]
  }

  let overlay: LegacyOverlayGeometry = new LegacyOverlayGeometry().withTime(2000)

  type Tile = {
    pos: Vector2,
    rune: {
      strip_color: number,
      neighbours_exist: boolean[],
      id: number,
      intersection: {
        matches: boolean
      } | null
    },
  }

  type Lane = {
    color: number,
    tiles: Tile[]
  }

  const directions: {
    offset: Vector2,
    background_sample_position: Vector2,
  }[] = [
    {offset: {x: -1, y: -1}, background_sample_position: {x: 0, y: 0}},
    {offset: {x: 1, y: -1}, background_sample_position: {x: 23, y: 0}},
    {offset: {x: 1, y: 1}, background_sample_position: {x: 24, y: 24}},
    {offset: {x: -1, y: 1}, background_sample_position: {x: 0, y: 24}},
  ]

  const track_color_sample_positions: Vector2[] = [
    {x: 11, y: -3},
    {x: 12, y: -3},
    {x: -5, y: 12},
    {x: -5, y: 13},
    {x: 29, y: 12},
    {x: 29, y: 13},
    {x: 11, y: 28},
    {x: 12, y: 28},
  ]

  const intersection_type_sample_positions: Vector2[] = [
    {x: 12, y: -1},
    {x: -1, y: 12},
    {x: 24, y: 12},
    {x: 12, y: 24},
  ]

  const intersection_sample_colors: {
    match: [number, number, number][],
    nomatch: [number, number, number][]
  } = {
    match: [[99, 178, 74], [86, 155, 64], [108, 195, 81], [130, 235, 98]],
    nomatch: [[60, 0, 0], [86, 0, 0], [92, 0, 0], [106, 0, 0]]
  }

  function isMatchingIntersection(samples: [number, number, number][]): boolean {
    const match_score = lodash.sum(samples.map(col => lodash.max(intersection_sample_colors.match.map(ref_color => rgbSimilarity(ref_color, col)))))
    const nomatch_score = lodash.sum(samples.map(col => lodash.max(intersection_sample_colors.nomatch.map(ref_color => rgbSimilarity(ref_color, col)))))

    return match_score > nomatch_score
  }

  const DEADZONE = {x: 70, y: 13}

  export class CapturedKnot {
    private img_data: ImageData
    private border_anchor: Vector2
    private anchor_grid_origin: Vector2
    private grid_size: Vector2
    private runes_on_odd_tiles: boolean
    private puzzle: CelticKnots.PuzzleState

    private interception_point: Vector2
    private grid: Tile[][]
    private lanes: Lane[]
    public isBroken = false
    public brokenReason: string = ""

    public relevant_body: CapturedImage

    constructor(public ui: CapturedModal, private reader: KnotReader) {
      this.relevant_body = ui.body.getSubSection({
        origin: DEADZONE,
        size: {
          x: ui.body.size.x - 2 * DEADZONE.x,
          y: ui.body.size.y - 2 * DEADZONE.y
        }
      })

      this.img_data = this.relevant_body.getData()
    }

    private findOrigin() {
      if (this.anchor_grid_origin) return

      const intercepted = ((): Vector2 => {
        let y = 5

        let above_was_background = true
        while (y < 200) {
          const pixel = {x: SCANNING_X, y: y}

          this.sample(pixel)

          const pixel_is_background = isBackground(this.sample(pixel))

          if (
            !pixel_is_background && above_was_background
            && !isBackground(this.sample({x: pixel.x, y: pixel.y + 24})) // Skip arrows
          ) return pixel

          above_was_background = pixel_is_background

          y++
        }

        return null
      })()

      if (!intercepted) {
        this.isBroken = true
        this.brokenReason = "Not intercepted"
        return
      }

      // Move intersection up as far as possible
      while (intercepted.y > 0) {
        if (!isBackground(this.sample(Vector2.add(intercepted, {x: -1, y: -1})))) {
          intercepted.x--
          intercepted.y--
        } else if (!isBackground(this.sample(Vector2.add(intercepted, {x: 1, y: -1})))) {
          intercepted.x++
          intercepted.y--
        } else break
      }

      this.interception_point = intercepted

      // Maybe move a pixel left in to get the left pixel of two pixels on the tip of the corner
      if (!isBackground(this.sample(Vector2.add(intercepted, {x: -1, y: 0})))) intercepted.x--

      this.border_anchor = intercepted

      const origin_of_a_tile = Vector2.add(this.border_anchor, FROM_ANCHOR_TO_TILE)

      const index_of_detected_rune = {
        x: Math.floor(origin_of_a_tile.x / TILE_SIZE.x),
        y: Math.floor(origin_of_a_tile.y / TILE_SIZE.y),
      }

      this.anchor_grid_origin = Vector2.sub(origin_of_a_tile, Vector2.mul(TILE_SIZE, index_of_detected_rune))

      this.runes_on_odd_tiles = (index_of_detected_rune.x + index_of_detected_rune.y) % 2 == 1

      this.grid_size = {
        x: Math.floor((this.relevant_body.size.x - this.anchor_grid_origin.x) / TILE_SIZE.x),
        y: Math.floor((this.relevant_body.size.y - this.anchor_grid_origin.y) / TILE_SIZE.y)
      }
    }

    public tileOrigin(tile: Vector2, on_screen: boolean = false): Vector2 {
      if (on_screen) {
        return Vector2.add(this.anchor_grid_origin, Vector2.mul(tile, TILE_SIZE), this.relevant_body.screenRectangle().origin)
      } else {
        return Vector2.add(this.anchor_grid_origin, Vector2.mul(tile, TILE_SIZE))
      }
    }

    private sample(coords: Vector2): [number, number, number] {
      return this.img_data.getPixel(coords.x, coords.y) as unknown as [number, number, number]
    }

    private readGrid(): void {
      if (this.grid) return

      this.findOrigin()

      if (this.isBroken) return

      this.grid = new Array(this.grid_size.y)

      for (let y = 0; y < this.grid_size.y; y++) {
        this.grid[y] = new Array(this.grid_size.x)

        for (let x = 0; x < this.grid_size.x; x++) {
          if (((x + y) % 2 == 1) != this.runes_on_odd_tiles) continue

          this.grid[y][x] = this.readTile({x, y})
        }
      }

      const valid_tiles = count(this.grid.flat(), t => !!t.rune)

      if (valid_tiles < 20) {
        this.brokenReason = "Not enough valid tiles"
        this.isBroken = true
      }
    }

    private readTile(pos: Vector2): Tile {
      const tile_origin = this.tileOrigin(pos)

      const background = directions.map(pos => isBackground(this.sample(Vector2.add(tile_origin, pos.background_sample_position)))) as [boolean, boolean, boolean, boolean]

      const background_neighbours = count(background, identity)

      if (background_neighbours > 2) return {pos: pos, rune: null}

      const is_intersection = background_neighbours < 2

      const track_color = getTrackColor(track_color_sample_positions.map(pos => this.sample(Vector2.add(tile_origin, pos))))

      let intersection_matches = false

      if (is_intersection) {
        intersection_matches = isMatchingIntersection(
          intersection_type_sample_positions.map(pos => this.sample(Vector2.add(tile_origin, pos)))
        )
      }

      const rune_fingerprint = ImageFingerprint.get(this.img_data, Vector2.add(tile_origin, {x: 7, y: 7}), RUNE_REFERENCE_SIZE, RUNE_KERNEL_SIZE, ImageFingerprint.TypeRGB)

      const rune = this.reader.identifyRune(rune_fingerprint)

      if (rune == null) {
        return {pos: pos, rune: null}
      }

      return {
        pos: pos,
        rune: {
          id: rune,
          strip_color: track_color?.lane_id ?? 5,
          neighbours_exist: background.map(e => !e),
          intersection: is_intersection ? {matches: intersection_matches} : null
        }
      }
    }

    private findLanes() {
      if (this.lanes) return

      this.readGrid()

      this.lanes = []

      if (this.isBroken) return

      while (true) {
        const start_tile = this.grid.flat().find(t => t.rune && !t.rune.intersection && !this.lanes.some(l => l.color == t.rune.strip_color))

        if (!start_tile) {
          break
        }

        const lane: Lane = {
          color: start_tile.rune.strip_color,
          tiles: []
        }

        let d = 2

        let tile = start_tile

        while (true) {
          lane.tiles.push(tile)

          const tile_i = Vector2.add(tile.pos, directions[d].offset)

          tile = this.grid[tile_i.y][tile_i.x]

          if (!tile?.rune || tile == start_tile || lane.tiles.length > 40) break

          if (!tile.rune.intersection && !tile.rune.neighbours_exist[d]) {
            d = [0, 1, 2, 3].find(i => i != (d + 2) % 4 && tile.rune.neighbours_exist[i])
          }
        }

        if (lane.tiles.length >= 10) {
          this.lanes.push(lane)
        } else {
          this.brokenReason = `Lane too short: ${lane.tiles.length}`
          this.isBroken = true
          break;
        }
      }

      if (this.lanes.length < 3) {
        this.brokenReason = `Not enough lanes: ${this.lanes.length}`
        this.isBroken = true
      }
    }

    public readPuzzle(): CelticKnots.PuzzleState {
      if (this.puzzle) return this.puzzle

      this.findLanes()

      if (this.isBroken) return null

      const locks: CelticKnots.Lock[] = []

      const lock_positions: Vector2[] = []

      for (let lane_i = 0; lane_i < this.lanes.length; lane_i++) {
        const lane = this.lanes[lane_i]

        for (let tile_i = 0; tile_i < lane.tiles.length; tile_i++) {
          const tile = lane.tiles[tile_i]

          if (tile.rune.intersection && tile.rune.strip_color != lane.color) {
            const intersecting_lane_i = this.lanes.findIndex(l => l.color == tile.rune.strip_color)
            if (intersecting_lane_i < 0) {
              this.isBroken = true
              this.brokenReason = `Could not find intersecting lane for color ${tile.rune.strip_color}`
              continue
            }
            const intersecting_lane = this.lanes[intersecting_lane_i]

            const intersecting_tile_i = intersecting_lane.tiles.findIndex(t => t == tile)
            if (intersecting_tile_i < 0) {
              this.isBroken = true
              this.brokenReason = `Could not find tile in intersecting lane for ${lane_i}:${tile_i} with other line ${intersecting_tile_i}`
              continue
            }

            locks.push({
              first: {
                snake: lane_i,
                tile: tile_i,
              }, second: {
                snake: intersecting_lane_i,
                tile: intersecting_tile_i
              }
            })
            lock_positions.push(tile.pos)
          }
        }
      }

      return this.puzzle = {
        shape: {
          snake_lengths: this.lanes.map(l => l.tiles.length),
          locks: locks
        },
        snakes: this.lanes.map(lane => lane.tiles.map(t => {
          if (t.rune.intersection && !t.rune.intersection.matches && t.rune.strip_color != lane.color) return {value: t.rune.id, type: "isnot"}
          else return {value: t.rune.id, type: "is"}
        }))
      }
    }

    private _buttons = lazy(() => {
      const shape = this.readPuzzle()?.shape
      if (!shape) return null
      return getButtons(shape)
    })

    public getButtons(): ButtonPositions {
      return this._buttons.get()
    }

    public async showDebugOverlay(
      show_grid: boolean = false,
      text_mode: "runeid" | "neighbour_count" | "neighbour_array" = "runeid"
    ) {
      this.readPuzzle()

      const colors = [
        Alt1Color.blue,
        Alt1Color.red,
        Alt1Color.fromRGB(23, 23, 100), // darkblue
        Alt1Color.fromRGB(235, 167, 0),  // yellow
        Alt1Color.white,   // gray
      ]

      overlay?.clear()

      if (this.interception_point) {
        overlay.rect(
          Rectangle.centeredOn(Vector2.add(this.relevant_body.screenRectangle().origin, this.interception_point), 5),
          {
            color: Alt1Color.white,
            width: 2
          }
        )
      }

      for (let i = 0; i < this.lanes.length; i++) {
        const lane = this.lanes[i]

        if (lane.tiles.length > 1) {
          overlay.polyline(lane.tiles.map(t => Vector2.add(this.relevant_body.screenRectangle().origin, this.tileOrigin(t.pos), {x: 12, y: 12})),
            true,
            {
              color: colors[lane.color],
              width: 2
            }
          )
        } else if (lane.tiles.length == 1) {
          if (lane.tiles[0]?.pos) {
            overlay.rect(
              Rectangle.centeredOn(Vector2.add(this.relevant_body.screenRectangle().origin, this.tileOrigin(lane.tiles[0].pos), {x: 12, y: 12}), 5),
              {
                color: colors[lane.color],
                width: 2
              }
            )
          } else debugger
        }
      }

      if (this.grid_size) {

        for (let x = 0; x < this.grid_size.x; x++) {
          for (let y = 0; y < this.grid_size.y; y++) {

            const o = Vector2.add(this.relevant_body.screenRectangle().origin, this.tileOrigin({x, y}))

            const t1 = this.grid[y]
            if (!t1) debugger

            const tile = t1[x]

            if (!tile) continue

            if (show_grid) {
              overlay.rect(Rectangle.fromOriginAndSize(o, TILE_SIZE),
                {color: Alt1Color.red, width: 1}
              )
            }

            if (tile.rune) {
              const text = (() => {
                switch (text_mode) {
                  case "neighbour_array":
                    return `${tile.rune.neighbours_exist[0] ? "t" : " "}   ${tile.rune.neighbours_exist[1] ? "t" : " "}\n${tile.rune.neighbours_exist[3] ? "t" : " "}   ${tile.rune.neighbours_exist[2] ? "t" : " "}`
                  case "neighbour_count":
                    return count(tile.rune.neighbours_exist, identity).toString()
                  case "runeid":
                    return tile.rune.id.toString()
                }
              })()

              overlay.text(text, Vector2.add(o, Vector2.scale(0.5, TILE_SIZE)), {
                  width: 12,
                  shadow: true,
                  color: text_mode == "runeid" ? colors[tile.rune.strip_color] : Alt1Color.white,
                  centered: true
                }
              )

            }
          }
        }
      }

      overlay.render()
    }
  }
}