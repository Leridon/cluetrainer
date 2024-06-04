import {GameLayer} from "../GameLayer";
import * as leaflet from "leaflet";
import {Vector2} from "../../math";
import {tilePolygon} from "../../../trainer/ui/polygon_helpers";
import {GameMapMouseEvent} from "../MapEvents";

export class TileHighlight extends leaflet.FeatureGroup {
  _polygon: leaflet.Polygon = null

  constructor(private position: Vector2 = {x: 0, y: 0}) {
    super()

    this.update()
  }

  setPosition(position: Vector2) {
    if (Vector2.eq(position, this.position)) return

    this.position = position

    this.update()
  }

  private update() {
    if (this._polygon) {
      this._polygon.remove()
      this._polygon = null
    }

    this._polygon = tilePolygon(this.position).setStyle({
      fillOpacity: 0.2,
      opacity: 0.8,
      color: "#F0780C",
      fillColor: "#F0780C",
      interactive: false
    }).addTo(this)
  }
}

export default class TileHighlightLayer extends GameLayer {
  private tile_highlight: TileHighlight = new TileHighlight({x: 0, y: 0}).addTo(this)

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.tile_highlight.setPosition(event.tile())
    })
  }
}