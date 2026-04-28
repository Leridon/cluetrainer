import {CelticKnots} from "../cluetrainer/cluetheory/CelticKnots";
import {ScuffedTesting} from "./test_framework";
import fail = ScuffedTesting.fail;

export async function test_knot_solver(): Promise<void> {

  const simple_pair: CelticKnots.PuzzleShape = {
    snake_lengths: [8, 8], locks:
      [
        {first: {snake: 0, tile: 1}, second: {snake: 1, tile: 7}},
        {first: {snake: 0, tile: 3}, second: {snake: 1, tile: 5}},
      ]
  }

  const test_cases: {
    puzzle: CelticKnots.PuzzleState,
    expected_solution: CelticKnots.Solution
  }[] = [
    {
      puzzle: CelticKnots.construct(simple_pair, [[0, 1, 2, 3, 4, 5, 6, 7], [0, 3, 2, 1, 4, 5, 6, 7]]),
      expected_solution: {
        end_state: CelticKnots.construct(simple_pair, [[0, 1, 2, 3, 4, 5, 6, 7], [4, 5, 6, 7, 0, 3, 2, 1,]]),
        moves: [{snake_index: 0, offset: 0}, {snake_index: 1, offset: 4}]
      }
    },
  ]

  let success = true

  for (const test_case of test_cases) {
    const solution = CelticKnots.solve(test_case.puzzle)

    if (!CelticKnots.Solution.equals(solution, test_case.expected_solution)) {
      console.log(`Expected ${CelticKnots.Solution.toString(test_case.expected_solution)}`)
      console.log(`Got ${CelticKnots.Solution.toString(solution)}`)

      success = false
    }
  }

  if(!success) fail()
}