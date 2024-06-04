import * as lodash from "lodash";
import {util} from "../util/util";

export namespace Lockboxes {


  export type Tile = 0 // Sword
    | 1 // Bow
    | 2 // Mage

  export const SIZE = 5

  export namespace Tile {
    export function advance(tile: Tile): Tile {
      return (tile + 1) % 3 as Tile
    }
  }

  export type State = {
    tile_rows: Tile[][]
  }

  export type MoveMap = Tile[][]

  export namespace MoveMap {
    import count = util.count;
    export const None: MoveMap = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]

    export const BASIC_QUIET_PATTERNS: MoveMap[] = [
      [
        [1, 0, 0, 0, 2],
        [2, 2, 0, 1, 1],
        [1, 2, 0, 1, 2],
        [1, 1, 0, 2, 2],
        [0, 2, 0, 1, 0]
      ],
      [
        [0, 1, 0, 2, 0],
        [2, 2, 0, 1, 1],
        [2, 1, 0, 2, 1],
        [1, 1, 0, 2, 2],
        [2, 0, 0, 0, 1],
      ],
      [
        [0, 0, 1, 0, 1],
        [0, 2, 2, 1, 2],
        [1, 2, 0, 1, 2],
        [0, 1, 1, 2, 1],
        [1, 2, 2, 1, 1]
      ]
    ]

    export function repeat(moves: MoveMap, repetition: number): MoveMap {
      return moves.map(row => row.map(m => (m * repetition) % 3)) as MoveMap
    }

    export function get(moves: MoveMap, row: number, col: number): Tile {
      if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return 0
      else return moves[row][col]
    }

    export function chain(...moves: MoveMap[]): MoveMap {
      return None.map((row, row_i) => {
        return row.map((_, col_i) => {
          return lodash.sumBy(moves, m => m[row_i][col_i]) % 3 as Tile
        })
      })
    }

    export function score(profile: [number, number, number]): (_: MoveMap) => number {
      return m => lodash.sum(m.flat().map(m => profile[m]))
    }

    export const clickScore = score([0, 1, 2])
    export const tileScore = score([0, 1, 1])
    export const hybridScore = score([0, 1, 1.3])

    export function isQuiet(map: MoveMap): boolean {
      return State.equals(State.applyMoves(State.SOLVED, map), State.SOLVED)
    }

    let all_quiet_patterns: MoveMap[] = null

    export function allQuietPatterns(): MoveMap[] {
      if (!all_quiet_patterns) {
        // This is taken from the JS implementation at https://www.jaapsch.net/puzzles/lights.htm#java2000
        // It doesn't really match the text description there, so it might not actually be optimal

        const mults = [0, 1, 2].flatMap(a => [0, 1, 2].flatMap(b => [0, 1, 2].map(c => [a, b, c])))

        all_quiet_patterns = mults.map(([a, b, c]) =>
          MoveMap.chain(
            repeat(BASIC_QUIET_PATTERNS[0], a),
            repeat(BASIC_QUIET_PATTERNS[1], b),
            repeat(BASIC_QUIET_PATTERNS[2], c),
          )
        )
      }

      return all_quiet_patterns
    }

    export function minimize(map: MoveMap, by: (_: MoveMap) => number = MoveMap.clickScore): MoveMap {
      return lodash.minBy(allQuietPatterns().map(quiet => chain(map, quiet)), by)
    }
  }

  export namespace State {
    export const SOLVED: State = {
      tile_rows: [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ]
    }

    /**
     * A lockbox is solved if all tiles have the same value
     */
    export function isSolved(state: State): boolean {
      const ref = state.tile_rows[0][0]
      return state.tile_rows.every(r => r.every(t => t == ref))
    }

    export function equals(a: State, b: State): boolean {
      for (let col = 0; col < 5; col++) {
        for (let row = 0; row < 5; row++) {
          if (a.tile_rows[row][col] != b.tile_rows[row][col]) return false
        }
      }
      return true
    }

    export function applyMoves(state: State, move: MoveMap): State {
      return {
        tile_rows: state.tile_rows.map((row, row_i) =>
          row.map((tile, col_i) =>
            (
              tile
              + MoveMap.get(move, row_i, col_i)
              + MoveMap.get(move, row_i + 1, col_i)
              + MoveMap.get(move, row_i - 1, col_i)
              + MoveMap.get(move, row_i, col_i + 1)
              + MoveMap.get(move, row_i, col_i - 1)
            ) % 3 as Tile
          )
        )
      }
    }

    export function toString(state: State): string {
      return state.tile_rows.map(r => r.join("  ")).join("\n")
    }
  }

  function basicSolve(state: State): MoveMap {

    function chasing(s: State): [MoveMap, State] {
      let moves = MoveMap.None

      for (let chased_row = 0; chased_row < 4; chased_row++) {
        const partial = MoveMap.None.map((row, row_i) => {
          if (row_i == chased_row + 1) return s.tile_rows[chased_row].map(s => (3 - s) % 3 as Tile)
          else return row
        })

        s = State.applyMoves(s, partial)

        moves = MoveMap.chain(moves, partial)
      }

      return [moves, s]
    }

    const [first_chasing_moves, state_after_first_chasing] = chasing(state)

    const B1 = [0, 2, 1][state_after_first_chasing.tile_rows[4][0]] as Tile// If the light at A5 is red then press B1 twice, if it is green press it once.
    const A1B1 = [0, 2, 1][state_after_first_chasing.tile_rows[4][1]] as Tile// If the light at B5 is red then press A1 and B1 twice, if it is green press them once.

    const magic_solve: MoveMap = [
      [A1B1, (A1B1 + B1) % 3 as Tile, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]

    const state_after_magic_solve = State.applyMoves(state_after_first_chasing, magic_solve)

    const [second_chasing_moves, state_after_second_chasing] = chasing(state_after_magic_solve)

    return MoveMap.chain(first_chasing_moves, magic_solve, second_chasing_moves)
  }

  export function solve(state: State, anytarget: boolean = true, minimize: boolean = true, cost: (_: MoveMap) => number = MoveMap.clickScore): MoveMap {
    const candidate_starts = [state]

    if (anytarget) {
      candidate_starts.push(...[1, 2].map(o => ({
        tile_rows: state.tile_rows.map(row => row.map(t => (t + o) % 3 as Tile))
      })))
    }

    let solutions = candidate_starts.map(basicSolve)

    if (minimize) solutions = solutions.map(s => MoveMap.minimize(s, cost))

    return lodash.minBy(solutions, cost)
  }
}