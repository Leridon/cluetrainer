import lodash from "lodash";
import {Sliders} from "../cluetrainer/cluetheory/Sliders";
import {ScuffedTesting} from "./test_framework";
import assert = ScuffedTesting.assert;
import testset = ScuffedTesting.testset;

export const test_slider_moves = testset("Slider Moves",
  test_slider_move_attachment,
  test_slider_move_compression,
  test_slider_move_expansion
)

export async function test_slider_move_attachment(): Promise<void> {
  const test_cases: {
    existing: Sliders.MoveList,
    attachment: Sliders.MoveList,
    expected_result: Sliders.MoveList
  }[] = [
    {existing: [-2, -10], attachment: [-5, 2], expected_result: [-2, -15, 2]},
    {existing: [1, 5, 1], attachment: [-1, 5], expected_result: [1, 10]},
    {existing: [5], attachment: [1], expected_result: [5, 1]},
  ]

  let success = true

  for (const test_case of test_cases) {
    const combined = Sliders.MoveList.combine(test_case.existing, test_case.attachment, true)

    if (!lodash.isEqual(combined, test_case.expected_result)) {
      console.log(`Expected ${test_case.expected_result.join(",")}`)
      console.log(`Got ${combined.join(",")}`)

      success = false
    }
  }

  assert(success)
}


export async function test_slider_move_compression(): Promise<void> {
  const test_cases: {
    original: Sliders.MoveList,
    compressed: Sliders.MoveList,
  }[] = [
    {original: [], compressed: []},
    {original: [1, 1], compressed: [2]},
    {original: [1, 3], compressed: [4]},
    {original: [-1, 3], compressed: [2]},
    {original: [5, -1, 3, 10], compressed: [5, 2, 10]},
    {original: [1, 5, 10, 3], compressed: [1, 15, 3]},
    {original: [1, 5, 1, 10, 3], compressed: [1, 5, 1, 10, 3]},
  ]

  let success = true

  for (const test_case of test_cases) {
    const combined = Sliders.MoveList.compress(test_case.original)

    if (!lodash.isEqual(combined, test_case.compressed)) {
      console.log(`Expected ${test_case.compressed.join(",")}`)
      console.log(`Got ${combined.join(",")}`)

      success = false
    }
  }

  assert(success)
}

export async function test_slider_move_expansion(): Promise<void> {
  const test_cases: {
    original: Sliders.MoveList,
    expanded: Sliders.MoveList,
  }[] = [
    {original: [], expanded: []},
    {original: [5], expanded: [5]},
    {original: [-5], expanded: [-5]},
    {original: [-10], expanded: [-5, -5]},
    {original: [4, 5, 10], expanded: [1, 1, 1, 1, 5, 5, 5]},
  ]

  let success = true

  for (const test_case of test_cases) {
    const combined = Sliders.MoveList.expand(test_case.original)

    if (!lodash.isEqual(combined, test_case.expanded)) {
      console.log(`Expected ${test_case.expanded.join(",")}`)
      console.log(`Got ${combined.join(",")}`)

      success = false
    }
  }

  assert(success)
}