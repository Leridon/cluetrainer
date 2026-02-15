import {Sliders} from "../Sliders";
import SliderState = Sliders.SliderState;
import Move = Sliders.Move;
import {Process} from "../../../lib/Process";
import SlideStateWithBlank = Sliders.SlideStateWithBlank;

export class IterativeDeepeningAStar<UnderlyingState, Move> extends Process<IterativeDeepeningAStar.State<UnderlyingState, Move>> {

  constructor(
    private start_state: UnderlyingState,
    private heuristic: (_: UnderlyingState) => number,
    private successors: (_: IterativeDeepeningAStar.State<UnderlyingState, Move>) => IterativeDeepeningAStar.Edge<UnderlyingState, Move>[],
    private isGoal: (_: UnderlyingState) => boolean
  ) {
    super()
  }

  private getSuccessors(state: IterativeDeepeningAStar.State<UnderlyingState, Move>): IterativeDeepeningAStar.State<UnderlyingState, Move>[] {
    return this.successors(state).map((edge) => {
      return {
        parent: {state: state, move: edge.move},
        state: edge.target,
        length: state.length + edge.cost
      }
    })
  }

  private async step(state: IterativeDeepeningAStar.State<UnderlyingState, Move>,
                     bound: number
  ): Promise<[[IterativeDeepeningAStar.State<UnderlyingState, Move>, number], boolean]> {
    if (state.length % 10 == 0) await this.checkTime()

    const h = this.heuristic(state.state)
    const f = state.length + h

    if (f > bound || this.should_stop) {
      return [[null, f], false]
    }

    if (this.isGoal(state.state)) {
      return [[state, f], true]
    }

    let min = Number.MAX_SAFE_INTEGER

    for (const child of this.getSuccessors(state)) {
      const [[c, v], solved] = await this.step(child, bound,)

      if (solved) return [[c, v], solved]

      if (v < min) min = v
    }

    return [[null, min], false]
  }

  async implementation(): Promise<IterativeDeepeningAStar.State<UnderlyingState, Move>> {
    const start_state: IterativeDeepeningAStar.State<UnderlyingState, Move> = {
      parent: null,
      length: 0,
      state: this.start_state
    }

    let bound = this.heuristic(start_state.state)

    while (!this.should_stop) {
      const [[state, v], solved] = await this.step(start_state, bound)

      if (solved) return state

      bound = v
    }

    return null
  }
}

export namespace IterativeDeepeningAStar {
  export type State<Underlying, MoveT> = {
    parent: {
      state: State<Underlying, MoveT>,
      move: MoveT
    } | null,
    state: Underlying,
    length: number,
  }

  export type Edge<Underlying, MoveT> = {
    target: Underlying,
    move: MoveT
    cost: number
  }

  export namespace State {
    export function moveSequence<A, B>(state: State<A, B>): B[] {
      if (!state.parent) return []

      const par = moveSequence(state.parent.state)
      par.push(state.parent.move)
      return par
    }
  }
}

class IterativeDeepeningSlideSolver extends IterativeDeepeningAStar<SlideStateWithBlank, Move> {
  constructor(start_state: SliderState, heurmod: number) {
    super(
      {tiles: start_state, blank: SliderState.blank(start_state)},
      (n) => SliderState.sumManhattenDistance(n.tiles) * heurmod,
      (node): IterativeDeepeningAStar.Edge<SlideStateWithBlank, Move>[] => {
        const was_vertical = node.parent && node.parent.move % 5 == 0
        const was_horizontal = node.parent && !was_vertical

        const blank_x = node.state.blank % 5
        const blank_y = Math.floor(node.state.blank / 5)

        const successors: IterativeDeepeningAStar.Edge<SlideStateWithBlank, Move>[] = []

        function child(move: Move) {
          const state = SliderState.withMove(node.state.tiles, move)
          successors.push({
            move: move,
            cost: 1,
            target: {
              tiles: state,
              blank: node.state.blank + move
            }
          })
        }

        if (!was_horizontal) {
          for (let xi = 0; xi < 5; xi++) {
            if (xi != blank_x) {
              child(blank_y * 5 + xi - node.state.blank)
            }
          }
        }

        if (!was_vertical) {
          for (let yi = 0; yi < 5; yi++) {
            if (yi != blank_y) {
              child(yi * 5 + blank_x - node.state.blank)
            }
          }
        }

        return successors // TODO: Exclude nodes already contained in the path?
      },
      (n) => SliderState.equals(SliderState.SOLVED, n.tiles)
    );
  }
}

export class AStarSlideSolvingProcess extends Sliders.SolvingProcess {

  private subprocess: IterativeDeepeningSlideSolver

  protected async solve_implementation() {
    let factor = 2.8

    while (!this.should_stop) {
      this.subprocess = new IterativeDeepeningSlideSolver(this.start_state, factor)
        .withTimeout(this.end_time - Date.now())
        .onInterrupt(() => this.updateProgress())

      const result = await this.subprocess.run()

      if (result) {
        this.registerSolution(IterativeDeepeningAStar.State.moveSequence(result))
      }

      factor = 1 + (factor - 1) * 0.9

      await this.checkTime()
    }
  }

  stop() {
    super.stop()
    this.subprocess?.stop()
  }
}

export const AStarSolver: Sliders.Solver = new class extends Sliders.Solver {
  instantiate(state: Sliders.SliderState): Sliders.SolvingProcess {
    return new AStarSlideSolvingProcess(state);
  }

}