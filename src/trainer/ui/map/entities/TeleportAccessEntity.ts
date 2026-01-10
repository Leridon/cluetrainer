import {Rectangle, Vector2} from "lib/math";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {Transportation} from "../../../../lib/runescape/transportation";
import {FloorLevels} from "../../../../lib/gamemap/ZoomLevels";
import {floor_t} from "../../../../lib/runescape/coordinates";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {GameMapContextMenuEvent} from "../../../../lib/gamemap/MapEvents";
import {Menu} from "../../widgets/ContextMenu";
import {C} from "../../../../lib/ui/constructors";
import {CursorType} from "../../../../lib/runescape/CursorType";
import * as leaflet from "leaflet";
import {areaPolygon} from "../../polygon_helpers";
import {ShortcutViewLayer} from "../../shortcut_editing/ShortcutView";
import Properties from "../../widgets/Properties";
import TeleportAccess = Transportation.TeleportAccess;
import entity = C.entity;
import COLORS = ShortcutViewLayer.COLORS;
import TeleportGroup = Transportation.TeleportGroup;
import vbox = C.vbox;


export class TeleportAccessEntity extends MapEntity {

  zoom_sensitivity_layers = MapEntity.default_zoom_scale_layers
  floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }> = undefined

  bounds(): Rectangle {
    return TileArea.toRect(this.access.clickable_area)
  }

  protected async render_implementation(options: MapEntity.RenderProps): Promise<Element> {
    const teleport = this.teleport;
    const access = this.access

    const scale = (options.highlight ? 1.5 : this.zoom_sensitivity_layers.get(options.zoom_group_index).value.scale)

    const marker = leaflet.marker(Vector2.toLatLong(Rectangle.center(TileArea.toRect(access.clickable_area), true)), {
      icon: leaflet.icon({
        iconUrl: CursorType.meta(access.cursor ?? "generic").icon_url,
        iconSize: CursorType.iconSize(scale),
        iconAnchor: CursorType.iconAnchor(scale, true),
      }),
      riseOnHover: true,
      interactive: true
    }).addTo(this);

    if (options.highlight) {
      areaPolygon(TeleportGroup.TeleportAccess.interactiveArea(access)).setStyle({
        color: COLORS.interactive_area,
        fillColor: COLORS.interactive_area,
        interactive: true,
        fillOpacity: 0.1,
        weight: 2
      }).addTo(this)
    }

    return marker.getElement()
  }

  constructor(public teleport: Transportation.TeleportGroup,
              public access: TeleportAccess & { type: "entity" }) {
    super();

    this.zoom_sensitivity_layers = MapEntity.default_local_zoom_scale_layers

    this.floor_sensitivity_layers = new FloorLevels<{ correct_level: boolean }>([
      {floors: [access.clickable_area.origin.level], value: {correct_level: true}},
      {floors: floor_t.all, hidden_here: true, value: {correct_level: false}},
    ])

    this.setTooltip(() => {
      let props = new Properties()

      const teleport = this.teleport
      const access = this.access

      props.header(c().append(`Access to ${teleport.name} via `, entity(access.name)))

      props.named("Targets", vbox(
        ...teleport.spots.map(spot => {
          return c().text(spot.name)
        })
      ))

      return props
    })
  }

  async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
    const teleport = this.teleport;
    const access = this.access

    event.addForEntity({
      type: "submenu",
      text: "Move map to",
      children: teleport.spots.map(spot => {

        const s = new TeleportGroup.Spot(teleport, spot, access)

        return {
          type: "basic",
          icon: `assets/icons/teleports/${s.image().url}`,
          text: s.code() ? `${spot.code}: ${spot.name}` : spot.name,
          handler: () => {
            this.parent?.getMap()?.fitView(TileArea.toRect(spot.target))
          }
        }
      })
    })

    return {
      type: "submenu",
      icon: CursorType.meta(access.cursor ?? "generic").icon_url,
      text: () => entity(access.name),
      children: []
    }
  }
}