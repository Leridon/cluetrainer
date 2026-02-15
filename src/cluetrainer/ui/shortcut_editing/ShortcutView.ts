import {GameLayer} from "lib/gamemap/GameLayer";
import {Transportation} from "../../../lib/runescape/transportation";
import * as leaflet from "leaflet";
import {Vector2} from "lib/math";
import {OpacityGroup} from "lib/gamemap/layers/OpacityLayer";
import {Observable, ObservableArray, observe} from "../../../lib/reactive";
import {floor_t, TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import {GameMap} from "../../../lib/gamemap/GameMap";
import {GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import activate = TileArea.activate;
import {PathGraphics} from "../path_graphics";

export class ShortcutViewLayer extends GameLayer {
  constructor(public data: ObservableArray<Transportation.Transportation>, private simplified: boolean = false) {
    super();

    data.element_added.on(s => {
      new ShortcutViewLayer.ShortcutPolygon(s, {type: "regular", draw_arrows: true, viewed_floor: this.getMap().floor.value()}).addTo(this)
    })
  }

  onAdd(map: GameMap): this {
    map.floor.subscribe((floor) => {
      this.eachLayer((l: ShortcutViewLayer.ShortcutPolygon) => {
        l.style.update2(s => s.viewed_floor = floor)
      })
    }, false, (h) => this.lifetime_manager.bind(h))

    super.onAdd(map);

    this.renderAll()

    return this
  }

  eventHover(event: GameMapMouseEvent) {

    this.eachLayer((l: ShortcutViewLayer.ShortcutPolygon) => {
      l.style.update2(s => {
        let shortcut = l.data.value()
        s.draw_arrows = shortcut.type == "entity" &&
          (TileRectangle.containsCoords(shortcut.clickable_area, event.tile())
            || shortcut.actions.some(a => activate(a.interactive_area).query(event.tile()))
          )
      })
    })
  }

  private renderAll() {
    this.clearLayers()

    this.data.value().map(s => new ShortcutViewLayer.ShortcutPolygon(s, {
      type: this.simplified ? "simplified" : "regular",
      draw_arrows: false,
      viewed_floor: this.getMap().floor.value()
    }).addTo(this))
  }

  getView(s: ObservableArray.ObservableArrayValue<Transportation.Transportation>): ShortcutViewLayer.ShortcutPolygon {
    return this.getLayers().find(v => (v instanceof ShortcutViewLayer.ShortcutPolygon) && v.data == s) as ShortcutViewLayer.ShortcutPolygon
  }

  center(s: Transportation.Transportation): this {
    this.getMap().fitView(Transportation.bounds(s), {
      maxZoom: 5,
    })

    // TODO: Layer

    return this
  }
}

export namespace ShortcutViewLayer {
  import arrow = PathGraphics.arrow;
  export const COLORS = {
    interactive_area: "#72bb46",
    target_area: "#cca927",
    clickable_area: "#00ffff"
  }

  export class ShortcutPolygon extends OpacityGroup {
    // Components:
    // - Marker             | When any action on current floor (use that marker)
    // - Click-Area         | When any action on current floor
    //   (Per action:)
    // - Interactive Area   | When on current floor
    // - Target             | When on current floor
    // - Arrows             | Hover only and either area or target on current floor

    // Arrows: on Hover
    // Scale marker on zoom
    // Regular:
    //      - Marker, click area
    //      - Target tiles: Circle
    public style = observe<ShortcutPolygon.style_t>(null).equality((a, b) => a?.type == b?.type && a?.draw_arrows == b?.draw_arrows && a?.viewed_floor == b?.viewed_floor)

    constructor(public data: Observable<Transportation.Transportation>, style: ShortcutPolygon.style_t = {
      type: "regular",
      draw_arrows: true,
      viewed_floor: null
    }) {
      super();

      data.subscribe(() => this.render())

      if (data instanceof ObservableArray.ObservableArrayValue) {
        data.removed.on(() => this.remove())
      }

      this.style.set(style)

      this.style.subscribe((s) => {
        this.render()
      }, true)

      this.setStyle({
        interactive: true,
      })
    }

    public render() {
      this.clearLayers()

      // TODO: Reimplement if needed, or bette yet switch to shortcut entity class

      /*

      let all_floors = this.style.value().viewed_floor == null
      let floor = this.style.value().viewed_floor

      function fs(f: floor_t): leaflet.PolylineOptions {
          if (f < floor) return {
              className: "ctr-shortcut-different-level",
          }
          else if (f > floor) return {
              className: "ctr-shortcut-different-level",
              dashArray: "10, 10",
          }
          else return {}
      }

      let shortcut = Transportation.normalize(this.data.value())

      let index_of_first_action_on_floor = shortcut.actions.findIndex(a => a.interactive_area.level == this.style.value().viewed_floor)

      let render_main = all_floors || (index_of_first_action_on_floor >= 0) || shortcut.clickable_area.level == this.style.value().viewed_floor

      for (let action of shortcut.actions) {

          if (render_main) {
              boxPolygon(action.interactive_area).setStyle({
                  color: COLORS.interactive_area,
                  fillColor: COLORS.interactive_area,
                  interactive: true,
                  fillOpacity: 0.1,
                  weight: 2
              })
                  .setStyle(fs(action.interactive_area.level))
                  .addTo(this)
          }

          switch (action.movement.type) {
              case "offset":

                  if (this.style.value().draw_arrows) {

                      let center = TileRectangle.center(action.interactive_area, true)
                      let target = Vector2.add(center, action.movement.offset)

                      render_transport_arrow(center, target, action.movement.offset.level).addTo(this)
                  }

                  break;

              case "fixed":
                  if (render_main || action.movement.target.level == floor) {
                      leaflet.circle(Vector2.toLatLong(action.movement.target), {
                          color: COLORS.target_area,
                          weight: 2,
                          radius: 0.4,
                          fillOpacity: 0.1,
                      })
                          .setStyle(fs(action.movement.target.level))
                          .addTo(this)
                  }

                  if (this.style.value().draw_arrows) {

                      let center = TileRectangle.center(action.interactive_area, false)
                      let target = action.movement.target

                      render_transport_arrow(center, target, target.level - center.level).addTo(this)
                      break;
                  }

                  break
          }

      }

      if (render_main) {
          let i = index_of_first_action_on_floor >= 0 ? index_of_first_action_on_floor : 0

          RenderingUtility.interactionMarker(Rectangle.center(shortcut.clickable_area, false), shortcut.actions[i]?.cursor || "generic", this.style.value().type == "simplified")
              .addTo(this)

          leaflet.polygon(boxPolygon2(shortcut.clickable_area), {
              color: COLORS.clickable_area,
              fillColor: COLORS.clickable_area,
              fillOpacity: 0.1,
              interactive: true
          }).addTo(this)
      }

      if (this.style.value().type == "simplified") {
          this.setStyle({
              className: "ctr-inactive-overlay"
          })
      }

       */
    }
  }

  export namespace ShortcutPolygon {
    export type style_t = {
      type: "regular" | "simplified",
      draw_arrows: boolean,
      draw_arrows2?: { type: "all" } | { type: "forSpot", spot: TileCoordinates }
      viewed_floor: floor_t
    }
  }

  export function render_transport_arrow(from: Vector2, to: Vector2, level_offset: number): OpacityGroup {
    let group = new OpacityGroup().addLayer(arrow(from, to).setStyle({
      color: COLORS.target_area,
      weight: 4,
    })).setStyle({interactive: true})

    if (level_offset != 0) {

      leaflet.marker(Vector2.toLatLong(to), {
        icon: leaflet.icon({
          iconUrl: level_offset < 0 ? "/assets/icons/down.png" : "/assets/icons/up.png",
          iconSize: [14, 16],
        }),
        interactive: true
      }).addTo(group)
    }

    return group
  }
}