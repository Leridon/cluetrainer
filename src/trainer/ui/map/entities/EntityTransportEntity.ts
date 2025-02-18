import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {FloorLevels} from "../../../../lib/gamemap/ZoomLevels";
import {Transportation} from "../../../../lib/runescape/transportation";
import {Rectangle, Vector2} from "../../../../lib/math";
import {OpacityGroup} from "../../../../lib/gamemap/layers/OpacityLayer";
import * as leaflet from "leaflet";
import {CursorType} from "../../../../lib/runescape/CursorType";
import {areaPolygon, boxPolygon2} from "../../polygon_helpers";
import {floor_t, TileCoordinates} from "../../../../lib/runescape/coordinates";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import Properties from "../../widgets/Properties";
import {C} from "../../../../lib/ui/constructors";
import {direction} from "../../../../lib/runescape/movement";
import {GameMapContextMenuEvent} from "../../../../lib/gamemap/MapEvents";
import {Menu} from "../../widgets/ContextMenu";
import {PathGraphics} from "../../path_graphics";
import GeneralEntityTransportation = Transportation.GeneralEntityTransportation;
import EntityTransportation = Transportation.EntityTransportation;
import entity = C.entity;
import isLocal = Transportation.EntityTransportation.Movement.isLocal;
import activate = TileArea.activate;
import arrow = PathGraphics.arrow;
import defaultInteractiveArea = Transportation.EntityTransportation.defaultInteractiveArea;

export class EntityTransportEntity extends MapEntity {
  private normalized_shortcut: GeneralEntityTransportation

  constructor(public shortcut: EntityTransportation) {
    super()

    this.normalized_shortcut = Transportation.normalize(this.shortcut)

    if (true || EntityTransportation.isLocal(this.normalized_shortcut)) {
      this.zoom_sensitivity_layers = MapEntity.default_local_zoom_scale_layers
    } else {
      this.zoom_sensitivity_layers = MapEntity.default_zoom_scale_layers
    }

    this.floor_sensitivity_layers = new FloorLevels([
      {floors: [this.normalized_shortcut.clickable_area.level], value: {}},
      {floors: floor_t.all, hidden_here: true, value: {}},
    ])

    this.setTooltip(() => {
      const props = new Properties()
      const s = this.shortcut

      switch (s.type) {
        case "entity":
          props.header(C.entity(s.entity))
          break;
        case "door":
          props.header(C.staticentity(s.name))
          break;
      }

      if (s.source_loc) {
        props.named("Object ID", s.source_loc.toString())
      }

      if (s.type == "door") {
        props.named("Position", TileCoordinates.toString(s.position))
        props.named("Direction", direction.toString(s.direction))
      }

      return props
    })
  }

  bounds(): Rectangle {
    return Transportation.bounds(this.shortcut)
  }

  async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
    const shortcut = this.normalized_shortcut

    const remote_target: TileArea[] = shortcut.actions.flatMap(action =>
      action.movement.flatMap(movement => {
        if (!isLocal(movement)) {
          return [TileArea.normalize(movement.fixed_target.target)]
        } else return []
      })
    )

    if (remote_target.length > 0) {
      const target = remote_target[0]

      event.addForEntity({
        type: "basic",
        text: "Jump to Target",
        handler: () => {
          this.parent?.getMap()?.fitView(TileArea.toRect(target))
        }
      })
    }

    return {
      type: "submenu",
      icon: CursorType.meta(shortcut.actions?.[0]?.cursor ?? "generic").icon_url,
      text: () => entity(shortcut.entity),
      children: []
    }
  }

  async render_implementation(options: MapEntity.RenderProps): Promise<Element> {
    const shortcut = this.normalized_shortcut

    const COLORS = {
      interactive_area: "#72bb46",
      target_area: "#cca927",
      clickable_area: "#00ffff"
    }

    function render_transport_arrow(from: Vector2, to: Vector2, level_offset: number): OpacityGroup {
      const group = new OpacityGroup().addLayer(arrow(from, to).setStyle({
        color: COLORS.target_area,
        weight: 4,
      })).setStyle({interactive: true})

      if (level_offset != 0) {

        leaflet.marker(Vector2.toLatLong(to), {
          icon: leaflet.icon({
            iconUrl: level_offset < 0 ? "assets/icons/down.png" : "assets/icons/up.png",
            iconSize: [14, 16],
          }),
          interactive: true
        }).addTo(group)
      }

      return group
    }


    const scale = (options.highlight ? 1.5 : this.zoom_sensitivity_layers.get(options.zoom_group_index).value.scale)

    // Render main marker
    const marker = leaflet.marker(Vector2.toLatLong(Rectangle.center(shortcut.clickable_area, false)), {
      icon: leaflet.icon({
        iconUrl: CursorType.meta(shortcut.actions[0]?.cursor ?? "generic").icon_url,
        iconSize: CursorType.iconSize(scale),
        iconAnchor: CursorType.iconAnchor(scale, true),
      }),
      riseOnHover: true,
      interactive: true
    }).addTo(this);

    if (options.highlight) {
      leaflet.polygon(boxPolygon2(shortcut.clickable_area), {
        color: COLORS.clickable_area,
        fillColor: COLORS.clickable_area,
        fillOpacity: 0.1,
        opacity: 0.5,
        interactive: true
      }).addTo(this)

      for (let action of shortcut.actions) {

        if (action.interactive_area) {
          areaPolygon(action.interactive_area).setStyle({
            color: COLORS.interactive_area,
            fillColor: COLORS.interactive_area,
            interactive: true,
            fillOpacity: 0.1,
            weight: 2
          }).addTo(this)
        }

        action.movement.forEach(movement => {

          if (movement.offset) {
            let center = activate(movement.valid_from || action.interactive_area || defaultInteractiveArea(shortcut)).center()

            let target = Vector2.add(center, movement.offset)

            render_transport_arrow(center, target, movement.offset.level).addTo(this)

          } else if (movement.fixed_target && !movement.fixed_target.relative) {
            const targe = TileArea.normalize(movement.fixed_target.target)

            if (targe.origin.level == this.parent.getMap().floor.value()) {
              leaflet.circle(Vector2.toLatLong(activate(targe).center()), {
                  color: COLORS.target_area,
                  weight: 2,
                  radius: 0.4,
                  fillOpacity: 0.1,
                })
                .addTo(this)
            }

            const center = TileArea.activate(movement.valid_from ?? action.interactive_area ?? defaultInteractiveArea(shortcut)).center()
            const target = TileArea.normalize(movement.fixed_target.target)

            render_transport_arrow(center, activate(target).center(), target.origin.level - center.level).addTo(this)
          }
        })
      }

      if (!shortcut.actions.some(a => !!a.interactive_area)) {
        areaPolygon(EntityTransportation.defaultInteractiveArea(shortcut)).setStyle({
          color: COLORS.interactive_area,
          fillColor: COLORS.interactive_area,
          interactive: true,
          fillOpacity: 0.1,
          weight: 2
        }).addTo(this)
      }
    }

    return marker.getElement()
  }
}