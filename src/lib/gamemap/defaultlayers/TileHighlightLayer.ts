import {GameLayer} from "../GameLayer";
import * as leaflet from "leaflet";
import {Vector2} from "../../math";
import {tilePolygon} from "../../../cluetrainer/ui/polygon_helpers";
import {GameMapMouseEvent} from "../MapEvents";
import {GameMap} from "../GameMap";

export class TileHighlight extends leaflet.FeatureGroup {
  _polygon: leaflet.Polygon = null

  constructor(private position: Vector2 = {x: 0, y: 0}, private color: string = "#F0780C") {
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
      color: this.color,
      fillColor: this.color,
      interactive: false,
      pane: GameMap.objectPane
    }).addTo(this)
  }
}

export default class TileHighlightLayer extends GameLayer {
  private tile_highlight: TileHighlight = new TileHighlight({x: 0, y: 0}).addTo(this)

  override eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.tile_highlight.setPosition(event.tile())
    })
  }
}