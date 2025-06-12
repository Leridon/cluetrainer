import {Sliders} from "../lib/cluetheory/Sliders";
import {SlideReader} from "../trainer/ui/neosolving/cluereader/SliderReader";
import {ImageDetect} from "alt1";
import {ScuffedTesting} from "./test_framework";
import SliderState = Sliders.SliderState;
import SliderPuzzle = Sliders.SliderPuzzle;
import assert = ScuffedTesting.assert;
import DETECTION_THRESHOLD_SCORE = SlideReader.DETECTION_THRESHOLD_SCORE;

export async function test_slide_reader(): Promise<void> {

  const reader = await SlideReader.instance()

  const data: {
    file: string, expected: {
      theme: string,
      state:
        SliderState
    }
  }[] = [
    {
      file: "/test_assets/sliders/castle_scrambled.png", expected:
        {
          theme: "castle", state:
            [2, 20, 6, 0, 16,
              4, 21, 1, 3, 8,
              9, 5, 13, 7, 18,
              19, 10, 14, 22, 15,
              11, 17, 23, 12, 24
            ]
        }
    },
    {file: "/test_assets/sliders/castle_solved.png", expected: {theme: "castle", state: SliderState.SOLVED}},
    {file: "/test_assets/sliders/tree_solved.png", expected: {theme: "tree", state: SliderState.SOLVED}},
    {file: "/test_assets/sliders/pharaoh_solved.png", expected: {theme: "menaphos_pharaoh", state: SliderState.SOLVED}},
    {file: "/test_assets/sliders/troll_solved.png", expected: {theme: "troll", state: SliderState.SOLVED}},
    {
      file: "/test_assets/sliders/bridge_swapped.png", expected: {
        theme: "bridge", state:
          [0, 1, 2, 3, 4,
            5, 6, 7, 8, 9,
            10, 11, 12, 13, 14,
            15, 16, 21, 18, 19,
            17, 20, 22, 23, 24]
      }
    },
    {
      file: "/test_assets/sliders/greg_scrambled_low_graphhics.png", expected: {
        theme: "gregorovic", state:
          [5, 8, 13, 4, 1,
            2, 20, 0, 14, 3,
            16, 7, 10, 15, 6,
            11, 12, 19, 21, 9,
            18, 17, 23, 22, 24]
      }
    },
    {
      file: "/test_assets/sliders/tree_scrambled.png", expected: {
        theme: "tree", state:
          [0, 6, 24, 3, 4,
            5, 13, 8, 17, 18,
            10, 1, 2, 11, 23,
            15, 16, 14, 22, 21,
            7, 20, 19, 12, 9]
      }
    },
    {
      file: "/test_assets/sliders/tree_scrambled2.png", expected: {
        theme: "tree", state:
          [19, 4, 3, 1, 0,
            2, 14, 7, 8, 13,
            23, 11, 18, 20, 6,
            16, 9, 21, 10, 5,
            12, 15, 17, 22, 24]
      }
    },
    {
      file: "/test_assets/sliders/tree_scrambled3.png", expected: {
        theme: "tree", state:
          [23, 2, 12, 4, 10,
            0, 3, 24, 1, 5,
            8, 14, 11, 9, 21,
            13, 17, 18, 16, 22,
            7, 6, 15, 19, 20]
      }
    },
    {
      file: "/test_assets/sliders/tree_scrambled4.png", expected: {
        theme: "tree", state:
          [0, 3, 4, 19, 2,
            24, 18, 16, 6, 11,
            7, 20, 17, 1, 14,
            8, 9, 15, 13, 5,
            22, 21, 23, 10, 12]
      }
    },
    {
      file: "/test_assets/sliders/rax_solved.png", expected: {theme: "araxxor", state: SliderState.SOLVED}
    },
    {file: "/test_assets/sliders/rax_solved2.png", expected: {theme: "araxxor", state: SliderState.SOLVED}},
    {file: "/test_assets/sliders/desert_negative.png", expected: null},
  ]

  let correct = 0

  for (let test_case of data) {
    const img = await ImageDetect.imageDataFromUrl(test_case.file)

    const res = reader.identify(img,
      //test_case.expected.theme
    )

    const tiles = SliderPuzzle.getState(res)

    if ((test_case.expected && res.theme == test_case.expected.theme && SliderState.equals(tiles, test_case.expected.state))
      || !test_case.expected && res.match_score < DETECTION_THRESHOLD_SCORE
    ) {
      correct++
      //console.log(`SUCCESS ${test_case.file}`)
    } else if (test_case.expected == null && res.match_score >= DETECTION_THRESHOLD_SCORE) {
      console.log(`ERROR ${test_case.file}`)
      console.log(`Expected no puzzle, but found ${res.theme} (${(res.match_score * 100).toFixed(1)}%):`)
      console.log(tiles)
      debugger

    } else {
      console.log(`ERROR ${test_case.file}`)
      console.log(`Expected ${test_case.expected.theme}:`)
      console.log(SliderState.toString(test_case.expected.state))
      console.log(`Got ${res.theme}:`)
      console.log(SliderState.toString(tiles))
      debugger
    }
  }

  assert(correct == data.length)
}