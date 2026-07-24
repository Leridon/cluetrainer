import {SolvingMethods} from "./SolvingMethods";
import Method = SolvingMethods.Method;
import {Clues} from "./Clues.js";
import ClueSpot = Clues.ClueSpot;
import {FakeLodash} from "../coreutil/FakeLodash";
import {clue_data} from "../data/clues";

export type MethodPack = MethodPack.Meta & {
  is_real_default?: boolean
  type: "default" | "local" | "imported"
  local_id: string,
  original_id: string,
  timestamp: number,
  methods: Method[],
}

export namespace MethodPack {
  import ClueAssumptions = SolvingMethods.ClueAssumptions;
  export type Meta = {
    author: string,
    name: string,
    description: string,
    default_assumptions: ClueAssumptions,
    default_method_name: string
  }

  export function setMeta(pack: MethodPack, meta: Meta): void {
    pack.author = meta.author
    pack.description = meta.description
    pack.name = meta.name
    pack.default_assumptions = FakeLodash.cloneDeep(meta.default_assumptions)
    pack.default_method_name = meta.default_method_name
  }

  export function meta(pack: MethodPack): Meta {
    return {
      name: pack.name,
      author: pack.author,
      description: pack.description,
      default_assumptions: FakeLodash.cloneDeep(pack.default_assumptions),
      default_method_name: pack.default_method_name
    }
  }

  export function isEditable(pack: MethodPack): boolean {
    return pack.type == "local" || isEditableDefault(pack)
  }

  export function isEditableDefault(pack: MethodPack): boolean {
    return (pack.type == "default" && !pack.is_real_default)
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

export type AugmentedMethod<
  method_t extends Method = Method,
  step_t extends Clues.Step = Clues.Step
> = { method: method_t, pack?: MethodPack, clue?: ClueSpot<step_t> }

export namespace AugmentedMethod {
  import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
  import GenericPathMethod = SolvingMethods.GenericPathMethod;

  export function create(method: ScanTreeMethod, pack: MethodPack): AugmentedMethod<ScanTreeMethod, Clues.Scan>
  export function create(method: GenericPathMethod, pack: MethodPack): AugmentedMethod<GenericPathMethod>
  export function create(method: Method, pack: MethodPack): AugmentedMethod
  export function create<
    method_t extends Method = Method,
    step_t extends Clues.Step = Clues.Step
  >(method: method_t, pack: MethodPack): AugmentedMethod<method_t, step_t> {
    return {
      method: method,
      pack: pack,
      clue: clue_data.spot_index.get(method.for).for as ClueSpot<step_t>
    }
  }

  export function isSame(a: AugmentedMethod, b: AugmentedMethod): boolean {
    return (a == b) || (a && b && LocalMethodId.equals(LocalMethodId.fromMethod(a), LocalMethodId.fromMethod(b)))
  }
}