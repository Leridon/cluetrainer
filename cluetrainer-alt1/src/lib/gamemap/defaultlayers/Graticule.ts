import * as leaflet from "leaflet"
import {PolylineOptions} from "leaflet"
import lodash from "lodash";
import {Vector2} from "../../math";
import {FakeLodash} from "../../coreutil/FakeLodash";

/**
 *  File: Graticule.ts
 *  Desc: A graticule for Leaflet maps in the leaflet.CRS.Simple coordinate system.
 *  Original Author: Andrew Blakey (ablakey@gmaileaflet.com)
 *  Ported to typescript and adjusted to this project's needs.
 */
export default class Graticule extends leaflet.FeatureGroup {

  last_drawn: {
    bounds: leaflet.LatLngBounds,
    interval: number
  } = null

  private _style: PolylineOptions

  constructor(public _options: {
                intervals: {
                  min_zoom: number,
                  interval: number
                }[],
                offset?: Vector2,
                lineStyle?: PolylineOptions
                pane?: string | undefined
              },
  ) {
    super()

    this._style = _options.lineStyle

    if (!this._options.offset) this._options.offset = {x: 0.5, y: 0.5}

    if (!this._options.lineStyle) this._options.lineStyle = {
      stroke: true,
      color: '#111',
      opacity: 0.6,
      weight: 1,
      interactive: false,
    }

    if (_options.pane && !this._style.pane) this._style.pane = _options.pane
  }

  _hook = () => this.redraw()

  override onAdd(map): this {
    super.onAdd(map)

    this._map = map;

    let self = this

    this._map.on('zoomend', self._hook)
    this._map.on('moveend', self._hook)

    this.redraw()

    return this
  }

  override onRemove(map): this {
    let self = this

    this._map.off('zoomend', self._hook)
    this._map.off('moveend', self._hook)

    return this
  }

  redraw() {
    let bounds = this._map.getBounds()
    let interval = FakeLodash.minBy(this._options.intervals.filter((i) => this._map.getZoom() >= i.min_zoom), (i) => i.interval)

    if (!this.last_drawn || !this.last_drawn.bounds.contains(bounds) || this.last_drawn.interval != interval?.interval) {
      this.constructLines(this._map.getBounds().pad(0.5), interval?.interval)
    }
  }

  constructLines(bounds: leaflet.LatLngBounds, interval: number) {
    this.last_drawn = {
      bounds: bounds,
      interval: interval
    }

    this.clearLayers()

    if (!interval) return

    let counts = {
      x: Math.ceil((bounds.getEast() - bounds.getWest()) / interval),
      y: Math.ceil((bounds.getNorth() - bounds.getSouth()) / interval)
    }

    let mins = {
      x: Math.floor(bounds.getWest() / interval) * interval,
      y: Math.floor(bounds.getSouth() / interval) * interval
    };

    const lines: [number, number][][] = []

    //for horizontal lines
    for (let i = 0; i <= counts.x; i++) {
      let x = mins.x + i * interval + this._options.offset.x - 1;

      lines.push([
        [bounds.getSouth(), x],
        [bounds.getNorth(), x]
      ])
    }

    //for vertical lines
    for (let j = 0; j <= counts.y; j++) {
      let y = mins.y + j * interval + this._options.offset.y - 1;

      lines.push([
        [y, bounds.getWest()],
        [y, bounds.getEast()],
      ])
    }

    new leaflet.Polyline(lines, this._style)
      .addTo(this)
  }
}