import * as leaflet from "leaflet";
import {TileCoordinates} from "../runescape/coordinates";
import {levelIcon} from "./GameMap";
import {ActiveOpacityGroup} from "./layers/OpacityLayer";

export class TileMarker extends ActiveOpacityGroup {
  marker: leaflet.Marker

  constructor(protected spot: TileCoordinates) {
    super(1, 0.2)

    this.setOpacity(1)
  }

  withMarker(icon: leaflet.Icon = null, scale: number = 1) {
    if (this.marker) this.marker.remove()

    this.marker = leaflet.marker([this.spot.y, this.spot.x], {
      icon: icon ?? levelIcon(this.spot.level, scale),
      opacity: this.opacity,
      interactive: true,
      bubblingMouseEvents: true,
    }).addTo(this)

    return this
  }

  getSpot(): TileCoordinates {
    return this.spot
  }
}