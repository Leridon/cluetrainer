import leaflet from "leaflet"
import {Rectangle, Vector2} from "../math";

export namespace LeafletUtils {
  export function convert_bounds(bounds: leaflet.Bounds): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [bounds.getTopLeft().y, bounds.getTopLeft().x],
      [bounds.getBottomRight().y, bounds.getBottomRight().x],
    ])
  }

  export function boundsFromRectangle(box: Rectangle) {
    let tl = leaflet.point(box.topleft)
    let br = leaflet.point(box.botright)

    return leaflet.bounds(tl, br)
  }

  export function latLongFromVector2(point: Vector2): leaflet.LatLng {
    return leaflet.latLng(point.y, point.x)
  }

  export function latLongToVector2(point: leaflet.LatLng): Vector2 {
    return {x: point.lng, y: point.lat}
  }
}