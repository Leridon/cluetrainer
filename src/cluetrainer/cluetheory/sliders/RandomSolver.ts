import {Sliders} from "../Sliders";
import {calcmap, optimisemoves, SlideMove, SliderMap} from "../../../skillbertssolver/cluesolver/slidesolver";
import Move = Sliders.Move;
import {Log} from "../../../lib/util/Log";
import log = Log.log;

function skillbertMoveToMyMove(move: SlideMove): Move {
  return (move.y2 - move.y1) * 5 + (move.x2 - move.x1)
}

/**
 * This is completely taken from skillbert's random solver and just fitted to the new interface
 * @param start_state
 */
export const RandomSolver: Sliders.Solver = new class extends Sliders.Solver {
  instantiate(start_state: Sliders.SliderState): Sliders.SolvingProcess {

    return new class extends Sliders.SolvingProcess {
      firstrun = true;
      native_compression = false

      private step() {
        const first = this.firstrun;
        this.firstrun = false;
        let steps = 0;
        let map = new SliderMap(this.start_state);
        while (true) {
          let actions = calcmap(map);
          if (actions.length == 0) { break; }
          actions.sort(function (a, b) { return b.score - a.score; });
          let n = (first ? 0 : Math.floor(actions.length * Math.random()));
          let action = actions[n];

          try {
            action.f(map);
          } catch {
            break; //TODO still check solver paths even if this is dead end
          }

          if (steps++ > 50) {
            log().log("failed to solve puzzle, over 50 actions attempted", "Random Solver")
            return null;
          }
        }

        if (map.getMinMoves() == 0) {
          this.registerSolution(optimisemoves(map.moves).map(skillbertMoveToMyMove));
        }
      }

      override async solve_implementation() {
        while (!this.should_stop) {
          this.step();

          //Let go of the thread for a bit so ui gets a chance
          await this.checkTime()
        }
      }
    }(start_state)
  }
}