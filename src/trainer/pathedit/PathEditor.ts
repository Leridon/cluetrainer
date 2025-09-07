import * as leaflet from "leaflet";
import {Path} from "../../lib/runescape/pathing";
import {util} from "../../lib/util/util";
import Behaviour from "../../lib/ui/Behaviour";
import {Transportation} from "../../lib/runescape/transportation";
import {Vector2} from "../../lib/math";
import {TemplateResolver} from "../../lib/util/TemplateResolver";
import {GameMapContextMenuEvent, GameMapKeyboardEvent} from "../../lib/gamemap/MapEvents";
import {GameLayer} from "../../lib/gamemap/GameLayer";
import {DrawAbilityInteraction} from "./interactions/DrawAbilityInteraction";
import PathEditActionBar from "./PathEditActionBar";
import InteractionLayer, {InteractionGuard} from "../../lib/gamemap/interaction/InteractionLayer";
import {TileCoordinates} from "../../lib/runescape/coordinates";
import * as assert from "assert";
import lodash from "lodash";
import {Menu, MenuEntry} from "../ui/widgets/ContextMenu";
import PlaceRedClickInteraction from "./interactions/PlaceRedClickInteraction";
import {SelectTileInteraction} from "../../lib/gamemap/interaction/SelectTileInteraction";
import InteractionTopControl from "../ui/map/InteractionTopControl";
import DrawRunInteraction from "./interactions/DrawRunInteraction";
import {direction, HostedMapData, MovementAbilities, PathFinder} from "../../lib/runescape/movement";
import {PathStepEntity} from "../ui/map/entities/PathStepEntity";
import TransportLayer from "../ui/map/TransportLayer";
import {TileArea} from "../../lib/runescape/coordinates/TileArea";
import {CursorType} from "../../lib/runescape/CursorType";
import {areaPolygon, tilePolygon} from "../ui/polygon_helpers";
import {TeleportSpotEntity} from "../ui/map/entities/TeleportSpotEntity";
import {EntityTransportEntity} from "../ui/map/entities/EntityTransportEntity";
import {GameMapControl} from "../../lib/gamemap/GameMapControl";
import {StepEditModal} from "./StepEditModal";
import {BookmarkStorage} from "./BookmarkStorage";
import {C} from "../../lib/ui/constructors";
import {TeleportAccessEntity} from "../ui/map/entities/TeleportAccessEntity";
import {TransportData} from "../../data/transports";
import {RemoteEntityTransportTarget} from "../ui/map/entities/RemoteEntityTransportTarget";
import {DrawCheatInteraction} from "./interactions/DrawCheatInteraction";
import {Notification} from "../ui/NotificationBar";
import {DrawCosmeticInteraction} from "./interactions/DrawCosmeticInteraction";
import {DrawTileAreaInteraction} from "../ui/devutilitylayer/DrawTileAreaInteraction";
import {DrawArrowInteraction} from "./interactions/DrawArrowInteraction";
import {PathGraphics} from "../ui/path_graphics";
import {GameMap} from "../../lib/gamemap/GameMap";
import {EditedPathOverview} from "./EditedPathOverview";
import {PathEditorToolsControl} from "./PathEditorToolsControl";
import {PathBuilder} from "./PathBuilder";
import {PathEditMenuBar} from "./PathEditMenuBar";
import movement_state = Path.movement_state;
import index = util.index;
import activate = TileArea.activate;
import vbox = C.vbox;
import TeleportGroup = Transportation.TeleportGroup;
import resolveTeleport = TransportData.resolveTeleport;
import interactiveArea = Transportation.EntityAction.interactiveArea;
import EntityAction = Transportation.EntityAction;
import TeleportAccess = Transportation.TeleportGroup.TeleportAccess;
import notification = Notification.notification;
import arrow = PathGraphics.arrow;
import findAsync = util.findAsync;
import {ConfirmBeforeUnload} from "../../lib/util/ConfirmBeforeUnload";

function needRepairing(state: movement_state, shortcut: Path.step_transportation): boolean {
  return state.position.tile
    && activate(EntityAction.interactiveArea(shortcut.internal, shortcut.internal.actions[0]))
      .query(state.position.tile)
    && !TileCoordinates.eq2(state.position.tile, shortcut.assumed_start)
}

function repairShortcutStep(state: movement_state, shortcut: Path.step_transportation): void {
  shortcut.assumed_start = state.position.tile
}

class PathEditorGameLayer extends GameLayer {
  constructor(private editor: PathEditor, add_transport_layer: boolean) {
    super();

    if (add_transport_layer) new TransportLayer(true).addTo(this)
  }

  eventContextMenu(event: GameMapContextMenuEvent) {

    event.onPost(() => {
      if (this.editor.isActive()) {
        event.setTitle(`${event.tile().x} | ${event.tile().y} | ${event.tile().level}`)

        if (!event.active_entity) {

          const current_tile = this.editor.value.cursor_state.value()?.state?.position?.tile
          const target_tile = event.tile()

          if (current_tile && !TileCoordinates.eq2(current_tile, target_tile)) {
            event.add({
              type: "basic",
              text: "Walk here",
              icon: "/assets/icons/yellowclick.png",
              handler: async () => {
                const path_to_tile = await PathFinder.find(
                  PathFinder.init_djikstra(this.editor.value.cursor_state.value().state.position.tile),
                  TileArea.init(target_tile)
                )

                if (path_to_tile && path_to_tile.length > 1) {
                  this.editor.value.add({
                    type: "run",
                    waypoints: path_to_tile,
                  })
                } else {
                  notification("No path found.", "error").show()
                }
              }
            })
          }


          event.add({
            type: "submenu",
            text: "Redclick",
            icon: "/assets/icons/cursor_redclick.png",
            children: CursorType.all().map((i): MenuEntry => ({
              type: "basic",
              text: i.description,
              icon: i.icon_url,
              handler: () => {
                this.editor.value.add({
                  type: "redclick",
                  target: CursorType.defaultEntity(i.type),
                  where: event.tile(),
                  how: i.type
                })
              }
            }))
          })
        } else if (event.active_entity instanceof TeleportSpotEntity) {
          const t = event.active_entity.teleport

          if (t.group.access.length == 1) {
            const a = t.group.access[0]

            event.addForEntity({
              type: "basic",
              text: () => c().append(`Use via `, TeleportSpotEntity.accessNameAsWidget(a)),
              handler: () => {
                this.editor.value.add({
                    type: "teleport",
                    spot: t.centerOfTarget(),
                    id: {...t.id(), access: a.id},
                  }
                )
              }
            })
          } else {
            event.addForEntity({
              type: "submenu",
              text: `Use via`,
              children: t.group.access.map(a => {
                return {
                  type: "basic",
                  text: () => c().append(TeleportSpotEntity.accessNameAsWidget(a)),
                  handler: () => {
                    this.editor.value.add({
                      type: "teleport",
                      spot: t.centerOfTarget(),
                      id: {...t.id(), access: a.id},
                    })
                  }
                }
              })
            })
          }
        } else if (event.active_entity instanceof TeleportAccessEntity) {
          const access = event.active_entity.access
          const teleport = event.active_entity.teleport

          event.addForEntity({
            type: "submenu",
            text: `Use action '${access.action_name}'`,
            children: event.active_entity.teleport.spots.map(spot => {

              const s = new TeleportGroup.Spot(teleport, spot, access)

              return {
                type: "basic",
                icon: `assets/icons/teleports/${s.image().url}`,
                text: s.code() ? `${spot.code}: ${spot.name}` : spot.name,
                handler: async () => {

                  const current_tile = this.editor.value.cursor_state.value().state?.position?.tile

                  const target = TeleportAccess.interactiveArea(access)

                  const steps: Path.Step[] = []

                  if (current_tile && !activate(target).query(current_tile)) {
                    const path_to_start = await PathFinder.find(
                      PathFinder.init_djikstra(current_tile),
                      target
                    )

                    if (path_to_start && path_to_start.length > 1) {

                      steps.push({
                        type: "run",
                        waypoints: path_to_start,
                      })

                    } else {
                      notification("No path to transportation found.", "error").show()
                    }
                  }

                  steps.push({
                    type: "teleport",
                    spot: s.centerOfTarget(),
                    id: {...s.id(), access: access.id},
                  })

                  this.editor.value.add(...steps)
                }
              }
            }),
          })
        } else if (event.active_entity instanceof EntityTransportEntity) {
          let s = Transportation.normalize(event.active_entity.shortcut)

          s.actions.forEach(a => {
            event.addForEntity({
              type: "basic",
              text: `Use action '${a.name}'`,
              icon: CursorType.meta(a.cursor).icon_url,
              handler: async () => {
                const current_tile = this.editor.value.cursor_state.value().state?.position?.tile

                let assumed_start = null

                const target = interactiveArea(s, a)

                const steps: Path.Step[] = []

                if (current_tile) {
                  if (activate(target).query(current_tile)) assumed_start = current_tile
                  else {
                    const path_to_start = await PathFinder.find(
                      PathFinder.init_djikstra(current_tile),
                      target
                    )

                    if (path_to_start && path_to_start.length > 1) {
                      assumed_start = index(path_to_start, -1)

                      steps.push({
                        type: "run",
                        waypoints: path_to_start,
                      })

                    } else {
                      notification("No path to transportation found.", "error").show()
                    }
                  }
                }

                assumed_start ??= await findAsync(activate(target).getTiles(), t => HostedMapData.get().isAccessible(t))

                let clone = lodash.cloneDeep(s)
                clone.actions = [lodash.cloneDeep(a)]

                this.editor.value.add(...steps, {
                  type: "transport",
                  assumed_start: assumed_start,
                  internal: clone
                })
              }
            })
          })
        } else if (event.active_entity instanceof RemoteEntityTransportTarget) {

        } else if (event.active_entity instanceof PathStepEntity) {
          const step = this.editor.value.committed_value.value().steps.find(v => v.associated_preview == event.active_entity)

          if (step) {
            event.addForEntity(...this.editor.contextMenu(step).children)
          }
        }
      }
    })
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPost(() => {
      const e = event.original
      const handled = ((): boolean => {

        if (e.ctrlKey && e.key.toLowerCase() == "z") {

          if (e.shiftKey) {
            this.editor.value.undoredo.redo()
          } else {
            this.editor.value.undoredo.undo()
          }

          return true
        } else if (e.ctrlKey && e.key.toLowerCase() == "y") {
          this.editor.value.undoredo.redo()
          return true
        } else if (e.ctrlKey && e.key.toLowerCase() == "s") {
          this.editor.commit()

          return true
        } else if (e.key == "Backspace") {
          this.editor.value.delete(this.editor.value.cursor - 1)
          return true
        } else if (e.key == "Delete") {
          this.editor.value.delete(this.editor.value.cursor)
          return true
        }

        return false
      })()

      if (handled) {
        event.stopAllPropagation()
        e.preventDefault()
      }
    })
  }
}

export class PathEditor extends Behaviour {
  private control: EditedPathOverview = null
  public handler_layer: PathEditorGameLayer = null
  overlay_control: PathEditorToolsControl = null

  private you_are_here_marker: leaflet.Layer = null

  action_bar: PathEditActionBar

  interaction_guard: InteractionGuard

  value: PathBuilder

  bookmarks = new BookmarkStorage()

  constructor(public game_layer: GameLayer,
              public template_resolver: TemplateResolver,
              public options: PathEditor.options_t,
              add_transport_layer: boolean
  ) {
    super()

    if (!options.start_state) options.start_state = Path.movement_state.start({})

    // Set up handler layer, but don't add it anywhere yet.
    this.handler_layer = new PathEditorGameLayer(this, add_transport_layer)

    this.value = new PathBuilder({
      target: this.options.target,
      start_state: lodash.cloneDeep(this.options.start_state),
    }, options.initial)

    this.handler_layer.add(this.value.preview_layer)

    this.value.cursor_state.subscribe(({state}) => {
      if (this.action_bar) this.action_bar.state.set(state)

      if (this.you_are_here_marker) {
        this.you_are_here_marker.remove()
        this.you_are_here_marker = null
      }

      if (state.position.tile) {
        this.you_are_here_marker = leaflet.marker(Vector2.toLatLong(state.position.tile), {
          icon: leaflet.icon({
            iconUrl: "/assets/icons/youarehere.png",
            iconSize: [25, 25],
            iconAnchor: [13, 13],
          })
        }).addTo(this.handler_layer)
      }
    })

    new GameMapControl({
        position: "left-top",
        type: "floating"
      },
      vbox(
        new PathEditMenuBar(this),
        this.control = new EditedPathOverview(this)
      )
    ).addTo(this.handler_layer)

    this.overlay_control = new PathEditorToolsControl(this).addTo(this.handler_layer)

    this.interaction_guard = new InteractionGuard().setDefaultLayer(this.handler_layer)
    this.action_bar = new PathEditActionBar(this, this.interaction_guard).addTo(this.handler_layer)

    this.lifetime_manager.bind(ConfirmBeforeUnload.instance().register())
  }

  protected begin() {
    this.handler_layer.addTo(this.game_layer)

    this.game_layer.getMap().container.focus()

    //const bounds = Rectangle.combine(Path.bounds(this.options.initial), Rectangle.from(this.options.start_state?.position?.tile), TileArea.toRect(this.options.target?.parent))

    if (this.options.target) {
      this.options.target.forEach(target => areaPolygon(target.parent).addTo(this.handler_layer))
    }

    //const level = this.options.target?.origin?.level ?? this.options.start_state?.position?.tile?.level ?? Math.min(...this.options.initial.map(Path.Step.level))

    // if (bounds) this.game_layer.getMap().fitView(TileRectangle.lift(bounds, level as floor_t), {maxZoom: 7})
  }

  protected end() {
    this.handler_layer.remove()
  }

  discard(): void {
    if (this.options.discard_handler) {
      this.options.discard_handler()
      this.stop()
    }
  }

  commit(): void {
    this.options.commit_handler?.(this.value.get())
  }

  close() {
    this.discard()

    this.stop()
  }

  editStep(value: PathBuilder.Step, interaction: InteractionLayer, hide_preview: boolean = true) {
    this.interaction_guard.set(interaction
      .onStart(() => {
        if (hide_preview) value.associated_preview?.setVisible(false)
        this.overlay_control.lens_layer.enabled2.set(false)
      })
      .onEnd(() => {
        if (hide_preview) value.associated_preview?.setVisible(true)
        else value.associated_preview?.render(true)
        this.overlay_control.lens_layer.enabled2.set(true)
      })
    )
  }

  async editStepDetails(value: PathBuilder.Step) {
    const result = await new StepEditModal(value.step.raw).do()

    if (result.new_version) {
      this.value.update(value.index, result.new_version)
    }
  }

  redrawAbility(value: PathBuilder.Step) {
    const v = value.step.raw

    if (v.type == "ability") {
      this.editStep(value,
        new DrawAbilityInteraction(v.ability)
          .setStartPosition(v.from)
          .onCommit(new_s => value.update(v => Object.assign(v, new_s)))
      )
    } else if (v.type == "run") {
      this.editStep(value,
        new DrawRunInteraction()
          .setStartPosition(v.waypoints[0])
          .onCommit(new_s => value.update(v => Object.assign(v, new_s))))
    } else if (v.type == "cheat") {
      this.editStep(value,
        new DrawCheatInteraction(v.assumed_start)
          .onCommit(new_s => value.update(v => Object.assign(v, new_s)))
      )
    }
  }

  moveStep(value: PathBuilder.Step) {
    const v = value.step

    if (v.raw.type == "redclick") {
      this.editStep(
        value,
        new PlaceRedClickInteraction(v.raw.how)
          .onCommit(new_s => value.update<Path.step_redclick>(v => {
            v.where = new_s.where
          }))
      )
    } else if (v.raw.type == "powerburst") {
      this.editStep(value,
        new SelectTileInteraction({
          preview_render: tile => new PathStepEntity({
            type: "powerburst",
            where: tile,
          })
        })
          .onCommit(new_s => value.update<Path.step_powerburst>(v => {
            v.where = new_s
          }))
          .attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the location of the powerburst by clicking the tile.`))
      )
    } else if (v.raw.type == "teleport") {
      const spot = resolveTeleport(v.raw.id)

      this.editStep(value,
        new SelectTileInteraction({
          preview_render: tile => {
            assert(v.raw.type == "teleport")

            if (activate(spot.targetArea()).query(tile)) {
              return new PathStepEntity({
                type: "teleport",
                id: v.raw.id,
                spot: tile,
              })
            } else {
              return tilePolygon(tile)
                .setStyle({
                  fillColor: "red",
                  color: "red",
                  stroke: true
                })
            }


          }
        })
          .addLayer(
            areaPolygon(spot.targetArea())
              .setStyle({
                fillColor: "lightgreen",
                color: "lightgreen",
                stroke: true
              })
          )
          .onCommit(new_s => value.update<Path.step_teleport>(v => {
            v.spot = new_s
          }))
          .attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the specific target of the teleport by clicking the tile.`))
      )
    } else if (v.raw.type == "cosmetic") {
      this.editStep(
        value,
        new DrawCosmeticInteraction(v.raw)
          .onCommit(new_s => value.update<Path.step_cosmetic>(v => {
            Object.assign(v, new_s)
          }))
      )
    }
  }

  contextMenu(step: PathBuilder.Step): Menu {
    const entries: MenuEntry[] = []

    const s = step.step.raw

    entries.push({
      type: "basic",
      icon: "/assets/icons/edit.png",
      text: `Edit`,
      handler: () => this.editStepDetails(step)
    })

    entries.push({
      type: "basic",
      icon: "/assets/icons/delete.png",
      text: `Remove`,
      handler: () => step.delete()
    })

    if (step.step.raw.type == "ability" || step.step.raw.type == "run" || step.step.raw.type == "cheat") {
      entries.push({
        type: "basic",
        icon: "/assets/icons/edit.png",
        text: `Redraw on map`,
        handler: () => this.redrawAbility(step)
      })
    }

    if (step.step.raw.type == "powerburst" || step.step.raw.type == "redclick" || step.step.raw.type == "teleport" || step.step.raw.type == "cosmetic") {

      entries.push({
        type: "basic",
        icon: "/assets/icons/move.png",
        text: `Move on map`,
        handler: () => this.moveStep(step)
      })
    }

    if (step.step.raw.type == "orientation") {
      entries.push({
        type: "submenu",
        icon: "/assets/icons/compass.png",
        text: `Choose Direction`,
        children: direction.all.map(dir => ({
          type: "basic",
          text: direction.toString(dir),
          handler: () => {
            step.update<Path.step_orientation>(s => s.direction = dir)
          }
        }))
      })
    }

    if (step.step.raw.type == "cheat") {
      entries.push({
        type: "submenu",
        icon: "/assets/icons/Rotten_potato.png",
        text: "Choose Orientation",
        children: [undefined].concat(direction.all).map(dir => ({
          type: "basic",
          text: direction.toString(dir) ?? "None",
          handler: () => {
            step.update<Path.step_cheat>(s => s.orientation = dir)
          }
        }))
      })
    }

    if (step.step.raw.type == "redclick") {
      entries.push({
        type: "submenu",
        icon: "/assets/icons/cursor_redclick.png",
        text: `Choose Cursor`,
        children: CursorType.all().map(cursor => ({
          type: "basic",
          text: cursor.description,
          icon: cursor.icon_url,
          handler: () => {
            step.update<Path.step_redclick>(s => s.how = cursor.type)
          }
        }))
      })
    }

    if ((s.type == "ability" && (s.ability == "dive" || s.ability == "barge")) || s.type == "run") {
      const color = s.type == "ability" ? PathStepEntity.ability_rendering[s.ability].color : PathStepEntity.run_rendering_area_color

      entries.push({
        type: "basic",
        text: `Edit target area`,
        handler: () => {
          this.editStep(step,
            new DrawTileAreaInteraction(s.target_area ? activate(s.target_area).getTiles() : [])
              .setPreviewFunction(tiles =>
                leaflet.featureGroup(
                  tiles.map(tile => tilePolygon(tile)
                    .setStyle({
                      color: color,
                      fillOpacity: 0.4,
                      stroke: false
                    })
                  )))
              .onPreview(tiles => {
                s.target_area = tiles.length > 0 ? TileArea.fromTiles(tiles) : undefined
              }),
            false
          )
        }
      })
    }

    if (step.step.raw.type == "cosmetic") {
      const s = step.step.raw

      entries.push({
        type: "basic",
        text: `Edit area`,
        handler: () => {
          this.editStep(step,
            new DrawTileAreaInteraction(s.area ? activate(s.area).getTiles() : [])
              .setPreviewFunction(tiles =>
                leaflet.featureGroup(
                  tiles.map(tile => tilePolygon(tile)
                    .setStyle({
                      color: s.arrow_color ?? Path.COSMETIC_DEFAULT_COLORS.area,
                      fillOpacity: 0.4,
                      stroke: false
                    })
                  )))
              .onPreview(tiles => {
                s.area = tiles.length > 0 ? TileArea.fromTiles(tiles) : undefined
              })
          )
        }
      })

      entries.push({
        type: "basic",
        text: `Edit arrow`,
        handler: () => {
          this.editStep(step,
            new DrawArrowInteraction(true)
              .setPreviewFunction(([from, to]) => arrow(from, to).setStyle({weight: 4, color: s.arrow_color ?? Path.COSMETIC_DEFAULT_COLORS.arrow}))
              .onCommit(tiles => {
                s.arrow = tiles
              })
          )
        }
      })
    }


    return {
      type: "submenu",
      text: "",
      children: entries
    }
  }
}

export namespace PathEditor {
  import isFarDive = MovementAbilities.isFarDive;
  export type options_t = {
    initial: Path.raw,
    commit_handler?: (p: Path.raw) => any,
    discard_handler?: () => any,
    target?: TileArea.ActiveTileArea[],
    start_state?: movement_state,
    editable_assumptions?: boolean
  }

  export async function normalizeFarDive(step: Path.Step): Promise<Path.Step> {
    if (step.type != "ability") return step
    if (step.ability != "dive") return step

    return {
      ...step,
      is_far_dive: await isFarDive(step.from, step.to)
    }
  }
}