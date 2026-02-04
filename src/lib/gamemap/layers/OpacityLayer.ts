import * as leaflet from "leaflet"
import {Layer} from "leaflet"

export class OpacityGroup extends leaflet.FeatureGroup {
  private opacity: number = 1

  constructor() {
    super();
  }

  setOpacity(opacity: number): this {
    this.opacity = opacity

    this.getTooltip()?.setOpacity(opacity)

    function set(layer: {
      layer: leaflet.Layer,
      baseline: {
        stroke: number,
        fill?: number
      }
    }): void {
      if (layer.layer instanceof OpacityGroup) layer.layer.setOpacity(opacity * layer.baseline.stroke)
      else if (layer.layer instanceof leaflet.Marker) layer.layer.setOpacity(opacity * layer.baseline.stroke)
      else if (layer.layer instanceof leaflet.Tooltip) layer.layer.setOpacity(opacity * layer.baseline.stroke)
      else if (layer.layer instanceof leaflet.Polyline) {
        // This hack is the reason this class exists at all.
        // Polylines (and by extension, Polygons) don't have a setOpacity method
        layer.layer.setStyle(Object.assign(layer.layer.options, {
          opacity: opacity * layer.baseline.stroke,
          fillOpacity: opacity * layer.baseline.fill,
        }))
      }

      layer.layer.getTooltip()?.setOpacity(opacity * layer.baseline.stroke)
    }

    this.children.forEach(set)

    return this
  }

  private children: {
    layer: leaflet.Layer,
    baseline: {
      stroke: number,
      fill?: number
    }
  }[] = []

  addLayer(layer: Layer): this {
    super.addLayer(layer);

    function get(): {
      stroke: number,
      fill?: number
    } {
      if (layer instanceof leaflet.Marker
        || layer instanceof leaflet.Tooltip
      ) return {
        stroke: layer.options.opacity
      }
      else if (layer instanceof OpacityGroup) return {
        stroke: layer.opacity
      }
      else if (layer instanceof leaflet.Polyline) return {
        stroke: layer.options.opacity,
        fill: layer.options.fillOpacity
      }

      return {stroke: 1}
    }

    this.children.push({
      layer: layer,
      baseline: get()
    })

    return this
  }

  removeLayer(layer: number | Layer): this {
    super.removeLayer(layer)

    this.children.splice(this.children.findIndex(c => c.layer == layer))

    return this
  }
}

export class ActiveOpacityGroup extends OpacityGroup {
  private active: boolean = true

  constructor(public active_opacity: number, public inactive_opacity: number) {
    super();
  }

  setActive(v: boolean): this {
    this.active = v

    this.setOpacity(v ? this.active_opacity : this.inactive_opacity)

    return this
  }

  isActive() {
    return this.active
  }
}