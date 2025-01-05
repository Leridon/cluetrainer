import {SolvingMethods} from "./methods";
import KeyValueStore from "../../lib/util/KeyValueStore";
import {ClueSpotIndex} from "../../lib/runescape/clues/ClueIndex";
import {Clues} from "../../lib/runescape/clues";
import {clue_data} from "../../data/clues";
import {ewent, Ewent} from "../../lib/reactive";
import * as lodash from "lodash";
import {util} from "../../lib/util/util";
import {Log} from "../../lib/util/Log";
import Method = SolvingMethods.Method;
import timestamp = util.timestamp;
import ClueSpot = Clues.ClueSpot;
import ClueAssumptions = SolvingMethods.ClueAssumptions;
import uuid = util.uuid;
import log = Log.log;

export type Pack = Pack.Meta & {
  is_real_default?: boolean
  type: "default" | "local" | "imported"
  local_id: string,
  original_id: string,
  timestamp: number,
  methods: Method[],
}

export namespace Pack {
  export type Meta = {
    author: string,
    name: string,
    description: string,
    default_assumptions: ClueAssumptions,
    default_method_name: string
  }

  export function setMeta(pack: Pack, meta: Meta): void {
    pack.author = meta.author
    pack.description = meta.description
    pack.name = meta.name
    pack.default_assumptions = lodash.cloneDeep(meta.default_assumptions)
    pack.default_method_name = meta.default_method_name
  }

  export function meta(pack: Pack): Meta {
    return {
      name: pack.name,
      author: pack.author,
      description: pack.description,
      default_assumptions: lodash.cloneDeep(pack.default_assumptions),
      default_method_name: pack.default_method_name
    }
  }

  export function isEditable(pack: Pack): boolean {
    return pack.type == "local" || isEditableDefault(pack)
  }

  export function isEditableDefault(pack: Pack): boolean {
    return (pack.type == "default" && !pack.is_real_default)
  }
}

export type AugmentedMethod<
  method_t extends Method = Method,
  step_t extends Clues.Step = Clues.Step
> = { method: method_t, pack?: Pack, clue?: ClueSpot<step_t> }

export namespace AugmentedMethod {
  export function create<
    method_t extends Method = Method,
    step_t extends Clues.Step = Clues.Step
  >(method: method_t, pack: Pack): AugmentedMethod<method_t, step_t> {
    return {
      method: method,
      pack: pack,
      clue: clue_data.index.get(method.for.clue) as ClueSpot<step_t>
    }
  }

  export function isSame(a: AugmentedMethod, b: AugmentedMethod): boolean {
    return (a == b) || (a && b && LocalMethodId.equals(LocalMethodId.fromMethod(a), LocalMethodId.fromMethod(b)))
  }
}

export type LocalMethodId = { local_pack_id: string, method_id: string }

export namespace LocalMethodId {
  export function fromMethod(method: AugmentedMethod): LocalMethodId {
    return {local_pack_id: method.pack.local_id, method_id: method.method.id}
  }

  export function equals(a: LocalMethodId, b: LocalMethodId): boolean {
    return a.local_pack_id == b.local_pack_id && a.method_id == b.method_id
  }
}

export class MethodPackManager {
  public initialized: Promise<void>

  public readonly local_pack_store = KeyValueStore.instance().variable<Pack[]>("data/local_methods")

  private default_packs: Pack[]
  private local_packs: Pack[] = []

  pack_set_changed: Ewent.Real<Pack[]> = ewent()
  saved: Ewent.Real<null> = ewent()

  private index_created: Promise<void>

  private method_index: ClueSpotIndex<{ methods: AugmentedMethod[] }>
    = ClueSpotIndex.simple(clue_data.index).with(() => ({methods: []}))

  private constructor() {
    this.initialized = (async () => {
      this.local_packs = (await this.local_pack_store.get()) ?? []

      this.local_packs.forEach(pack => pack.is_real_default = undefined)

      this.default_packs = [
        await (await fetch("data/method_packs/scans_zyklop.json")).json(),
        await (await fetch("data/method_packs/easy_ngis.json")).json(),
        await (await fetch("data/method_packs/medium_ngis.json")).json(),
        await (await fetch("data/method_packs/hard_ngis.json")).json(),
        await (await fetch("data/method_packs/master_ngis.json")).json(),
        await (await fetch("data/method_packs/elite_compass_ngis.json")).json(),
        await (await fetch("data/method_packs/tetras_ngis.json")).json(),
      ]

      this.default_packs.forEach(pack => pack.is_real_default = true)
    })()

    this.invalidateIndex()

    this.pack_set_changed.on(() => this.invalidateIndex())
  }

  private async save(): Promise<void> {
    await this.local_pack_store.set(this.local_packs)

    this.invalidateIndex()

    this.saved.trigger(null)
  }

  private invalidateIndex(): void {
    this.index_created = new Promise(async (resolve) => {
      this.method_index.forEach(e => e.methods = []);

      (await this.all()).forEach(p => {
        p.methods.forEach(m => {
          this.method_index.get(m.for)?.methods?.push({
            method: m,
            pack: p,
            clue: clue_data.index.get(m.for.clue)
          })
        })
      })

      resolve()
    })
  }

  async all(): Promise<Pack[]> {
    await this.initialized
    return [...this.default_packs.filter(pack => !this.local_packs.some(local_pack => local_pack.local_id == pack.local_id)), ...this.local_packs]
  }

  local(): Pack[] {
    return [...this.local_packs]
  }

  /**
   * Clones and saves the given pack locally.
   * The pack is copied and gets a new id.
   *
   * The copied and modified pack is returned
   *
   * @param pack
   * @param keep_identity
   */
  async create(pack: Pack, keep_identity: boolean = false): Promise<Pack> {
    pack = lodash.cloneDeep(pack)

    pack.is_real_default = undefined

    if (!keep_identity) {
      pack.local_id = uuid()
      pack.original_id = pack.local_id
      pack.type = "local"
      pack.timestamp = timestamp()
    }

    this.local_packs.push(pack)

    await this.save()

    this.pack_set_changed.trigger(await this.all())

    return pack
  }

  /**
   * Clones and saves the given pack locally as an imported pack.
   * The pack is copied, but keeps its id.
   *
   * The copied pack is returned
   *
   * @param pack
   * @param keep_identity
   */
  async import(pack: Pack, keep_identity: boolean = false): Promise<Pack> {
    pack = lodash.cloneDeep(pack)

    if (!keep_identity) {
      pack.local_id = uuid()
      pack.type = "imported"
    }

    this.local_packs.push(pack)

    this.invalidateIndex()

    await this.save()

    this.pack_set_changed.trigger(await this.all())

    return pack
  }

  async getPack(local_id: string): Promise<Pack> {
    return (await this.all()).find(p => p.local_id == local_id)
  }

  async deletePack(pack: Pack, save: boolean = true) {
    if (pack.is_real_default) {
      log().log("Attempting to delete default pack")

      return
    }

    let i = this.local_packs.findIndex(p => p.local_id == pack.local_id)

    if (i < 0) {
      log().log("Attempting to delete non-existing pack")
      return
    }

    this.local_packs.splice(i, 1)

    if (save) {
      await this.save()

      this.pack_set_changed.trigger(await this.all())
    }
  }

  async updatePack(pack: Pack, f: (_: Pack) => any): Promise<Pack> {
    if (pack.is_real_default) return

    f(pack)

    pack.timestamp = timestamp()

    await this.save()

    return pack
  }

  async replacePack(existing: Pack, updated: Pack) {
    await this.deletePack(existing, false)

    updated.local_id = existing.local_id

    await this.create(updated, true)
  }

  async updateMethod(method: AugmentedMethod): Promise<void> {
    const pack = this.local_packs.find(p => Pack.isEditable(p) && p.local_id == method.pack.local_id)

    const i = pack.methods.findIndex(m => m.id == method.method.id)

    if (i >= 0) {
      pack.methods[i] = method.method
    } else {
      pack.methods.push(method.method)
    }

    method.method.timestamp = pack.timestamp = timestamp()

    this.save()
  }

  deleteMethod(method: AugmentedMethod) {
    let pack = this.local_packs.find(p => Pack.isEditable(p) && p.local_id == method.pack.local_id)

    let i = pack.methods.findIndex(m => m.id == method.method.id)

    pack.methods.splice(i, 1)

    pack.timestamp = timestamp()

    this.save()
  }

  static _instance: MethodPackManager = null

  static instance(): MethodPackManager {
    if (!MethodPackManager._instance) MethodPackManager._instance = new MethodPackManager()

    return MethodPackManager._instance
  }

  async getForClue(id: ClueSpot.Id, pack_ids: string[] = undefined): Promise<AugmentedMethod[]> {
    await this.index_created

    const all_methods = this.method_index.get(id)?.methods ?? []

    if (pack_ids) {
      return all_methods.filter(m => pack_ids.includes(m.pack.local_id))
    } else {
      return all_methods
    }
  }

  async get(spot: ClueSpot, pack_ids: string[] = undefined): Promise<AugmentedMethod[]> {
    // TODO: Why would I need both this method and getForClue?
    return await this.getForClue(ClueSpot.toId(spot), pack_ids)
  }

  async getMethod(pack_id: string, method_id: string): Promise<Method> {
    const pack = await this.getPack(pack_id)

    if (!pack) return null

    return pack.methods.find(m => m.id == method_id)
  }

  async resolve(id: LocalMethodId): Promise<AugmentedMethod> {
    const pack = (await this.all()).find(p => p.local_id == id.local_pack_id)

    if (!pack) return null

    const method = pack.methods.find(m => m.id == id.method_id)

    if (!method) return null

    return AugmentedMethod.create(method, pack)
  }
}
