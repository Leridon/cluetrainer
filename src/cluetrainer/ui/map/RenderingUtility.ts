import * as leaflet from "leaflet";
import {Vector2} from "lib/math";
import {CursorType} from "../../../lib/runescape/CursorType";

export namespace RenderingUtility {

  export function interactionIcon(how: CursorType, scale: number = 1, centered: boolean = false, cls: string = undefined): leaflet.Icon {
    return leaflet.icon({
      iconUrl: CursorType.meta(how).icon_url,
      iconSize: [scale * 28, scale * 31],
      iconAnchor: centered ? [scale * 14, scale * 16] : [scale * 3, 0],
      className: cls
    })
  }

  export function interactionMarker(where: Vector2,
                                    how: CursorType,
                                    scale: number = 1,
                                    centered: boolean = false,
                                    cls: string = undefined
  ): leaflet.Marker {
    let icon = interactionIcon(how, scale, centered, cls)

    return leaflet.marker(Vector2.toLatLong(where), {
      icon: icon,
      interactive: true,
    })
  }
}