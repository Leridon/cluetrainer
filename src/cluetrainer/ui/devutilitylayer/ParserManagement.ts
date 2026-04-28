import {GameLayer} from "../../../lib/gamemap/GameLayer";
import {GameMapContextMenuEvent, GameMapKeyboardEvent, GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {LocParsingTable, LocParsingTableData, ParserPairing, ParsingAssociationGroup} from "./cachetools/ParsingTable";
import KeyValueStore from "../../../lib/util/KeyValueStore";
import LightButton from "../widgets/LightButton";
import ExportStringModal from "../widgets/modals/ExportStringModal";
import {util} from "../../../lib/util/util";
import {hardcoded_transports, parsers, Parsers3} from "./cachetools/parsers";
import {ParserPairingModal} from "./cachetools/ParserPairingModal";
import {storage} from "../../../lib/util/storage";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {PrototypeExplorer} from "./cachetools/PrototypeExplorer";
import ControlWithHeader from "../map/ControlWithHeader";
import {ProcessedCacheTypes} from "./cachetools/ProcessedCacheTypes";
import {FilteredPrototypeLayer, PrototypeFilter, PrototypeInstanceDataSource, PrototypeInstanceEntity} from "./cachetools/FilteredPrototypeLayer";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {InteractionGuard} from "../../../lib/gamemap/interaction/InteractionLayer";
import {TileCoordinates} from "../../../lib/runescape/coordinates";
import {PrototypeFilterEdit} from "./PrototypeFilterEdit";
import {Parsing} from "./cachetools/Parsing";
import cleanedJSON = util.cleanedJSON;
import PrototypeIndex = ProcessedCacheTypes.PrototypeIndex;
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;
import Prototype = ProcessedCacheTypes.Prototype;
import pre_filter = PrototypeFilter.pre_filter;

class RecentlyUsedParserGroups {
  last_used_groups = new storage.Variable<number[]>("devutility/locparsing/recentgroups", () => [])

  constructor(private table: LocParsingTable) {

  }

  use(group: number) {
    this.last_used_groups.set([group].concat(this.last_used_groups.get().filter(i => i != group)).slice(0, 5))
  }

  get(): ParsingAssociationGroup[] {
    return this.last_used_groups.get().map(i => this.table.getGroup(i)).filter(g => !!g && g.group_name.length > 0)
  }
}

class PlacePrototypeInteraction extends ValueInteraction<ProcessedCacheTypes.Instance> {
  constructor(private prototype: Prototype) {
    super({
      preview_render: i => {
        return new PrototypeInstanceEntity(new PrototypeInstance(prototype, i), null).setInteractive(false)
      }
    })
  }

  private rotation: number = 0
  private last_hover: TileCoordinates = null

  private get(pos: TileCoordinates): ProcessedCacheTypes.Instance {
    if (Prototype.isLoc(this.prototype)) {
      return {
        id: this.prototype.id,
        position: pos,
        rotation: this.rotation
      }
    } else {
      return {
        id: this.prototype.id,
        position: pos,
        rotation: this.rotation
      }
    }
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPre(() => {
      if (event.original.key.toLowerCase() == "r") {
        const offset = event.original.shiftKey ? -1 : 1

        this.rotation = (this.rotation + 4 + offset) % 4

        this.preview(this.get(this.last_hover))
      }
    })
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.last_hover = event.tile()

      this.preview(this.get(event.tile()))
    })
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.commit(this.get(event.tile()))
    })
  }
}

export class ParserManagementLayer extends GameLayer {
  private guard = new InteractionGuard().setDefaultLayer(this)

  private prototypes: Promise<PrototypeIndex>
  private instance_datasource_cache: PrototypeInstanceDataSource

  private loc_layer: FilteredPrototypeLayer
  private filter_control: PrototypeFilterEdit

  local_store = KeyValueStore.instance().variable<LocParsingTableData>("devutility/locparsing/parserassociations")
  recents: RecentlyUsedParserGroups

  repo_version_number: number

  parsing_table: LocParsingTable

  private prototype_explorer: PrototypeExplorer

  constructor() {
    super();

    new GameMapControl({type: "floating", position: "top-right"},
      this.filter_control = new PrototypeFilterEdit()
        .onCommit(c => this.loc_layer.setFilter(PrototypeFilter.forConfig(c)))
    ).addTo(this)

    new GameMapControl({type: "floating", position: "left-top"},
      new ControlWithHeader("Prototype Explorer")
        .setContent(this.prototype_explorer = new PrototypeExplorer([],
          PrototypeFilter.none(),
          proto => [
            {
              type: "basic", handler: () => {
                this.guard.set(
                  new PlacePrototypeInteraction(proto)
                    .onCommit(i => {
                      this.parsing_table.instanceDataSource.create(i)
                    })
                )
              }, text: "Place on map"
            }
          ]
        ))
    ).addTo(this)

    new GameMapControl({type: "gapless", position: "bottom-center"}, c())
      .setContent(
        new ButtonRow()
          .buttons(
            new LightButton("Export")
              .onClick(() => {
                //download("parsingtable.json", cleanedJSON(this.parsing_table.data))
                new ExportStringModal(cleanedJSON(this.parsing_table.data)).show()
              }),
            new LightButton("Delete local table")
              .onClick(async () => {
                const really = await new ConfirmationModal({
                  body: "Do you really want to delete local parsing associations?",
                  options: [
                    {value: false, kind: "neutral", text: "Cancel"},
                    {value: true, kind: "cancel", text: "Delete"}
                  ]
                }).do()

                if (really) this.parsing_table.reset()
              }),
            new LightButton("Apply parsers")
              .onClick(async () => {
                const results = await Parsing.applyParsing(
                  parsers,
                  (await this.prototypes).data,
                  this.instance_datasource_cache,
                  this.parsing_table)

                results.push(...hardcoded_transports())

                new ExportStringModal(cleanedJSON(results), `Parsed ${results.length} transports.`).show()
              }),
          )
      ).addTo(this)

    this.init()
  }

  async init() {
    this.prototypes = fetch("/rscache/prototypes.json").then(async res => PrototypeIndex.simple(await res.json()))

    this.prototypes.then(p => this.prototype_explorer.setPrototypes(p.data))

    const instances = fetch("/rscache/prototype_instances.json")
      .then(async res => {
        return (await res.json()) as ProcessedCacheTypes.Instance[]
      })

    let local_data: LocParsingTableData = await this.local_store.get()
    let repo_data: LocParsingTableData = await (await fetch("/map/parsing_associations.json")).json().catch(() => undefined)

    this.repo_version_number = repo_data?.version ?? -1

    let most_current_data: LocParsingTableData = {
      version: 0,
      custom_instances: [],
      associations: []
    }

    if ((local_data?.version ?? -1) > most_current_data.version) most_current_data = local_data
    if ((repo_data?.version ?? -1) > most_current_data.version) most_current_data = repo_data

    this.parsing_table = new LocParsingTable(await this.prototypes, most_current_data)

    this.loc_layer = new FilteredPrototypeLayer(this.parsing_table)
      .setFilter(PrototypeFilter.forConfig(this.filter_control.get()))
      .addTo(this)

    const index = await this.prototypes

    this.loc_layer.addDataSource(
      this.instance_datasource_cache = PrototypeInstanceDataSource.fromList(
        (await instances).map(i => index.resolve(i))
          .filter(i => pre_filter.applyPrototype(i.prototype))
      )
    )

    this.recents = new RecentlyUsedParserGroups(this.parsing_table)

    this.parsing_table.version.subscribe(async () => {
      await this.local_store.set(this.parsing_table.data)
    })

    this.loc_layer.addDataSource(this.parsing_table.instanceDataSource)
  }

  commitPairing(loc: PrototypeInstance, pairing: ParserPairing) {
    const resultpair = this.parsing_table.setPairing(loc, pairing)

    if (resultpair.group && resultpair.group.name != "") this.recents.use(resultpair.group.id)
  }

  eventContextMenu(event: GameMapContextMenuEvent) {

    event.onPre(() => {
      if (event.active_entity instanceof PrototypeInstanceEntity) {
        const instance = event.active_entity.instance

        const pairing = this.parsing_table.getPairing(instance)

        const recently_used = this.recents.get()

        event.addForEntity({
          type: "basic",
          text: "Edit pairing",
          handler: async () => {
            let result = await new ParserPairingModal(instance, this.parsing_table, pairing).do()

            if (result.type == "saved") {
              this.commitPairing(instance, result.pairing)
            }
          }
        })

        if (this.parsing_table.getPairing(instance).group) {
          event.addForEntity({
            type: "basic",
            text: "Remove pairing",
            handler: () => this.commitPairing(instance, {group: null, instance_group: null})
          })
        } else {

          recently_used.forEach(g => {
            event.addForEntity({
              type: "basic",
              text: `Pair with '${g.group_name}'`,
              handler: async () => {
                const pair: ParserPairing = {
                  group: {
                    parser: Parsers3.getById(g.parser_id),
                    id: g.group_id,
                    name: g.group_name,
                    argument: g.per_group_arg
                  },
                  instance_group: undefined
                }

                if (pair.group.parser.instance_group_required) {
                  let result = await new ParserPairingModal(instance, this.parsing_table, pair).do()

                  if (result.type == "saved") {
                    this.commitPairing(instance, result.pairing)
                  }
                } else {
                  this.commitPairing(instance, pair)
                }
              }
            })
          })

          /*
          event.addForEntity({
              type: "basic",
              text: "Pair as standard door",
              handler: () => {
                  this.commitPairing(instance, {
                      group: this.parsing_table.getGroup2(Parsers3.getById("west-facing-doors"), -1),
                      instance_group: null
                  })
              }
          })*/
        }
      }

      if (event.active_entity instanceof PrototypeInstanceEntity) {

        const instance = event.active_entity.instance

        if (instance instanceof PrototypeInstanceDataSource.Mutable.MutableInstance) {
          event.addForEntity({
            type: "basic",
            text: "Delete Instance",
            handler: async () => {
              instance.deleteInstance()
            }
          })
        }
      }
    })
  }
}