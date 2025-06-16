import {ImageDetect} from "alt1";
import * as lodash from "lodash";
import {Sliders} from "../../../../lib/cluetheory/Sliders";
import {ImageFingerprint} from "../../../../lib/util/ImageFingerprint";
import {deps} from "../../../dependencies";
import {Vector2} from "../../../../lib/math";
import {async_lazy, LazyAsync} from "../../../../lib/Lazy";
import {Log} from "../../../../lib/util/Log";
import {util} from "../../../../lib/util/util";
import SliderPuzzle = Sliders.SliderPuzzle;
import log = Log.log;
import findBestMatch = util.findBestMatch;

export class SliderReader {
  constructor(private references: Record<string, Sliders.SliderPuzzle>,
              private blanks: ImageFingerprint[]) {

  }

  identify(image: ImageData, known_theme: string = undefined): SliderPuzzle {
    // Parse the slider image from screen
    const tiles = SlideReader.parseSliderImage(image, 7)

    let tile_scores: {
      tile: Sliders.Tile,
      reference_tile: Sliders.Tile,
      score: number
    }[] = []

    const blank_refs = this.blanks
    const compare_to = known_theme
      ? [this.references[known_theme]]
      : Object.values(this.references)

    for (let tile of tiles.tiles) {
      const best_blank_match = findBestMatch(blank_refs, (blank_ref) => ImageFingerprint.similarity(tile.signature, blank_ref))

      for (let slider of compare_to) {
        for (let ref_tile of slider.tiles) {
          tile_scores.push({
            tile: tile,
            reference_tile: ref_tile,
            score:
              ref_tile.position == 24
                ? best_blank_match.score
                : ImageFingerprint.similarity(tile.signature, ref_tile.signature)
          })

        }
      }
    }

    const grouped = lodash.groupBy(tile_scores, e => e.reference_tile.theme)

    const matches: {
      theme: string,
      all_match_pairs: (typeof tile_scores)[number][],
      preliminary_best_matching: {
        score: number,
        match: (typeof tile_scores)[number][]
      }
    }[] = Object.entries(grouped).map(([theme, tile_matches]) => {
      const sorted = lodash.sortBy(tile_matches, e => -e.score)

      const matched_tiles: (typeof tile_scores)[number][] = new Array(25).fill(null)

      const tiles_used: boolean[] = new Array(25).fill(false)
      for (let match of sorted) {
        if (matched_tiles[match.tile.position]) continue
        if (tiles_used[match.reference_tile.position]) continue

        if (SlideReader.DEBUG_SLIDE_READER) {
          console.log(`Matching ${match.tile.position} to reference tile #${match.reference_tile.position}, score ${match.score.toFixed(3)}`)

          console.log(match.tile.signature)
          console.log(match.reference_tile.signature)
        }

        matched_tiles[match.tile.position] = match
        tiles_used[match.reference_tile.position] = true
      }

      if (SlideReader.DEBUG_SLIDE_READER) console.log(`Matched ${theme}, total score ${lodash.sumBy(matched_tiles, t => t.score).toFixed(3)}`)

      if (SlideReader.DEBUG_SLIDE_READER) {
        const debug_for: number[] = []

        for (let ref_tile of debug_for) {
          console.log(`Similarity to reference tile ${ref_tile}`)

          const tiles = lodash.sortBy(tile_matches.filter(m => m.reference_tile.position == ref_tile), e => e.tile.position)

          for (let y = 0; y < 5; y++) {
            console.log(tiles.slice(y * 5, (y + 1) * 5).map(t => t.score.toFixed(2)).join(", "));
          }

          console.log()
        }

        console.log("Chosen similarity")

        for (let y = 0; y < 5; y++) {
          console.log(matched_tiles.slice(y * 5, (y + 1) * 5).map(t => t.score.toFixed(2)).join(", "));
        }
      }

      return {
        theme: theme,
        all_match_pairs: tile_matches,
        preliminary_best_matching: {
          score: lodash.sumBy(matched_tiles, e => e.score) / matched_tiles.length,
          match: matched_tiles
        }
      }
    })

    const greedy_best = lodash.maxBy(matches, m => m.preliminary_best_matching.score)

    if (SlideReader.DEBUG_SLIDE_READER) {
      const perfect_pairs = greedy_best.all_match_pairs.filter(e => e.score == 1)
      console.log(`Perfect score pairs ${perfect_pairs.length}`)

      perfect_pairs.forEach(e => {
        console.log((`Perfect Match: Tile ${e.tile.position} with ${e.reference_tile.position}`))
      })
    }

    const DO_BACKTRACKING_IMPROVEMENT =
      deps().app.settings.settings.solving.puzzles.sliders.improve_slider_matches_backtracking
      && greedy_best.preliminary_best_matching.score > SlideReader.DETECTION_THRESHOLD_SCORE

    if (DO_BACKTRACKING_IMPROVEMENT) {
      let best: (typeof tile_scores)[number][] = greedy_best.preliminary_best_matching.match
      let best_score = greedy_best.preliminary_best_matching.score * 25
      const working_tiles = new Array(25).fill(null)

      const max_improvements = new Array(25).fill(0).map((_, i) => {
        return Math.max(...greedy_best.all_match_pairs.slice(i * 25, (i + 1) * 25).map(e => e.score))
      })

      for (let i = 23; i >= 0; i--) {
        max_improvements[i] += max_improvements[i + 1]
      }

      const reference_used = new Array(25).fill(false)

      let seen = 0

      function backtracking(i: number, similarity_so_far: number) {
        seen++

        if (seen > 10000) return

        if (i >= 25) {
          if (similarity_so_far > best_score) {
            log().log(`Backtracking found a better match from ${best_score} to ${similarity_so_far}`, "Slide Reader")

            best = [...working_tiles]
            best_score = similarity_so_far
          }

          return;
        }

        for (let index = 0; index < 25; index++) {
          const match = greedy_best.all_match_pairs[i * 25 + index]

          if (reference_used[match.reference_tile.position] || match.score < SlideReader.DETECTION_THRESHOLD_SCORE || (similarity_so_far + match.score) + max_improvements[i + 1] <= best_score) {
            continue
          }

          working_tiles[i] = match
          reference_used[match.reference_tile.position] = true
          backtracking(i + 1, similarity_so_far + match.score)
          reference_used[match.reference_tile.position] = false
        }
      }

      if (SlideReader.DEBUG_SLIDE_READER) console.log(`Potential ${max_improvements[0]} vs. ${best_score}`)

      const better_match_max_exist = max_improvements[0] > best_score
      if (better_match_max_exist) {
        backtracking(0, 0)
      }

      if (SlideReader.DEBUG_SLIDE_READER) console.log(`Before BT: ${greedy_best.preliminary_best_matching.score}, After BT: ${best_score / 25}`)

      return {
        tiles: best.map(m => m.reference_tile),
        theme: greedy_best.theme,
        match_score: best_score / 25
      }
    } else {
      return {
        tiles: greedy_best.preliminary_best_matching?.match.map(e => e.reference_tile),
        theme: greedy_best.theme,
        match_score: greedy_best.preliminary_best_matching.score
      }
    }
  }
}

export namespace SlideReader {
  import SliderPuzzle = Sliders.SliderPuzzle;
  import Tile = Sliders.Tile;
  const _instance = async_lazy(async () => new SliderReader(await reference_sliders.get(), await _blank_tile_reference.get()))

  export async function instance(): Promise<SliderReader> {
    return _instance.get()
  }


  export const DETECTION_THRESHOLD_SCORE = 0.9

  export const DEBUG_SLIDE_READER = false

  export const SLIDER_SIZE = 5

  export const KERNEL_INTERVAL = 7

  export const TILE_SIZE = 49

  export function parseTile(img: ImageData, offset: Vector2): ImageFingerprint {
    return ImageFingerprint.get(img, offset,
      {x: TILE_SIZE, y: TILE_SIZE},
      {x: KERNEL_INTERVAL, y: KERNEL_INTERVAL}
    )
  }

  /**
   * Parses the tiles of a slider image from a reference image.
   * Tiles are assumed to be 49 by 49 pixels.
   *
   * @param img The image to parse.
   * @param gutter The size of the gap between pixels. For clean reference images this is 0, for captures images from Alt1 this should be 7.
   * @param known_theme The theme of the slider if known
   */
  export function parseSliderImage(img: ImageData, gutter: number = 0, known_theme: string = undefined): SliderPuzzle {
    // Assumes a slider size of 245 x 245!
    const tiles: Tile[] = []

    for (let y = 0; y < SLIDER_SIZE; y++) {
      for (let x = 0; x < SLIDER_SIZE; x++) {
        tiles.push(
          {
            theme: known_theme,
            position: y * SLIDER_SIZE + x,
            signature: parseTile(img, {x: x * (TILE_SIZE + gutter), y: y * (TILE_SIZE + gutter)})
          }
        )
      }
    }

    return {tiles, theme: known_theme}
  }

  const reference_sliders: LazyAsync<Record<string, Sliders.SliderPuzzle>> = async_lazy<Record<string, SliderPuzzle>>(async () => {
    const themes = ["adventurer", "araxxor", "archers", "black_dragon", "bridge", "castle", "clan_citadel", "corporeal_beast", "drakan_bloodveld",
      "elves", "general_graardor", "gregorovic", "helwyr", "ice_strykewyrm", "menaphos_pharaoh", "nomad", "nymora", "seal", "sword_of_edicts", "tree", "troll", "tuska", "v", "vanstrom_klause", "werewolf", "wizard", "wyvern"
    ]

    const unused_themes = []

    return Object.fromEntries(await Promise.all(themes.map(async theme => {
      return [theme, parseSliderImage(await ImageDetect.imageDataFromUrl(getThemeImageUrl(theme)),
        0,
        theme)]
    })))
  })

  export const _blank_tile_reference: LazyAsync<ImageFingerprint[]> = async_lazy(async () => {
    const data = await ImageDetect.imageDataFromUrl("/alt1anchors/sliders/blanktiles.png")

    const tile_number = data.width / TILE_SIZE

    const variants: ImageFingerprint[] = []

    for (let i = 0; i < tile_number; i++) {
      variants.push(parseTile(data, {x: i * TILE_SIZE, y: 0}))
    }

    return variants
  })

  export function getThemeImageUrl(theme: string): string {
    return `alt1anchors/sliders/${theme}.png`
  }
}