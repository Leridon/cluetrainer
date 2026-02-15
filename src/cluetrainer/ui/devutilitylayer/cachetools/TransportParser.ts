import {CacheTypes} from "./CacheTypes";
import {Transportation} from "../../../../lib/runescape/transportation";
import {ParsingParameter} from "./ParsingParameters";
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;

export abstract class TransportParser {
  per_loc_group_parameter: ParsingParameter
  per_instance_parameter: ParsingParameter
  instance_group_required: boolean

  legacy: boolean = false

  protected constructor(public readonly id: string, public readonly name: string) { }

  abstract apply(instance: PrototypeInstance, args: { per_loc: any, per_instance?: any }): Promise<Transportation.Transportation[]>

  makeLegacy(): this {
    this.legacy = true
    return this
  }
}