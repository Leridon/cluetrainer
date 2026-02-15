import * as leaflet from "leaflet";
import {Vector2} from "../../../lib/math";
import {CTRIcon} from "../../CTRIcon";
import {CursorType} from "../../../lib/runescape/CursorType";


export class MapIcon extends leaflet.Marker {
  constructor(position: Vector2, options: {
    icon: CTRIcon,
    override_base_size?: Vector2,
    scale?: number,
    cls?: string,
    centered_anchor?: boolean,
    opacity?: number
  }) {
    const sz = Vector2.scale(options.scale ?? 1, (options.override_base_size ?? options.icon.size_on_map))
    const anchor = (options.centered_anchor || !options.icon.map_anchor)
      ? Vector2.scale(0.5, sz)
      : Vector2.scale(options.scale ?? 1, options.icon.map_anchor)

    super(Vector2.toLatLong(position), {
      icon: leaflet.icon({
        iconUrl: `assets/icons/${options.icon.file_name}`,
        iconSize: Vector2.asTuple(sz),
        iconAnchor: Vector2.asTuple(anchor),
        className: options.cls,
      }),
      opacity: options.opacity
    })
  }
}
