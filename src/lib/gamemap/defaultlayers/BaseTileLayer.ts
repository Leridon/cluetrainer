import * as leaflet from "leaflet";
import {GameMap} from "../GameMap";

export default class BaseTileLayer extends leaflet.TileLayer {
  constructor(private readonly zoomurls: BaseTileLayer.LayerSource[],
              opts?: leaflet.TileLayerOptions) {
    super(zoomurls[0].urls[0], opts);
    this.zoomurls = zoomurls;

    this.on("tileerror", e => {
      let layer = e.sourceTarget as BaseTileLayer;
      let errcount = (e.tile.dataset.errcount ? +e.tile.dataset.errcount : 0) + 1;
      e.tile.dataset.errcount = errcount + "";
      let src = layer.getTileUrl(e.coords, errcount);
      if (src) {
        e.tile.src = src;
      }
    });
  }

  getZoomConfig(zoom: number): BaseTileLayer.LayerSource {
    // Find first zoom url that contains the zoom
    return this.zoomurls.find((level) => (level.from ?? -Infinity) <= zoom && (level.to ?? Infinity) >= zoom)
  }

  override getTileUrl(coords: leaflet.Coords, retrycount = 0) {
    let cnf = this.getZoomConfig(coords.z);
    let url = cnf?.urls[retrycount] ?? "";
    return leaflet.Util.template(url, {x: coords.x, y: coords.y, z: coords.z});
  }
}

export namespace BaseTileLayer {
  export type LayerSource = { urls: string[], from?: number, to?: number };
}