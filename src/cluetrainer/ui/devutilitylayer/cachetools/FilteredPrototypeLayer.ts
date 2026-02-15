import {GameLayer} from "../../../../lib/gamemap/GameLayer";
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";
import {ewent} from "../../../../lib/reactive";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {areaPolygon} from "../../polygon_helpers";
import {Rectangle, Vector2} from "../../../../lib/math";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {PrototypeInstanceProperties, PrototypeProperties} from "./PrototypeExplorer";
import {FloorLevels, ZoomLevels} from "../../../../lib/gamemap/ZoomLevels";
import {GameMapContextMenuEvent} from "../../../../lib/gamemap/MapEvents";
import {Menu} from "../../widgets/ContextMenu";
import * as leaflet from "leaflet";
import {LocParsingTable} from "./ParsingTable";
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;
import Prototype = ProcessedCacheTypes.Prototype;

export abstract class PrototypeFilter {

  abstract applyPrototype(prototype: Prototype): boolean

  abstract applyInstance(instance: PrototypeInstance): boolean

  cached(): PrototypeFilter {
    const self = this
    return new class extends PrototypeFilter {

      private lookup_table: {
        loc: (boolean | undefined)[],
        npc: (boolean | undefined)[]
      } = {
        loc: [],
        npc: []
      }

      applyInstance(instance: ProcessedCacheTypes.PrototypeInstance): boolean {
        return self.applyInstance(instance);
      }

      applyPrototype(prototype: ProcessedCacheTypes.Prototype): boolean {
        if (this.lookup_table[prototype.id[0]][prototype.id[1]] == undefined) {
          return this.lookup_table[prototype.id[0]][prototype.id[1]] = self.applyPrototype(prototype)
        }

        return this.lookup_table[prototype.id[0]][prototype.id[1]];
      }

    }
  }
}

export namespace PrototypeFilter {
  import PrototypeID = ProcessedCacheTypes.PrototypeID;

  export function none(): PrototypeFilter {
    return new class extends PrototypeFilter {
      applyPrototype(prototype: ProcessedCacheTypes.Prototype): boolean {
        return true
      }

      applyInstance(instance: ProcessedCacheTypes.PrototypeInstance): boolean {
        return true
      }
    }
  }

  export type Config = {
    names?: string[],
    action_names?: string[],
    type?: PrototypeID["0"] | undefined,
  }

  export function forConfig(config: Config): PrototypeFilter {
    return new class extends PrototypeFilter {
      applyInstance(instance: ProcessedCacheTypes.PrototypeInstance): boolean {
        return true;
      }

      applyPrototype(prototype: ProcessedCacheTypes.Prototype): boolean {
        if (config.names?.length > 0 && !config.names.some(n => prototype.name.toLowerCase().includes(n))) return false
        if (config.action_names?.length > 0 && !config.action_names.some(n => prototype.actions.some(a => a[0].toLowerCase().includes(n)))) return false
        if (config.type && config.type != prototype.id[0]) return false

        return true;
      }

    }
  }

  export const pre_filter: PrototypeFilter = forConfig({
    action_names: ["open", "use", "enter", "climb", "crawl", "scale", "pass", "jump", "leave", "teleport", "descend", "step", "walk", "cross", "exit", "squeeze",
      "stand", "ascend", "top", "bottom", "descend", "across", "swing", "slash", "pray", "operate", "pull", "dig", "push", "grapple",
      "board", "swim", "through", "past", "attune", "traverse", "vault", "slide", "merge", "activate", "charge", "chop-down"],
    names: [],
    type: undefined
  }).cached()
}

export class PrototypeInstanceDataSource {
  created = ewent<PrototypeInstance>()
  removed = ewent<PrototypeInstance>()

  protected constructor(protected data: PrototypeInstance[]) {

  }

  get(): PrototypeInstance[] {
    return this.data
  }

  static fromList(instance: PrototypeInstance[]) {
    return new PrototypeInstanceDataSource(instance)
  }
}

export namespace PrototypeInstanceDataSource {
  import PrototypeIndex = ProcessedCacheTypes.PrototypeIndex;
  import Instance = ProcessedCacheTypes.Instance;

  export class Mutable extends PrototypeInstanceDataSource {
    constructor(private index: PrototypeIndex, start_data: Instance[]) {
      super([])

      this.data = start_data.flatMap(instance => {
        const prototype = index.lookup(instance.id)

        if (!prototype) return []

        return [new Mutable.MutableInstance(prototype, instance, this)]
      })
    }

    create(instance: ProcessedCacheTypes.Instance) {
      const prototype = this.index.lookup(instance.id)

      if (prototype) {
        const i = new Mutable.MutableInstance(prototype, instance, this)

        this.data.push(i)
        this.created.trigger(i)
      }
    }

    remove(instance: PrototypeInstance) {
      const i = this.data.indexOf(instance)

      if (i >= 0) {
        this.data.splice(i, 1)
        this.removed.trigger(instance)
      }
    }
  }

  export namespace Mutable {
    import Prototype = ProcessedCacheTypes.Prototype;
    import Instance = ProcessedCacheTypes.Instance;

    export class MutableInstance<T extends Prototype = Prototype> extends PrototypeInstance<T> {
      constructor(
        prototype: T,
        instance: T extends Prototype.Npc ? Instance.NPC : Instance.Loc,
        private source: Mutable
      ) {
        super(prototype, instance);
      }

      deleteInstance() {
        this.source.remove(this)
      }
    }
  }
}

export class PrototypeInstanceEntity extends MapEntity {

  constructor(public instance: PrototypeInstance, private parsing_table: LocParsingTable) {
    super();

    this.zoom_sensitivity_layers = new ZoomLevels<{ scale: number }>([
      {min: -100, hidden_here: true, value: {scale: 0.25}},
      {min: 2, value: {scale: 0.5}},
      {min: 5, value: {scale: 1}},
    ])

    this.floor_sensitivity_layers = FloorLevels.single(instance.box.origin.level)

    this.setTooltip(() => new PrototypeInstanceProperties(this.instance))
  }

  private rendered_with_parser: boolean

  protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {

    const parsing_group = this.parsing_table && this.parsing_table.getPairing(this.instance)

    const has_parser = this.rendered_with_parser = !!parsing_group?.group
    const has_instance_parser = has_parser && (!parsing_group.group.parser.instance_group_required || parsing_group.instance_group)

    const type_color = this.instance.isLoc() ? "cyan" : "yellow"
    const parser_color = has_parser ? "green" : "orange"

    const box = areaPolygon(this.instance.box).setStyle({
      fillColor: this.parsing_table ? parser_color : type_color,
      color: this.parsing_table ? parser_color : type_color,
      stroke: true
    }).addTo(this)

    let true_west: [Vector2, Vector2]

    const rect = Rectangle.extend(TileArea.toRect(this.instance.box), 0.5)

    switch (this.instance.instance.rotation) {
      case 0:
        true_west = [Rectangle.bottomLeft(rect), Rectangle.topLeft(rect)]
        break
      case 1:
        true_west = [Rectangle.topLeft(rect), Rectangle.topRight(rect)]
        break
      case 2:
        true_west = [Rectangle.topRight(rect), Rectangle.bottomRight(rect)]
        break
      case 3:
        true_west = [Rectangle.bottomRight(rect), Rectangle.bottomLeft(rect)]
        break
    }

    leaflet.polyline(true_west.map(Vector2.toLatLong), {
      color: "red"
    }).addTo(this)

    return box.getElement()
  }

  bounds(): Rectangle {
    return TileArea.toRect(this.instance.box);
  }

  async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
    return {
      type: "submenu",
      text: () => PrototypeProperties.renderName(this.instance.prototype),
      children: []
    }
  }

  checkParserRedraw() {
    if (this.rendered_props.render_at_all && (this.parsing_table && !!this.parsing_table.getPairing(this.instance).group) != this.rendered_with_parser) {
      this.render(true)
    }
  }
}

export class FilteredPrototypeLayer extends GameLayer {
  private filter: PrototypeFilter = PrototypeFilter.none()

  private lookup_table: {
    loc: {
      prototype: Prototype.Loc,
      entities: PrototypeInstanceEntity[]
    }[],
    npc: {
      prototype: Prototype.Loc,
      entities: PrototypeInstanceEntity[]
    }[]
  } = {
    loc: [],
    npc: []
  }

  constructor(private parsing_table: LocParsingTable) {
    super()

    this.parsing_table.version.subscribe(() => {
      this.entity_quadtree.forEachVisible(e => {
        if (e instanceof PrototypeInstanceEntity) {
          e.checkParserRedraw()
        }
      })
    })

  }

  addDataSource(...sources: PrototypeInstanceDataSource[]): this {
    this.rendering.lock()

    sources.forEach(source => {
      source.get().forEach(instance => this.create(instance))

      source.created.on(i => {
        this.create(i)
      }).bindTo(this.lifetime_manager)

      source.removed.on(i => {
        this.delete(i)
      })
    })

    this.rendering.unlock()

    this.updateFilter()

    return this
  }

  private entry(prototype: Prototype) {
    let entry = this.lookup_table[prototype.id[0]][prototype.id[1]]

    if (!entry) {
      entry = this.lookup_table[prototype.id[0]][prototype.id[1]] = {
        prototype: prototype as any,
        entities: []
      }
    }

    return entry
  }

  private delete(instance: PrototypeInstance) {
    let entry = this.entry(instance.prototype)

    const i = entry.entities.findIndex(e => e.instance == instance)

    if (i >= 0) {
      const e = entry.entities[i]
      e.remove()

      entry.entities.splice(i, 1)
    }
  }

  private create(instance: PrototypeInstance) {
    let entry = this.entry(instance.prototype)

    entry.entities.push(new PrototypeInstanceEntity(instance, this.parsing_table).setVisible(
      this.filter.applyPrototype(instance.prototype) && this.filter.applyInstance(instance)
    ).addTo(this))
  }

  private updateFilter() {
    this.lookup_table.loc.forEach(entry => {
      if (!entry) return

      const prototype_visible = this.filter.applyPrototype(entry.prototype)

      entry.entities.forEach(entity => {
        const visible = prototype_visible && this.filter.applyInstance(entity.instance)

        entity.setVisible(visible)
      })
    })

    this.lookup_table.npc.forEach(entry => {
      if (!entry) return

      const prototype_visible = this.filter.applyPrototype(entry.prototype)

      entry.entities.forEach(entity => {
        const visible = prototype_visible && this.filter.applyInstance(entity.instance)

        entity.setVisible(visible)
      })
    })
  }

  setFilter(filter: PrototypeFilter): this {
    this.filter = filter

    this.updateFilter()

    return this
  }
}