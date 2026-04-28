import {ewent} from "../../lib/reactive";
import lodash from "lodash";
import {Process} from "../../lib/Process";
import {util} from "../../lib/util/util";
import {ImageFingerprint} from "../../lib/util/ImageFingerprint";

export namespace Sliders {
  export type SliderPuzzle = { tiles: Tile[], theme?: string, match_score?: number }

  export namespace SliderPuzzle {
    export function getState(puzzle: SliderPuzzle): SliderState {
      return puzzle.tiles.map(t => t.position)
    }
  }

  export type Tile = { position: number, signature: ImageFingerprint, theme?: string }

  export type SliderState = number[]

  export namespace SliderState {
    export const BLANK_TILE = 24

    export const SOLVED: SliderState =
      [
        0, 1, 2, 3, 4,
        5, 6, 7, 8, 9,
        10, 11, 12, 13, 14,
        15, 16, 17, 18, 19,
        20, 21, 22, 23, 24
      ]

    export function equals(a: SliderState, b: SliderState): boolean {
      for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) return false
      }
      return true
    }

    export function withMove(state: SliderState, ...moves: Move[]): SliderState {
      const copy = [...state]

      moves.forEach(move => {
        const split_moves = Move.split(move)

        let blank = copy.indexOf(24)

        for (let move of split_moves) {
          copy[blank] = copy[blank + move]
          blank += move
        }

        copy[blank] = 24
      })

      return copy
    }

    export function blank(state: SliderState): number {
      return state.indexOf(BLANK_TILE)
    }

    export function findMove(before: SliderState, after: SliderState): Move | null {
      const blank_before = blank(before)
      const blank_after = blank(after)

      const move = blank_after - blank_before

      if (!Move.isValid(move)) return null
      if (!SliderState.equals(after, SliderState.withMove(before, move))) return null

      return move
    }

    export function neighbours(state: SliderState, multitile_allowed: boolean = true): SliderState[] {
      const open_tile = blank(state)

      const x = open_tile % 5
      const y = Math.floor(open_tile / 5)

      let moves: Move[] = []

      for (let xi = 0; xi < 5; xi++) {
        if (xi != x) moves.push(xi - x)
      }

      for (let yi = 0; yi < 5; yi++) {
        if (yi != y) moves.push((yi - y) * 5)
      }

      if (!multitile_allowed) moves = moves.filter(Move.isSmallStep)

      return moves.map(m => SliderState.withMove(state, m))
    }

    function manhatten(a: number, b: number) {
      return Math.abs(a % 5 - b % 5)
        + Math.abs(Math.floor(a / 5) - Math.floor(b / 5))
    }

    export function sumManhattenDistance(state: SliderState): number {
      return lodash.sumBy(state.map((target, position) =>
        target == 24 ? 0 :
          Math.abs(target % 5 - position % 5)
          + Math.abs(Math.floor(target / 5) - Math.floor(position / 5))
      ))
    }

    export function permutation_parity(state: SliderState): number {
      const visited = new Array(state.length).fill(false)

      let odd_cycles = 0
      let even_cycles = 0

      while (true) {
        const next = visited.indexOf(false)

        if (next < 0) break

        let cycle_length = 0

        let i = state[next]

        while (!visited[i]) {
          visited[i] = true
          i = state[i]
          cycle_length++
        }

        if (cycle_length % 2 == 0) even_cycles++
        else odd_cycles++
      }

      return even_cycles % 2
    }

    export function isSolveable(state: SliderState): boolean {
      return permutation_parity(state.filter(i => i != 24)) % 2 == 0
    }

    export function createRandom(): SliderState {
      let state: SliderState = null

      do {
        state = [...lodash.shuffle(SOLVED.slice(0, 24)), 24]
      } while (!isSolveable(state));

      return state
    }

    export function toString(state: SliderState) {
      return [0, 1, 2, 3, 4].map(row =>
        state.slice(row * 5, (row + 1) * 5)
          .map(t => ("  " + t.toString()).slice(-2)).join(", ")
      ).join("\n")
    }
  }

  export type SlideStateWithBlank = { tiles: SliderState, blank: number }

  export namespace SlideStateWithBlank {

    export function fromState(state: SliderState): SlideStateWithBlank {
      return {tiles: state, blank: SliderState.blank(state)}
    }

    export function doMove(state: SlideStateWithBlank, move: Move): void {
      const index = state.blank + move

      // TODO: This does not account for multi tile moves

      state.tiles[state.blank] = state.tiles[index]
      state.tiles[index] = SliderState.BLANK_TILE
    }

    export function copy(state: SlideStateWithBlank): SlideStateWithBlank {
      return lodash.cloneDeep(state)
    }
  }

  /**
   * A move is the index offset from the current position of tile 24 to the tile you need to click next.
   * Examples:
   *  -  1 = click tile right
   *  - -1 = click tile left
   *  -  5 = click tile below
   *  - -5 = click tile above
   *  -  3 = click 3 tiles right of blank tile
   */
  export type Move = number

  export namespace Move {
    export const all: Move[] = [-20, -15, -10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10, 15, 20]
    export const singletile_moves: Move[] = [-5, -1, 1, 5]
    export const multitile_moves: Move[] = all

    export const horizontal_mtm = [-4, -3, -2, -1, 1, 2, 3, 4]
    export const vertical_mtm = [-20, -15, -10, -5, 5, 10, 15, 20]

    export function split(move: Move): Move[] {
      const single_tile_move = Math.sign(move) * (Math.abs(move) >= 5 ? 5 : 1)

      const n = move / single_tile_move

      return new Array(n).fill(single_tile_move)
    }

    export function isSmallStep(move: Move): boolean {
      return [1, -1, 5, -5].includes(move)
    }

    export function isValid(move: Move): boolean {
      return [1, 2, 3, 4, 5, 10, 15, 20].includes(Math.abs(move))
    }

    export function isVertical(move: Move): boolean {
      return move % 5 == 0
    }
  }

  export type MoveList = Move[]

  export type AnnotatedMoveList = {
    pre_states: SliderState[],
    move: Move,
    clicked_tile: number,
    post_state: SliderState
  }[]

  export namespace MoveList {

    import index = util.index;
    import isVertical = Sliders.Move.isVertical;

    export function combine(first: MoveList, second: MoveList, multitile: boolean): MoveList {

      while (second.length > 0 && first.length > 0) {
        const needs_fixing =
          multitile
            ? Sliders.Move.isVertical(second[0]) == Sliders.Move.isVertical(index(first, -1))
            : second[0] == -index(first, -1)

        if (!needs_fixing) break

        second[0] += index(first, -1)

        first.splice(first.length - 1)

        if (second[0] == 0) second.splice(0, 1)
      }

      const res = [...first, ...second]

      return res
    }

    export function annotate(state: SliderState, moves: MoveList, prestates_multitile_allowed: boolean = true): AnnotatedMoveList {
      if (!moves) debugger

      const buffer: AnnotatedMoveList = []

      for (let move of moves) {
        state = SliderState.withMove(state, move)

        buffer.push({
          pre_states: SliderState.neighbours(state, prestates_multitile_allowed),
          post_state: state,
          move: move,
          clicked_tile: SliderState.blank(state)
        })
      }

      return buffer
    }

    /**
     * Compressed a list of single tile moves into a list of multitile moves.
     * @param moves
     */
    export function compress(moves: MoveList): MoveList {
      let i = 0

      const combined_moves: Move[] = []

      while (i < moves.length) {
        let move = moves[i]
        i++

        while (i < moves.length) {
          if (isVertical(moves[i]) != isVertical(move)) break
          move += moves[i]

          i++
        }

        if (move != 0) combined_moves.push(move)
      }

      return combined_moves
    }

    export function expand(moves: MoveList): MoveList {
      return moves.flatMap(Move.split)
    }

    export function fromTileList(tiles: number[], blank: number): MoveList {
      const moves: MoveList = []

      for (let tile of tiles) {
        moves.push(tile - blank)
        blank = tile
      }

      return moves
    }
  }

  export abstract class Solver {
    abstract instantiate(state: SliderState): SolvingProcess
  }

  /**
   * Abstract base class for solving processes for slider puzzles.
   * SlideSolvers are single-use for a specific starting state.
   */
  export abstract class SolvingProcess extends Process<MoveList> {
    private update_event = ewent<this>()
    private better_solution_found = ewent<MoveList>()
    protected best_solution: MoveList = null
    private use_first_solution: boolean = false

    private progress: number

    private compress_moves: boolean = false
    protected native_compression: boolean = false

    constructor(protected start_state: SliderState) {
      super()

      this.withInterrupt(50, 1)
        .onInterrupt(() => this.updateProgress())
    }

    setCombineStraights(value: boolean = true): this {
      this.compress_moves = value
      return this
    }

    registerSolution(moves: MoveList): this {
      if (this.native_compression != this.compress_moves) {
        if (this.compress_moves) moves = MoveList.compress(moves)
        else moves = MoveList.expand(moves)
      }

      if (!this.best_solution || moves.length < this.best_solution.length) {
        this.best_solution = moves
        this.better_solution_found.trigger(moves)

        if (this.use_first_solution) throw new SolvingProcess.SolutionFoundException()
      }

      return this
    }

    protected updateProgress() {
      this.progress = (Date.now() - this.start_time) / (this.end_time - this.start_time)

      this.update_event.trigger(this)
    }

    protected abstract solve_implementation(): Promise<void>

    override async implementation(): Promise<Sliders.MoveList> {
      try {
        await this.solve_implementation()
      } catch (e) { }

      return this.getBest()
    }

    onUpdate(f: (_: this) => void): this {
      this.update_event.on(f)
      return this
    }

    onFound(f: (_: MoveList) => void): this {
      this.better_solution_found.on(f)
      return this
    }

    getProgress(): number {
      return this.progress
    }

    getBest(): MoveList {
      return this.best_solution
    }

    useFirstSolution(): this {
      this.use_first_solution = true;
      return this;
    }
  }

  export namespace SolvingProcess {
    export class SolutionFoundException extends Error {
      constructor() {super();}
    }
  }
}