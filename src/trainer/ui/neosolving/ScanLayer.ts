import * as leaflet from "leaflet";
import {TileCoordinates} from "../../../lib/runescape/coordinates/TileCoordinates";
import {GameMap, levelIcon} from "../../../lib/gamemap/GameMap";
import {ScanTree} from "../../../lib/cluetheory/scans/ScanTree";
import {Constants} from "../../constants";
import {TileMarker} from "../../../lib/gamemap/TileMarker";
import {ActiveOpacityGroup} from "../../../lib/gamemap/layers/OpacityLayer";
import {areaPolygon, boxPolygon} from "../polygon_helpers";
import {GameLayer} from "../../../lib/gamemap/GameLayer";
import {GameMapContextMenuEvent, GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import {Observable, observe} from "../../../lib/reactive";
import {MapEntity} from "../../../lib/gamemap/MapEntity";
import {Rectangle, Vector2} from "../../../lib/math";
import {Menu} from "../widgets/ContextMenu";
import Properties from "../widgets/Properties";
import ScanRegion = ScanTree.ScanRegion;
import observe_combined = Observable.observe_combined;

export class ScanRegionPolygon extends ActiveOpacityGroup {
  polygon: leaflet.Polygon
  label: leaflet.Tooltip

  constructor(private _spot: ScanRegion) {
    super(1, 0.2)

    this.update()
  }

  spot() {
    return this._spot
  }

  setRegion(spot: ScanRegion) {
    this._spot = spot
    this.update()
  }

  update() {
    if (this.polygon) {
      this.polygon.remove()
      this.polygon = null

      this.label.remove()
      this.label = null
    }

    if (this._spot?.area) {

      this.polygon = areaPolygon(this._spot.area)

      this.label = leaflet.tooltip({
        interactive: false,
        permanent: true,
        className: "area-name",
        offset: [0, 0],
        direction: "center",
        pane: GameMap.objectPane,
        content: this._spot.name
      })

      this.polygon
        .setStyle({
          color: Constants.colors.scan_area,
          fillColor: Constants.colors.scan_area,
          interactive: false,
          pane: GameMap.areaPane
        })
        .bindTooltip(this.label)
        .addTo(this)
    }

    this.setActive(this.isActive())
  }
}

export class ScanRadiusMarker extends MapEntity {
  private marker: TileMarker

  constructor(public spot: TileCoordinates,
              private range: number,
              private include_marker: boolean,
              private is_complement: boolean,
              private range_is_with_meerkats: boolean
  ) {
    super();
    this.setInteractive()

    this.setTooltip(() => {
      const props = new Properties()

      props.header(`Manual Radius Marker`)

      if (this.is_complement) {
        props.named("Position", TileCoordinates.toString(this.spot) + " (In complement area)")

        props.named("Radius", `${this.range + 15} (${this.range} base + 15 due to being in complement area)`)
      } else {
        props.named("Position", TileCoordinates.toString(this.spot))

        if (this.range_is_with_meerkats) {
          props.named("Radius", `${this.range} (${this.range - 5} base + 5 from meerkats)`)
        } else {
          props.named("Radius", this.range.toString())
        }
      }

      props.row(c().text("Click to remove").css("font-style", "italic"))

      return props
    })
  }

  bounds(): Rectangle {
    return Rectangle.centeredOn(this.spot, this.range * 2)
  }

  protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
    if (this.include_marker) {
      leaflet.marker(Vector2.toLatLong(this.spot), {
        icon: levelIcon(this.spot.level, props.highlight ? 1.5 : 1),
        opacity: props.opacity,
        interactive: true,
        bubblingMouseEvents: true,
      }).addTo(this)
    }

    if (this.is_complement) {
      boxPolygon({
        topleft: {x: this.spot.x - (this.range + 15), y: this.spot.y + (this.range + 15)},
        botright: {x: this.spot.x + (this.range + 15), y: this.spot.y - (this.range + 15)}
      }).setStyle({
        interactive: false
      }).setStyle({color: "#8adc13", fillOpacity: 0}).addTo(this)
    } else {
      boxPolygon({
        topleft: {x: this.spot.x - this.range, y: this.spot.y + this.range},
        botright: {x: this.spot.x + this.range, y: this.spot.y - this.range}
      }).setStyle({
        interactive: false
      }).setStyle({color: "#e51c02", fillOpacity: 0, dashArray: [9, 6, 9, 6, 9, 18]}).addTo(this)
      boxPolygon({
        topleft: {x: this.spot.x - 2 * this.range, y: this.spot.y + 2 * this.range},
        botright: {x: this.spot.x + 2 * this.range, y: this.spot.y - 2 * this.range}
      }).setStyle({
        interactive: false
      }).setStyle({color: "#fff40b", fillOpacity: 0, dashArray: [9, 9, 9, 18]}).addTo(this)
    }

    return this.marker?.marker?.getElement()
  }

  async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
    return {
      type: "submenu",
      text: "",
      children: []
    }
  }
}

export class AdaptiveScanRadiusMarker extends GameLayer {
  private custom_marker: ScanRadiusMarker

  marker_spot: Observable<{
    coordinates: TileCoordinates,
    with_marker: boolean,
  } | null> = observe(null)

  scan_range: Observable<{ radius: number, meerkat: boolean }> = observe({radius: 10, meerkat: false})

  surface_is_complement = observe(false)

  private fixedMarker: Observable<TileCoordinates> = observe(null)
  private manualMarker: Observable<TileCoordinates> = observe(null)
  private cursorMarker: Observable<TileCoordinates> = observe(null)

  public canBeManuallySet: Observable<boolean> = observe(false)
  public followCursor: Observable<boolean> = observe(false)


  constructor() {
    super();

    this.canBeManuallySet.subscribe(() => {
      this.manualMarker.set(null)
    })

    observe_combined({
      fixed: this.fixedMarker,
      manual: this.manualMarker,
      cursor: this.cursorMarker,
      manualEnabled: this.canBeManuallySet,
      followEnabled: this.followCursor
    }).subscribe(({fixed, manual, cursor, manualEnabled, followEnabled}) => {
      if (followEnabled && cursor) {
        this.marker_spot.set({coordinates: cursor, with_marker: false})
      } else if (manualEnabled && manual) {
        this.marker_spot.set({coordinates: manual, with_marker: true})
      } else if (fixed) {
        this.marker_spot.set({coordinates: fixed, with_marker: false})
      } else {
        this.marker_spot.set(null)
      }
    })

    observe_combined({range: this.scan_range, spot: this.marker_spot}).subscribe(({range, spot}) => {
      if (this.custom_marker) {
        this.custom_marker.remove()
        this.custom_marker = null
      }

      if (spot) {
        let is_complement = (spot.coordinates.y < 6400) == this.surface_is_complement.value()

        this.custom_marker = new ScanRadiusMarker(spot.coordinates, range.radius, spot.with_marker, is_complement, range.meerkat).addTo(this)
      }
    })
  }

  setComplementByExampleSpot(spot: TileCoordinates): this {
    this.surface_is_complement.set(spot.y >= 6400)

    return this
  }

  setFixedSpot(spot: TileCoordinates): this {
    this.fixedMarker.set(spot)
    return this
  }

  setFollowCursor(v: boolean): this {
    this.followCursor.set(v)
    return this
  }

  setClickable(v: boolean): this {
    this.canBeManuallySet.set(v)
    return this
  }

  setRadius(radius: number, is_with_meerkat: boolean): this {
    this.scan_range.set({radius: radius, meerkat: is_with_meerkat})
    return this
  }

  clearManualMarker() {
    this.manualMarker.set(null)
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(() => {
      if (this.canBeManuallySet.value()) {
        if ((this.custom_marker && event.active_entity == this.custom_marker) || TileCoordinates.eq2(event.tile(), this.manualMarker.value())) {
          this.clearManualMarker()
        } else {
          this.manualMarker.set(event.tile())
        }
      }
    })
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPost(() => {
      if (this.followCursor.value()) {
        this.cursorMarker.set(event.tile())
      }
    })
  }

  eventContextMenu(event: GameMapContextMenuEvent) {
    event.onPre(() => {
      if (event.active_entity instanceof ScanRadiusMarker && event.active_entity == this.custom_marker) {
        event.addForEntity({
          type: "basic",
          text: "Remove",
          handler: () => {
            this.manualMarker.set(null)
          }
        })
      } else if (this.canBeManuallySet.value() && !event.active_entity) {

        if (TileCoordinates.eq2(this.manualMarker.value(), event.tile())) {
          event.add({
            type: "basic",
            text: "Remove Marker",
            handler: () => {
              this.manualMarker.set(null)
            }
          })
        } else {
          event.add({
            type: "basic",
            text: "Set Marker",
            handler: () => {
              this.manualMarker.set(event.tile())
            }
          })
        }
      }
    })
  }
}