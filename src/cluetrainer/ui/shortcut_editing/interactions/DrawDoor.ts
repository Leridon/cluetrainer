import GameMapDragAction from "lib/gamemap/interaction/GameMapDragAction";
import InteractionLayer from "lib/gamemap/interaction/InteractionLayer";
import InteractionTopControl from "../../map/InteractionTopControl";
import {Transportation} from "../../../../lib/runescape/transportation";
import {Rectangle} from "lib/math"
import {boxPolygon} from "../../polygon_helpers";
import {TileRectangle} from "lib/runescape/coordinates/TileRectangle";
import ContextMenu from "../../widgets/ContextMenu";
import {ShortcutViewLayer} from "../ShortcutView";
import {observe} from "../../../../lib/reactive";
import {direction} from "../../../../lib/runescape/movement";

export class DrawDoor extends InteractionLayer {

  constructor(public config: {
    done_handler: (_: Transportation.DoorTransportation) => void
  }) {
    super();

    new InteractionTopControl({
      name: "Draw Door",
      cancel_handler: () => this.cancel()
    }).setText("Draw an area containing all tiles on both sides of the door.")
      .addTo(this)

    this.next()
  }

  private next() {
    new GameMapDragAction({
      preview_render: (area) => {
        let options = DrawDoor.shortcutsFromArea(area)

        if (options.length == 0) {
          return boxPolygon(area)
            .setStyle({
              color: "red",
              fillColor: "red"
            })
        } else {
          return new ShortcutViewLayer.ShortcutPolygon(observe(options[0]))
        }
      }
    })
      .onCommit((area) => {
        let options = DrawDoor.shortcutsFromArea(area)

        if (options.length == 1) {
          this.config.done_handler(options[0])
          this.next()
        } else if (options.length > 1) {
          new ContextMenu({
            type: "submenu",
            text: "",
            children: options.map(s => {
              return {
                type: "basic",
                text: direction.toString(s.direction),
                handler: () => {
                  this.config.done_handler(s)
                }
              }
            })
          }).show(this.getMap().container.get()[0], this.getMap().getClientPos(Rectangle.center(area, false)))
            .onClosed(() => this.next())
        }
      })
      .onDiscarded(() => this.next())
      .addTo(this)
  }
}

export namespace DrawDoor {
  export function shortcutsFromArea(area: TileRectangle): Transportation.DoorTransportation[] {
    let width = Rectangle.tileWidth(area)
    let height = Rectangle.tileHeight(area)

    let options: Transportation.DoorTransportation[] = []

    return []

    /*
    if (width == 2) {
        options.push({
            type: "door",
            name: "Door",
            area: area,
            direction: "eastwest"
        })
    }
    if (height == 2) {
        options.push({
            type: "door",
            name: "Door",
            area: area,
            direction: "northsouth"
        })
    }

    */

    return options
  }
}