import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import * as leaflet from "leaflet";
import {Rectangle, Vector2} from "../../../../lib/math";
import Widget from "../../../../lib/ui/Widget";
import Properties from "../../widgets/Properties";
import {Transportation} from "../../../../lib/runescape/transportation";
import {identity} from "lodash";
import {C} from "../../../../lib/ui/constructors";
import {direction} from "../../../../lib/runescape/movement";
import {Menu} from "../../widgets/ContextMenu";
import {GameMapContextMenuEvent} from "../../../../lib/gamemap/MapEvents";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import * as assert from "assert";
import {areaPolygon} from "../../polygon_helpers";
import {floor_t} from "../../../../lib/runescape/coordinates";
import {FloorLevels, ZoomLevels} from "../../../../lib/gamemap/ZoomLevels";
import TeleportIcon from "../../widgets/TeleportIcon";
import vbox = C.vbox;
import entity = C.entity;
import TeleportAccess = Transportation.TeleportAccess;

export class TeleportSpotEntity extends MapEntity {

  zoom_sensitivity_layers = MapEntity.default_zoom_scale_layers
  floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }>

  constructor(public teleport: Transportation.TeleportGroup.Spot) {
    super();

    this.zoom_sensitivity_layers = new ZoomLevels<{ scale: number }>([
      {min: -100, value: {scale: 0.5}},
      {min: 1.5, value: {scale: 1}},
    ])

    this.floor_sensitivity_layers = new FloorLevels<{ correct_level: boolean }>([
      {floors: [teleport.targetArea().origin.level], value: {correct_level: true}},
      {floors: floor_t.all, value: {correct_level: false}},
    ])

    this.setTooltip(() => new TeleportSpotEntity.TeleportSpotProperties(this.teleport))
  }

  bounds(): Rectangle {
    return TileArea.toRect(this.teleport.targetArea())
  }

  async render_implementation(options: MapEntity.RenderProps): Promise<Element> {
    const floor_group = this.floor_sensitivity_layers.get(options.floor_group_index)

    const scale = (options.highlight ? 1.5 : (this.zoom_sensitivity_layers.get(options.zoom_group_index).value.scale))

    const marker = leaflet.marker(Vector2.toLatLong(this.teleport.spot.icon_position_override ?? this.teleport.centerOfTarget()), {
      icon: new TeleportSpotEntity.TeleportMapIcon(this.teleport, scale, w => {
        if (!floor_group.value.correct_level) w.css("filter", "grayscale(1) brightness(0.5)")

        return w
      }),
      riseOnHover: true,
      interactive: true,
      bubblingMouseEvents: true
    }).addTo(this)

    if (options.highlight) {
      areaPolygon(this.teleport.targetArea())
        .setStyle({
          fillColor: "lightgreen",
          color: "lightgreen",
          stroke: true
        }).addTo(this)
    }

    return marker.getElement()
  }

  async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
    const teleport = this.teleport;

    const jumpable_accesses: TeleportAccess[] = teleport.group.access.filter(a => a.type == "entity")

    if (jumpable_accesses.length > 0) {
      event.addForEntity({
        type: "submenu",
        text: "Jump to Access",
        children: jumpable_accesses.map(a => {
          assert(a.type == "entity")

          return {
            type: "basic",
            text: () => entity(a.name),
            handler: () => {
              this.parent?.getMap()?.fitView(TileArea.toRect(a.clickable_area))
            }
          }
        })
      })
    }

    return {
      type: "submenu",
      icon: `assets/icons/teleports/${teleport.image().url}`,
      text: teleport.hover(),
      children: []
    }
  }
}

export namespace TeleportSpotEntity {
  import cls = C.cls;
  import hbox = C.hbox;

  export class TeleportMapIcon extends leaflet.DivIcon {
    createIcon(oldIcon?: HTMLElement): HTMLElement {
      const scale = this.scale
      const SIZE = 30
      const tele = this.tele

      return this.transformer(C.div(
          this.tele.code() ?? ""
        )
        .css2({
          "background-image": `url("./assets/icons/teleports/${tele.image().url}")`,
          color: "white",
          width: `${scale * SIZE}px`,
          height: `${scale * SIZE}px`,
          "line-height": `${scale * SIZE}px`,
          "margin": `-${scale * SIZE / 2}px`,
          "font-size": `${scale * 12}px`
        })
        .addClass("marktele")).raw()
    }

    constructor(private tele: Transportation.TeleportGroup.Spot,
                private scale: number = 1,
                private transformer: (w: Widget) => Widget = identity) {

      super({
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    }
  }

  export function accessNameAsWidget(access: TeleportAccess): Widget {
    switch (access.type) {
      case "spellbook":
        return c().text(access.name)
      case "item":
      case "entity":
        return entity(access.name)
    }
  }

  export class TeleportSpotProperties extends Properties {
    constructor(private teleport: Transportation.TeleportGroup.Spot) {
      super()

      const props = this

      const icon = cls("ctr-neosolving-path-stepicon").append(new TeleportIcon(this.teleport)
        .css2({
          "display": "inline-block",
          "height": "20px"
        }))

      props.header(hbox(icon, C.space(), `${teleport.group.name} - ${teleport.spot.name}`))

      TeleportSpotProperties.renderBody(this.teleport, this)
    }
  }

  export namespace TeleportSpotProperties {
    export function renderBody(teleport: Transportation.TeleportGroup.Spot, props: Properties) {
      if (teleport.access) {
        props.named("Accessed by", renderAccess(teleport.access))
      }

      props.named("Time", `${teleport.props.menu_ticks + teleport.props.animation_ticks} (${teleport.props.menu_ticks} menu + ${teleport.props.animation_ticks} animation)`)
      props.named("Static", teleport.spot.target.size ? "No" : "Yes")

      if (teleport.spot.facing != null) {
        props.named("Orientation", direction.toString(teleport.spot.facing))
      }

      function renderAccess(access: TeleportAccess): Widget {
        switch (access.type) {
          case "spellbook":
            return C.div().text(access.name)
          case "item":
          case "entity":
            return c().append(entity(access.name))
        }
      }
      
      const alternative_accesses = teleport.group.access.filter(a => a != teleport.access)

      if (alternative_accesses.length > 0) {
        props.named(teleport.access ? "Alternative Access" : "Access", vbox(...alternative_accesses.map(renderAccess)))
      }
    }
  }
}