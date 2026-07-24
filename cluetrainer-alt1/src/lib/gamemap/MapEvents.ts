import {GameMap} from "./GameMap";
import * as leaflet from "leaflet";
import {TileCoordinates} from "../runescape/coordinates";
import {Menu, MenuEntry} from "../../cluetrainer/ui/widgets/ContextMenu";
import {MapEntity} from "./MapEntity";

export abstract class GameMapEvent<LeafletT extends leaflet.LeafletEvent, OriginalT extends Event> {
  active_entity: MapEntity | null = null

  public propagation_state: {
    phase: "pre" | "post",
    trickle_stopped_immediate: boolean,
    trickle_stopped: boolean,
    trigger_post_order: boolean
  }

  protected constructor(public map: GameMap,
                        public leaflet: LeafletT,
                        public original: OriginalT
  ) {
    this.propagation_state = {
      phase: "pre",
      trickle_stopped_immediate: false,
      trickle_stopped: false,
      trigger_post_order: true
    }
  }

  handleFiltered(filter: (_: this) => boolean, handler: (_: this) => any) {
    if (filter(this)) handler(this)
  }

  onPre(f: (_: this) => any) {
    this.handleFiltered(e => e.propagation_state.phase == "pre", f)
  }

  onPost(f: (_: this) => any) {
    this.handleFiltered(e => e.propagation_state.phase == "post", f)
  }

  stopAllPropagation() {
    this.original.stopPropagation()

    this.propagation_state.trickle_stopped = true
    this.propagation_state.trickle_stopped_immediate = true
    this.propagation_state.trigger_post_order = false
  }
}

export class GameMapMouseEvent extends GameMapEvent<leaflet.LeafletMouseEvent, MouseEvent> {
  constructor(
    map: GameMap,
    public override leaflet: leaflet.LeafletMouseEvent,
    public coordinates: TileCoordinates) {
    super(map, leaflet, leaflet.originalEvent);
  }

  tile() {
    return TileCoordinates.snap(this.coordinates)
  }
}

export class GameMapKeyboardEvent extends GameMapEvent<leaflet.LeafletKeyboardEvent, KeyboardEvent> {
  constructor(
    map: GameMap,
    public override leaflet: leaflet.LeafletKeyboardEvent) {
    super(map, leaflet, leaflet.originalEvent);
  }
}

export class GameMapContextMenuEvent extends GameMapEvent<leaflet.LeafletMouseEvent, MouseEvent> {
  private entries: MenuEntry[] = []
  private title = ""

  private for_entity_entries: MenuEntry[] = []

  constructor(map: GameMap,
              public override leaflet: leaflet.LeafletMouseEvent,
              public coordinates: TileCoordinates
  ) {
    super(map, leaflet, leaflet.originalEvent);
  }

  add(...entries: MenuEntry[]): void {
    this.entries.push(...entries)
  }

  addForEntity(...entries: MenuEntry[]): void {
    if (!this.active_entity) throw new TypeError("Adding entity actions for context menu without entity")

    this.for_entity_entries.push(...entries)
  }

  tile() {
    return TileCoordinates.snap(this.coordinates)
  }

  async getMenu(): Promise<Menu> {
    const for_entity = await this.active_entity?.contextMenu(this)

    if (for_entity && (for_entity.children.length + this.for_entity_entries.length) > 0) {
      for_entity.children.push(...this.for_entity_entries)

      if (this.entries.length == 0) {
        return for_entity
      }

      return {
        type: "submenu",
        text: this.title,
        children: this.entries.concat({
          type: "submenu",
          text: for_entity.text,
          children: for_entity.children,
        })
      }
    }

    return {
      type: "submenu",
      text: this.title,
      children: this.entries
    }
  }

  setTitle(title: string) {
    this.title = title
  }
}

export class GameMapViewChangedEvent extends GameMapEvent<undefined, undefined> {
  floor_changed: boolean
  zoom_changed: boolean

  constructor(map: GameMap,
              public old_view: GameMap.View,
              public new_view: GameMap.View
  ) {
    super(map, undefined, undefined)

    this.floor_changed = this.old_view?.rect?.level != this.new_view?.rect?.level
    this.zoom_changed = this.old_view?.zoom != this.new_view?.zoom
  }
}