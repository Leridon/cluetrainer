import {Rectangle, Vector2} from "lib/math";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {Transportation} from "../../../../lib/runescape/transportation";
import * as leaflet from "leaflet";
import {ShortcutViewLayer} from "../../shortcut_editing/ShortcutView";
import {FloorLevels, ZoomLevels} from "../../../../lib/gamemap/ZoomLevels";
import {floor_t} from "../../../../lib/runescape/coordinates";
import {GameMapContextMenuEvent} from "../../../../lib/gamemap/MapEvents";
import {Menu} from "../../widgets/ContextMenu";
import {CursorType} from "../../../../lib/runescape/CursorType";
import {C} from "../../../../lib/ui/constructors";
import Widget from "../../../../lib/ui/Widget";
import Properties from "../../widgets/Properties";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import COLORS = ShortcutViewLayer.COLORS;
import entity = C.entity;
import activate = TileArea.activate;
import GeneralEntityTransportation = Transportation.GeneralEntityTransportation;
import EntityAction = Transportation.EntityAction;
import EntityActionMovement = Transportation.EntityActionMovement;

export class RemoteEntityTransportTarget extends MapEntity {

  zoom_sensitivity_layers = MapEntity.default_zoom_scale_layers
  floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }> = undefined

  constructor(    public transport: GeneralEntityTransportation,
                  public  action: EntityAction,
                  public movement: EntityActionMovement) {
    super();

    if (!movement.fixed_target) debugger

    this.zoom_sensitivity_layers = new ZoomLevels<{ scale: number }>([
      {min: -100, value: {scale: 0.5}},
      {min: 1.5, value: {scale: 1}},
    ])

    this.floor_sensitivity_layers = new FloorLevels<{ correct_level: boolean }>([
      {floors: [TileArea.normalize(movement.fixed_target.target).origin.level], value: {correct_level: true}},
      {floors: floor_t.all, hidden_here: true, value: {correct_level: false}},
    ])

    this.setTooltip(() => {
      let props = new Properties()

      props.header(c().append(`Target of `, entity(this.transport.entity)))

      return props
    })
  }

  bounds(): Rectangle {
    return TileArea.toRect(TileArea.normalize(this.movement.fixed_target.target))
  }

  protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
    const scale = (props.highlight ? 1.5 : (this.zoom_sensitivity_layers.get(props.zoom_group_index).value.scale))

    const circle = leaflet.circle(Vector2.toLatLong(activate(TileArea.normalize(this.movement.fixed_target.target)).center()), {
      color: COLORS.target_area,
      weight: 2,
      radius: scale * 0.4,
      fillOpacity: 0.1,
    }).addTo(this)

    return circle.getElement()
  }

  async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {

    event.addForEntity({
      type: "basic",
      text: "Jump to Origin",
      handler: () => {
        this.parent?.getMap()?.fitView(this.transport.clickable_area)
      }
    })

    return {
      type: "submenu",
      icon: CursorType.meta(this.action.cursor ?? "generic").icon_url,
      text: () => c().append("Target of ", entity(this.transport.entity)),
      children: []
    }
  }
}