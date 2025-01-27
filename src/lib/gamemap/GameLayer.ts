import * as leaflet from "leaflet"
import {LayerGroup} from "leaflet"
import {GameMap} from "./GameMap";
import {GameMapContextMenuEvent, GameMapKeyboardEvent, GameMapMouseEvent, GameMapViewChangedEvent} from "./MapEvents";
import {MapEntity} from "./MapEntity";
import * as tippy from "tippy.js";
import {followCursor} from "tippy.js";
import {QuadTree} from "../QuadTree";
import {boxPolygon} from "../../trainer/ui/polygon_helpers";
import {LifetimeManager} from "../lifetime/LifetimeManager";

function childLike(l: leaflet.Layer): l is GameLayer | MapEntity {
  return l instanceof GameLayer || l instanceof MapEntity
}

export class GameLayer extends leaflet.FeatureGroup {
  protected entity_quadtree: QuadTree<MapEntity>

  public lifetime_manager: LifetimeManager = new LifetimeManager()

  public parent: GameLayer | null = null
  protected map: GameMap | null = null

  private hovered_entity: MapEntity = null
  private active_entity: GameLayer.ActiveEntity = {entity: null}

  constructor() {
    super();

    this.on("layeradd", (l) => {
      if (childLike(l.layer)) l.layer.parent = this

      if (l.layer instanceof MapEntity) {
        this.entity_quadtree?.insert(l.layer)

        if (this.map) {
          l.layer.setFloorAndZoom(this.map.floor.value(), this.map.getZoom())
        }

        l.layer.requestRendering()
      }
    })

    this.on("remove", () => {
      if (this.activeEntity()?.parent == this) {
        this.requestEntityActivation(null)
      }
    })

    this.on("layerremove", (l) => {
      if (childLike(l.layer) && l.layer.parent == this) l.layer.parent = null
    })

    this.entity_quadtree = QuadTree.init({
      topleft: {x: 0, y: 16384},
      botright: {x: 16384, y: 0}
    })

  }

  removeEntity(entity: MapEntity) {
    if (entity.spatial) {
      entity.spatial.remove(entity)
    }

    if (entity == this.activeEntity()) {
      this.requestEntityActivation(null)
    }

    entity.parent = null

    this.removeLayer(entity)
  }

  isRootLayer(): boolean {
    return this.parent == null
  }

  getRoot(): GameLayer {
    if (this.isRootLayer()) return this

    return this.parent.getRoot()
  }

  getMap(): GameMap {
    return this.map
  }

  remove(): this {
    if (this.parent) this.parent.removeLayer(this)
    else super.remove()

    return this
  }

  add(layer: GameLayer): this {
    this.addLayer(layer)

    return this
  }

  addTo(layer: GameMap | LayerGroup | GameLayer): this {
    if (layer instanceof GameMap) {
      layer.addGameLayer(this)
      return this
    }

    return super.addTo(layer)
  }

  onAdd(map: GameMap): this {
    this.map = map

    this.eachEntity(e => {
      e.setFloorAndZoom(this.map.floor.value(), this.map.getZoom())

      e.requestRendering(true)
    })

    return super.onAdd(map)
  }

  onRemove(map: GameMap): this {
    this.map = null

    this.lifetime_manager.kill()

    return super.onRemove(map);
  }

  eachEntity(f: (_: MapEntity) => void): this {
    this.eachLayer(lay => {
      if (lay instanceof MapEntity) f(lay)
    })

    return this
  }

  private async createActiveEntityTooltip(force_interactive: boolean | undefined = undefined) {
    if (this.active_entity.entity) {
      const tooltip = await this.active_entity.entity.renderTool()

      if (tooltip) {
        const interactive = force_interactive ?? false

        const anchor = await this.active_entity.entity.tooltip_hook.value() || document.body

        this.active_entity.tooltip_instance = tippy.default(anchor, {
          content: c("<div class='ctr-entity-tooltip'></div>")
            .append(tooltip).raw(),
          arrow: true,
          animation: false,
          zIndex: 10001,
          delay: 0,
          followCursor: interactive ? "initial" : true,
          plugins: [followCursor],
          interactive: interactive,
          onHide: () => {
            if (this.active_entity.locked) {
              return false
            }
          },
          onClickOutside: (instance) => {
            instance.destroy()
          },
          hideOnClick: false,
          onHidden: () => {
            this.requestEntityActivation(null)
          },
          trigger: "manual",
          placement: "top",
          offset: [0, 10],
          appendTo: document.body
        })

        this.active_entity.tooltip_instance.show()
      }
    }
  }

  async requestEntityActivation(entity: MapEntity, force_interactive: boolean | undefined = undefined): Promise<boolean> {
    if (!this.isRootLayer()) return this.parent.requestEntityActivation(entity)

    if (this.active_entity.locked) return false

    if (entity != this.active_entity.entity) {
      if (this.active_entity.entity) {
        this.active_entity.entity.highlighted.set(false)

        this.active_entity.tooltip_instance?.destroy()
        this.active_entity.tooltip_instance = null

        this.active_entity.entity = null
      }

      if (entity) {
        this.active_entity.entity = entity

        entity.highlighted.set(true)

        await this.createActiveEntityTooltip(force_interactive)
      }
    }

    return true
  }

  activeEntity(): MapEntity | null {
    return this.getRoot().active_entity.entity
  }

  async lockEntity(entity: MapEntity, follow_cursor: boolean = false): Promise<void> {
    if (this.active_entity.entity) {
      this.active_entity.locked = false
      await this.requestEntityActivation(null)
    }

    if (entity) {
      await this.requestEntityActivation(entity, !follow_cursor)
      this.active_entity.locked = true
    }
  }

  updateHovering(entity: MapEntity, hovering: boolean) {
    if (!this.isRootLayer()) this.getRoot().updateHovering(entity, hovering)

    if (hovering) {
      this.hovered_entity = entity

      this.requestEntityActivation(entity)
    } else if (this.hovered_entity == entity) {
      this.hovered_entity = null

      this.requestEntityActivation(null, false)
    }
  }

  getHoveredEntity(): MapEntity {
    return this.getRoot().hovered_entity
  }

  eventContextMenu(event: GameMapContextMenuEvent) {}

  eventClick(event: GameMapMouseEvent) {}

  eventHover(event: GameMapMouseEvent) {}

  eventMouseUp(event: GameMapMouseEvent) {}

  eventMouseDown(event: GameMapMouseEvent) {}

  eventKeyDown(event: GameMapKeyboardEvent) {}

  eventKeyUp(event: GameMapKeyboardEvent) {}

  rendering = new GameLayer.RenderingLock()
  protected quad_tree_debug_rendering = false
  private debug_layer = leaflet.featureGroup().addTo(this)

  eventViewChanged(event: GameMapViewChangedEvent) {
    event.onPre(() => {
      this.rendering.lock()

      if (this.quad_tree_debug_rendering) {
        timeSync("Culling", () => this.entity_quadtree.cull(event.new_view.rect, true))
      } else {
        this.entity_quadtree.cull(event.new_view.rect, false)
      }

      if (this.quad_tree_debug_rendering) {
        this.debug_layer.clearLayers()

        function traverse_leafs(node: QuadTree<MapEntity>): leaflet.Polygon[] {
          if (node.isLeaf()) {
            const contains_culled = node.getElements().some(e => e.culled.value())
            const contains_invisible = node.getElements().some(e => !e.getDesiredRenderProps().render_at_all)

            return [boxPolygon(node.bounds()).setStyle({
              stroke: true,
              color: node.isCulled() ? "red" : (contains_invisible ? "purple" : "green"),
              fillOpacity: 0.2
            })]
          } else {
            return node.getChildren().flatMap(traverse_leafs)
          }
        }

        traverse_leafs(this.entity_quadtree).forEach(p => p.addTo(this.debug_layer))
      }

      this.entity_quadtree.forEachVisible(e => {
        e.setFloorAndZoom(event.new_view.rect.level, event.new_view.zoom)
      })

      this.rendering.unlock()
    })
  }

}

export namespace GameLayer {
  export type ActiveEntity = {
    entity: MapEntity,
    locked?: boolean,
    tooltip_instance?: tippy.Instance
  }

  export class RenderingLock {
    private entity_render_locked: boolean = false
    entity_rendering_lock_queue: MapEntity[] = []

    lock() {
      this.entity_render_locked = true
    }

    unlock() {
      this.entity_rendering_lock_queue.forEach(e => e.render())

      this.entity_rendering_lock_queue = []

      this.entity_render_locked = false
    }

    request(e: MapEntity) {
      if (this.entity_render_locked) {
        this.entity_rendering_lock_queue.push(e)
      } else {
        e.render()
      }
    }
  }
}

export async function time<T>(name: string, f: () => T, start_message: boolean = true): Promise<T> {

  let timeStart = new Date().getTime()

  if (start_message) console.log(`Starting task ${name}: `)

  try {
    return await f()
  } finally {
    const ms = (new Date().getTime() - timeStart)
    console.log(`Task ${name} took ${ms}ms\n`)
  }
}

export function timeSync<T>(name: string, f: () => T): T {

  window.performance.now()

  const timeStart = window.performance.now()

  console.log(`Starting task ${name}: `)
  const res = f()
  const ns = (window.performance.now() - timeStart)
  console.log(`Task ${name} took ${(ns).toFixed(1)}ms\n`)

  return res
}