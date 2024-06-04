import {AugmentedMethod, LocalMethodId, MethodPackManager} from "./model/MethodPackManager";
import {Clues} from "../lib/runescape/clues";
import {util} from "../lib/util/util";
import {storage} from "../lib/util/storage";
import * as lodash from "lodash";
import todo = util.todo;
import ClueSpot = Clues.ClueSpot;

export class FavoriteIndex {
  private data = new storage.Variable<{
    methods: {
      spot: ClueSpot.Id,
      method: LocalMethodId | null,
    }[],
    challenge_answers: {
      clue_id: number,
      answer_id: number
    }[]
  }>("clue_favourites", () => null)

  constructor(private methods: MethodPackManager) {
    this.normalize_data()
  }

  private normalize_data(): void {
    if (!this.data.value) this.data.value = {methods: [], challenge_answers: []}

    if (!this.data.value.methods) this.data.value.methods = []
    if (!this.data.value.challenge_answers) this.data.value.challenge_answers = []

    this.data.save()
  }

  getTalkId(clue: Clues.Step): number {
    todo()
  }

  setTalkId(clue: Clues.Step, id: number): void {
    todo()
  }

  getChallengeAnswerId(clue: Clues.Step): number {
    return this.data.value.challenge_answers.find(a => a.clue_id == clue.id)?.answer_id ?? 0
  }

  setChallengeAnswerId(clue: Clues.Step, answer_id: number): void {
    const entry = this.data.value.challenge_answers.find(a => a.clue_id == clue.id)

    if(entry) {
      entry.answer_id = answer_id
    } else {
      this.data.value.challenge_answers.push({clue_id: clue.id, answer_id: answer_id})
    }

    this.data.save()
  }

  async getMethod(step: Clues.ClueSpot.Id): Promise<AugmentedMethod> {
    const entry = this.data.value.methods.find(v => ClueSpot.Id.equals(step, v.spot))

    if (!entry) {
      // There is no entry at all for this clue, automatically choose one!
      // Default choice is the fastest builtin method, followed by the fastest custom method if no builtin is available

      const candidates = (await this.methods.getForClue(step)).sort((a, b) => a.method.expected_time - b.method.expected_time)

      return candidates.find(c => c.pack.type == "default") ?? candidates[0]
    }

    if (!entry.method) return null

    return this.methods.resolve(entry.method)
  }

  setMethod(step: ClueSpot.Id, method: AugmentedMethod): void {
    this.normalize_data()

    const entry = this.data.value.methods.find(e => ClueSpot.Id.equals(e.spot, step))

    if (entry) {
      entry.method = method
        ? {local_pack_id: method.pack.local_id, method_id: method.method.id}
        : null
    } else {
      this.data.value.methods.push({
        spot: lodash.cloneDeep(step),
        method: method
          ? {local_pack_id: method.pack.local_id, method_id: method.method.id}
          : null
      })
    }
    this.data.save()
  }
}