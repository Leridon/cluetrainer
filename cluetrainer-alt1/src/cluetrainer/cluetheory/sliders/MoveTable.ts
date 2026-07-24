import {Region} from "./Region";
import {OptimizedSliderState} from "./OptimizedSliderState";
import {Sliders} from "../Sliders";
import Move = Sliders.Move;

export class MoveTable {

  move_table: Move[][][]

  constructor(private region: Region, private multitile: boolean, private allow_undoing_moves: boolean = false) {
    this.move_table = new Array(41)

    for (let last_move of [0, ...Move.all]) {
      const move_entry = this.move_table[last_move + 20] = new Array(25)

      const mvs =
        allow_undoing_moves
          ? (this.multitile ? Move.multitile_moves : Move.singletile_moves)
          : (
            this.multitile
              ? (last_move == 0 ? Move.multitile_moves : (Move.isVertical(last_move) ? Move.horizontal_mtm : Move.vertical_mtm))
              : Move.singletile_moves.filter(m => m != -last_move)
          )

      for (let blank_tile = 0; blank_tile < 25; blank_tile++) {
        const blank_x = blank_tile % 5
        const blank_y = ~~(blank_tile / 5)

        move_entry[blank_tile] = mvs.filter(move => {
            // Remove moves that lead outside the grid
            const off_x = move % 5
            const off_y = ~~(move / 5)

            const target_x = blank_x + off_x
            const target_y = blank_y + off_y

            return target_x >= 0 && target_x < 5 && target_y >= 0 && target_y < 5
          })
          .filter(move => this.region[blank_tile + move] != Region.Tile.FIXED) // Remove moves that are in the grid but are outside the region
      }
    }
  }

  get(state: OptimizedSliderState): Move[] {
    return this.move_table[state[OptimizedSliderState.LASTMOVE_INDEX]][state[OptimizedSliderState.BLANK_INDEX]]
  }
}