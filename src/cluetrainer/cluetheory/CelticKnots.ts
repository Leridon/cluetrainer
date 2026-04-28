import lodash from "lodash"
import {util} from "../../lib/util/util";

export namespace CelticKnots {
  export type Element = { value: number, type: "is" | "isnot" }

  export namespace Element {
    export function maybeEqual(a: Element, b: Element): boolean {
      if (!a || !b) debugger

      if (a.type == "is" && b.type == "is") return a.value == b.value
      if (a.type == "is" && b.type == "isnot") return a.value != b.value
      if (a.type == "isnot" && b.type == "is") return a.value != b.value
      if (a.type == "isnot" && b.type == "isnot") return true
    }

    export function toString(e: Element) {
      switch (e.type) {
        case "is":
          return e.value.toString()
        case "isnot":
          return `!${e.value}`
      }
    }
  }

  export type TileIndex = {
    snake: number,
    tile: number
  }

  export type Lock = {
    first: TileIndex,
    second: TileIndex
  }

  export type Snake = Element[]

  export namespace Snake {
    export function rotate(snake: Snake, move: number): Snake {
      return snake.map((_, i) => snake[(i - move + snake.length) % snake.length])
    }

    export function index(snake: Snake, index: number): Element {
      return snake[(index + snake.length) % snake.length]
    }

    export function optimizeMove(snake: Snake, move: number): number {
      const positive = (move + snake.length) % snake.length

      const half = Math.floor(snake.length / 2)

      if (positive > half) return positive - snake.length
      else return positive
    }

    export function toString(snake: Snake): string {
      return snake.map(Element.toString).join(", ")
    }
  }

  export type PuzzleShape = {
    snake_lengths: number[],
    locks: Lock[]
  }

  export type PuzzleState = {
    shape: PuzzleShape,
    snakes: Element[][],
  }


  export namespace PuzzleShape {
    import natural_order = util.Order.natural_order;

    export function isEqual(a: PuzzleShape, b: PuzzleShape) {
      return lodash.isEqual(a.snake_lengths, b.snake_lengths) && a.locks.length == b.locks.length
    }

    export function hash(shape: PuzzleShape): number[] {
      return [...shape.snake_lengths, ...shape.locks.map(lock => {
        const [min, max] = lock.first.snake < lock.second.snake
          ? [lock.first, lock.second]
          : [lock.second, lock.first];

        return 10000 * (min.snake * 100 + min.tile) + (max.snake * 100 + max.tile)
      }).sort(natural_order)]
    }
  }

  export namespace PuzzleState {
    export function generate(shape: PuzzleShape): PuzzleState {
      const state: PuzzleState = {
        shape: shape,
        snakes: shape.snake_lengths.map(s => new Array(s).fill(0).map(() => ({value: lodash.random(20), type: "is"})))
      }

      shape.locks.forEach(({first, second}) => {
        state.snakes[second.snake][second.tile] = state.snakes[first.snake][first.tile]
      })

      return state
    }

    export function shuffle(state: PuzzleState): PuzzleState {
      return {
        shape: state.shape,
        snakes: state.snakes.map(snake => {
          const o = lodash.random(snake.length)
          return Snake.rotate(snake, o)
        })
      }
    }

    export function get(state: PuzzleState, index: TileIndex): Element {
      return state.snakes[index.snake][index.tile]
    }

    export function isSolved(state: PuzzleState): boolean {
      return state.shape.locks.every((lock) => lockMaybeSolved(state, lock))
    }

    export function doMove(state: PuzzleState, ...moves: Move[]): PuzzleState {
      return {
        snakes: state.snakes.map((snake, index) => {
          const move = moves.find(m => m.snake_index == index)

          if (move) return Snake.rotate(snake, move.offset)
          else return snake
        }),
        shape: state.shape
      }
    }

    export function lockMaybeSolved(state: PuzzleState, lock: Lock): boolean {
      const a = get(state, lock.first)
      const b = get(state, lock.second)

      return Element.maybeEqual(a, b)
    }

    export function equal(a: PuzzleState, b: PuzzleState): boolean {
      return lodash.isEqual(a, b)
    }
  }

  export type Move = {
    snake_index: number,
    offset: number
  }

  export type Moves = {
    moves: number[]
  }

  export type Solution = {
    end_state: PuzzleState,
    moves: Move[]
  }

  export function construct(shape: PuzzleShape, snakes: number[][]): PuzzleState {
    return {
      shape: shape,
      snakes: snakes.map(s => s.map(t => ({type: "is", value: t})))
    }
  }

  export namespace Solution {
    export function equals(a: Solution, b: Solution): boolean {
      return lodash.isEqual(a, b)
    }

    export function toString(a: Solution): string {
      return a.moves.map(m => `${m.snake_index}:${m.offset}`).join(",")
    }
  }

  export function unify(a: PuzzleState, b: PuzzleState): PuzzleState {
    if (!a || !b) return null

    if (!PuzzleShape.isEqual(a.shape, b.shape)) {
      return null
    }

    function unifyElement(a: Element, b: Element): Element {
      if (a.type == "is" && b.type == "is" && a.value == b.value) return a
      else if (a.type == "is" && b.type == "isnot" && a.value != b.value) return a
      else if (a.type == "isnot" && b.type == "is" && a.value != b.value) return b
      else if (a.type == "isnot" && b.type == "isnot") return b
      else return null
    }

    function unifyLane(a: Element[], b: Element[]): Element[] | null {
      const res: Element[] = []

      for (let i = 0; i < a.length; i++) {
        const el = unifyElement(a[i], b[i])

        if (!el) return null

        res.push(el)
      }

      return res
    }

    function findLaneUnification(a: Element[], b: Element[]): Element[] | null {
      for (let i = 0; i < a.length; i++) {
        const b_rotated = Snake.rotate(b, i)

        const res = unifyLane(a, b_rotated)

        if (res) return res
      }

      return null
    }

    const lanes: Snake[] = []

    for (let i = 0; i < a.snakes.length; i++) {
      const unified_lane = findLaneUnification(a.snakes[i], b.snakes[i])
      if (!unified_lane) return null

      lanes.push(unified_lane)
    }

    return {
      shape: a.shape,
      snakes: lanes
    }
  }

  export function solveAll(state: PuzzleState): {
    real: Solution[],
    maybe: Solution[],
    preferred: Solution | undefined
  } {

    // Solve every lock individually.
    // Use backtracking to find a combination of moves that solves all locks

    function backtracking(next_lock_index: number, state: PuzzleState, commited_moves: (Move | null)[]): Solution[] {
      if (next_lock_index >= state.shape.locks.length) {
        if (!PuzzleState.isSolved(state)) debugger

        // All locks are solved, return solution
        return [{
          end_state: state,
          moves: commited_moves.map((e, i) => e ?? {snake_index: i, offset: 0})
        }]
      }

      function recurseWith(move: Move, solved: boolean): Solution[] {
        commited_moves[move.snake_index] = move
        const res = backtracking(next_lock_index + (solved ? 1 : 0), PuzzleState.doMove(state, move), commited_moves)
        commited_moves[move.snake_index] = null

        return res
      }

      const lock = state.shape.locks[next_lock_index]

      if (commited_moves[lock.first.snake] == null && commited_moves[lock.second.snake] == null) {
        // Both snakes have no attached move yet. Just check all moves for one of them
        const moving_snake = state.snakes[lock.first.snake]

        return moving_snake.map<Move>((e, index) => {
          return {snake_index: lock.first.snake, offset: Snake.optimizeMove(moving_snake, index)}
        }).flatMap(m => recurseWith(m, false))
      } else if (commited_moves[lock.first.snake] == null || commited_moves[lock.second.snake] == null) {
        const [lock_on_locked_snake, lock_on_free_snake] = commited_moves[lock.first.snake]
          ? [lock.first, lock.second]
          : [lock.second, lock.first]

        const expected = state.snakes[lock_on_locked_snake.snake][lock_on_locked_snake.tile]

        const moving_snake = state.snakes[lock_on_free_snake.snake]

        return moving_snake.flatMap((e, index) => {
          if (Element.maybeEqual(e, expected))
            return recurseWith({snake_index: lock_on_free_snake.snake, offset: Snake.optimizeMove(moving_snake, lock_on_free_snake.tile - index)}, true)
          else
            return []
        })
      } else if (PuzzleState.lockMaybeSolved(state, lock)) {
        // If the lock is already solved, we can just continue with the next one without applying any move
        return backtracking(next_lock_index + 1, state, commited_moves)
      } else {
        // Both snakes are locked in but the lock is not solved. No possible solutions
        return []
      }
    }

    const solutions = backtracking(0, state, state.snakes.map(() => null))

    const real_solutions: Solution[] = []
    const maybe_solutions: Solution[] = []

    solutions.forEach(s => {
      if(s.end_state.shape.locks.every(lock =>
        s.end_state.snakes[lock.first.snake][lock.first.tile].type != "isnot" &&
        s.end_state.snakes[lock.second.snake][lock.second.tile].type != "isnot"
      )) {
        real_solutions.push(s)
      } else {
        maybe_solutions.push(s)
      }
    })

    const preferred = lodash.minBy(real_solutions, s => s.moves.map(m => Math.abs(m.offset))) ?? (maybe_solutions.length == 1 ? maybe_solutions[0] : undefined)

    return {real: real_solutions, maybe: maybe_solutions, preferred: preferred}
  }

  export function solve(state: PuzzleState): Solution {
    return solveAll(state).preferred
  }
}