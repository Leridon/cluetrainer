import { Clues } from "../../lib/cluetrainer-core/src/model/Clues";
import { ClueIndex, ClueSpotIndex } from "../../lib/cluetrainer-core/src/model/clues/ClueIndex";
export declare namespace clue_data {
    const gielinor_compass: Clues.Compass;
    const arc_compass: Clues.Compass;
    const tetracompass: Clues.Compass;
    const compass: Clues.Compass[];
    const simple: Clues.Simple[];
    const cryptic: Clues.Cryptic[];
    const emote: Clues.Emote[];
    const map: Clues.Map[];
    const anagram: Clues.Anagram[];
    const coordinates: Clues.Coordinate[];
    const scan: Clues.Scan[];
    const skilling: Clues.Skilling[];
    const legacy: Clues.Step[];
    const all: Clues.Step[];
    const index: ClueIndex<{}>;
    const spot_index: ClueSpotIndex<{}>;
}
