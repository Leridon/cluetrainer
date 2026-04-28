import InteractionLayer from "lib/gamemap/interaction/InteractionLayer";
import GameMapDragAction from "lib/gamemap/interaction/GameMapDragAction";
import {TileRectangle} from "lib/runescape/coordinates/TileRectangle";
import {Transportation} from "../../../../lib/runescape/transportation";
import InteractionTopControl from "../../map/InteractionTopControl";
import {ShortcutViewLayer} from "../ShortcutView";
import {observe} from "../../../../lib/reactive";

export class DrawGeneralEntity extends InteractionLayer {
  constructor(public config: {
    done_handler: (_: Transportation.EntityTransportation) => void
  }) {
    super();

    new InteractionTopControl({
      name: "Draw Entity",
      cancel_handler: () => this.cancel()
    }).setText("Draw interactive entity's clickable rectangle.")
      .addTo(this)

    new GameMapDragAction({
      preview_render: (area) => new ShortcutViewLayer.ShortcutPolygon(observe(DrawGeneralEntity.create(area)))
    })
      .onCommit((area) => {
        this.config.done_handler(DrawGeneralEntity.create(area))
        this.cancel()
      })
      .onEnd(() => this.cancel())
      .addTo(this)
  }
}

export namespace DrawGeneralEntity {
  export function create(area: TileRectangle): Transportation.GeneralEntityTransportation {
    return {
      type: "entity",
      entity: {kind: "static", name: "Entity"},
      clickable_area: TileRectangle.extend(area, 0.5),
      actions: [{
        cursor: "generic",
        movement: [{time: 3, offset: {x: 0, y: 0, level: 0}}],
        name: "Use",
      }]
    }
  }
}