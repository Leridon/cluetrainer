import {TransportParser} from "./TransportParser";
import {LocParsingTable} from "./ParsingTable";
import {Transportation} from "../../../../lib/runescape/transportation";
import {TileCoordinates} from "../../../../lib/runescape/coordinates";
import {PrototypeInstanceDataSource} from "./FilteredPrototypeLayer";
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";

export namespace Parsing {

  import PrototypeIndex = ProcessedCacheTypes.PrototypeIndex;
  import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;
  import Prototype = ProcessedCacheTypes.Prototype;
  import PrototypeID = ProcessedCacheTypes.PrototypeID;

  export async function applyParsing(parsers: TransportParser[],
                                     prototypes: Prototype[],
                                     data: PrototypeInstanceDataSource,
                                     parsing_table: LocParsingTable): Promise<Transportation.Transportation[]> {
    let results: Transportation.Transportation[] = []

    const instance_index = new PrototypeIndex<PrototypeInstance[]>(prototypes, () => []);

    [data, parsing_table.instanceDataSource].forEach(source =>
      source.get().forEach(i => instance_index.get(i.protoId()).push(i))
    )

    for (const loc_group of parsing_table.data.associations) {

      const parser = parsers.find(p => p.id == loc_group.parser_id)

      if (!parser) {
        console.error(`Parser ${loc_group.parser_id} is not defined!`)
        return
      }

      for (const loc_id of loc_group.loc_ids) {
        const instances = instance_index.get(loc_id) ?? []

        if (instances.length == 0) {
          console.error(`Zero instances returned for loc ${loc_id}!`)
        }

        for (const instance of instances) {
          const per_instance_arg =
            parser.per_instance_parameter
              ? loc_group.instance_groups?.find(igroup =>
                igroup.instances.some(i => PrototypeID.equals(i.loc, loc_id) && TileCoordinates.eq(i.origin, instance.box.origin))
              )?.per_instance_argument
              : undefined

          if (!parser.instance_group_required || per_instance_arg !== undefined) {
            try {
              const res = await parser.apply(instance, {per_loc: loc_group.per_group_arg, per_instance: per_instance_arg})

              results.push(...res.filter(r => r.type != "entity" || r.actions.length > 0))
            } catch (e) {
              console.error(`Parser ${loc_group.parser_id} has thrown an exception!`)
              console.log(e)
              debugger
            }
          }
        }
      }

    }

    return results
  }
}