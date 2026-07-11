import {MethodPackManager} from "../cluetrainer/MethodPackManager";
import {clue_data} from "../data/clues";
import {Clues} from "../cluetrainer/model/Clues";
import lodash from "lodash";
import ClueSpot = Clues.ClueSpot;
import {FakeLodash} from "../lib/coreutil/FakeLodash";

export async function export_method_csv(method_manager: MethodPackManager): Promise<string> {
  let result = "Clue\tTier\tType\tTime\n"

  for (let spot of clue_data.spot_index.flat()) {
    const best_method = FakeLodash.minBy(await method_manager.getForClue(ClueSpot.toId(spot.for)), m => m.method.expected_time)

    result += `\"${ClueSpot.shortString(spot.for)}\"\t${spot.for.clue.tier}\t ${spot.for.clue.type}\t ${best_method ? best_method.method.expected_time.toFixed(best_method.method.type == "scantree" ? 1 : 0) : "-"}\n`
  }

  return result
}