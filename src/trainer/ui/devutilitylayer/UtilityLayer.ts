import {GameLayer} from "../../../lib/gamemap/GameLayer";
import * as leaflet from "leaflet";
import {LatLngBounds} from "leaflet";
import {InteractionGuard} from "../../../lib/gamemap/interaction/InteractionLayer";
import Widget from "../../../lib/ui/Widget";
import ControlWithHeader from "../map/ControlWithHeader";
import {ActionBar} from "../map/ActionBar";
import {DrawRegionAction} from "../theorycrafting/scanedit/TreeEdit";
import {areaPolygon, tilePolygon} from "../polygon_helpers";
import LightButton from "../widgets/LightButton";
import {floor_t, TileCoordinates} from "../../../lib/runescape/coordinates";
import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import {SelectTileInteraction} from "../../../lib/gamemap/interaction/SelectTileInteraction";
import InteractionTopControl from "../map/InteractionTopControl";
import {GameMapKeyboardEvent, GameMapMouseEvent, GameMapViewChangedEvent} from "../../../lib/gamemap/MapEvents";
import {C} from "../../../lib/ui/constructors";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import Graticule from "../../../lib/gamemap/defaultlayers/Graticule";
import {deps} from "../../dependencies";
import {DrawTileAreaInteraction} from "./DrawTileAreaInteraction";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {util} from "../../../lib/util/util";
import {storage} from "../../../lib/util/storage";
import {GameMap} from "../../../lib/gamemap/GameMap";
import {ParserManagementLayer} from "./ParserManagement";
import {NavigationControl} from "./NavigationControl";
import vbox = C.vbox;
import hbox = C.hbox;
import spacer = C.spacer;
import cleanedJSON = util.cleanedJSON;
import {Notification} from "../NotificationBar";
import notification = Notification.notification;

class ChunkGridGraticule extends Graticule {
  constructor() {
    super({
      intervals: [
        {min_zoom: -Infinity, interval: 64},
      ],
      lineStyle: {
        stroke: true,
        weight: 2,
        color: "white",
        fill: false
      }
    });
  }

  override onRemove(map): this {
    super.onRemove(map);

    this.clearLayers()

    return this
  }

  override constructLines(bounds: LatLngBounds, interval: number) {
    super.constructLines(bounds, interval)

    let mins = {
      x: Math.max(0, Math.floor(bounds.getWest() / interval)),
      y: Math.max(0, Math.floor(bounds.getSouth() / interval))
    };

    let max = {
      x: Math.min(99, Math.ceil(bounds.getEast() / interval)),
      y: Math.min(199, Math.ceil(bounds.getNorth() / interval))
    };

    for (let x = mins.x; x <= max.x; x++) {
      for (let y = mins.y; y <= max.y; y++) {
        leaflet.marker([y * 64 + 31.5, x * 64 + 31.5], {
          icon: leaflet.divIcon({
            iconSize: [100, 40],
            html: `${x}|${y}`,
            className: "ctr-map-utility-chunk-index"
          }),
        }).addTo(this)
      }
    }
  }
}

export class HoverTileDisplay extends GameMapControl {

  constructor() {
    super({
      type: "gapless",
      position: "top-left"
    }, c().css("padding", "2px"));
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.content.text(TileCoordinates.toString(event.tile()))
    })
  }
}

class LayerToggling extends GameMapControl {
  view_storage = new storage.Variable<string[]>("devutility/activelayers", () => [])
  private data: {
    persistence_id: string
    checkbox: Checkbox,
    layer: leaflet.Layer
  }[]

  constructor(private layers: {
    constructor: () => leaflet.Layer,
    name: string,
    persistence_id?: string
  }[]) {
    super({
      type: "floating",
      position: "top-right"
    }, c())

    this.data = new Array(layers.length)

    this.data = layers.map((l, index) => {
      return {
        persistence_id: l.persistence_id,
        layer: null,
        checkbox: new Checkbox(l.name)
          .onCommit(v => {
            const entry = this.data[index]

            entry.layer?.remove()
            entry.layer = null

            if (l.persistence_id) {
              if (v) {
                let old = this.view_storage.get()

                if (!old.includes(l.persistence_id)) {
                  old.push(l.persistence_id)
                }

                this.view_storage.set(old)
              } else {
                this.view_storage.set(this.view_storage.get().filter(i => i != l.persistence_id))
              }
            }

            if (v) {
              entry.layer = l.constructor().addTo(this)
            }
          })
      }
    })

    this.setContent(vbox(...this.data.map(d => d.checkbox)))
  }

  loadPersistence(): this {
    const persist = this.view_storage.get()

    this.data.forEach(e => {
      if (e.persistence_id) e.checkbox.setValue(persist.includes(e.persistence_id))
    })

    return this
  }


}

class GeometryDrawing extends GameLayer {
  output: Widget
  value: string
  preview: leaflet.Layer

  constructor(private guard: InteractionGuard) {
    super();

    let bottom_control = new ControlWithHeader("Utility")

    bottom_control.body.append(
      vbox(
        new ActionBar([
          new ActionBar.ActionBarButton("/assets/icons/cursor_generic.png", () => {
            this.startSelectTile()
          }),
          new ActionBar.ActionBarButton("/assets/icons/cursor_use.png", () => {
            this.startSelectArea()
          }),
          new ActionBar.ActionBarButton("/assets/icons/cursor_talk.png", () => {

            this.guard.set(new DrawRegionAction(""))
              .onCommit((a) => {
                this.setLayer(areaPolygon(a.area))

                this.setValue({range: a.area})
              })
          }),
          new ActionBar.ActionBarButton("/assets/icons/cursor_pray.png", () => {

            this.guard.set(new DrawTileAreaInteraction([], true))
              .onCommit((a) => {
                //this.setLayer(boxPolygon(a.area))

                this.setValue(TileArea.fromTiles(a))
              })
          }),
        ]),
        hbox(
          this.output = c().css2({
            "max-width": "250px",
            "white-space": "nowrap",
            "text-overflow": "ellipsis",
            "overflow": "hidden"
          }),
          spacer(),
          new LightButton("Copy").onClick(() => {
            if (this.value) {
              navigator.clipboard.writeText(this.value)
              notification("Copied").show()
            }
          })
        ),
      )
    )

    this.add(new GameMapControl({
      type: "gapless",
      position: "bottom-center"
    }, bottom_control))
  }

  private startSelectTile() {
    let i = new SelectTileInteraction()

    i.add(new InteractionTopControl({
      name: "Select tile", cancel_handler: () => i.cancel()
    }).setText("Click a tile"))

    this.guard.set(i
      .onCommit((t) => {
        this.setLayer(tilePolygon(t))

        this.setValue(t)
      }))
  }

  private startSelectArea() {
    this.guard.set(new DrawRegionAction(""))
      .onCommit((a) => {
        this.setLayer(areaPolygon(a.area))

        this.setValue(TileArea.toRect(a.area))
      })
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPost(() => {
      if (event.original.key.toLowerCase() == "t") {
        this.startSelectTile()
      } else if (event.original.key.toLowerCase() == "a") {
        this.startSelectArea()
      }
    })
  }

  private setLayer(l: leaflet.Layer) {
    if (this.preview) {
      this.preview.remove()
      this.preview = null
    }

    this.preview = l.addTo(this)
  }

  private setValue(s: object) {
    this.value = cleanedJSON(s)
    if (this.value) navigator.clipboard.writeText(this.value)
    this.output.text(this.value)
  }
}

export default class UtilityLayer extends GameLayer {
  view_storage = new storage.Variable<{
    floor: floor_t,
    center: leaflet.LatLng,
    zoom: number
  }>("devutility/viewstore", () => undefined)


  guard: InteractionGuard

  constructor() {
    super();

    this.add(new HoverTileDisplay())

    this.guard = new InteractionGuard().setDefaultLayer(this)

    new LayerToggling([
      {persistence_id: "chunks", name: "Chunks", constructor: () => new ChunkGridGraticule()},
      {persistence_id: "geometry", name: "Geometry", constructor: () => new GeometryDrawing(this.guard)},
      {persistence_id: "navigation", name: "Navigation", constructor: () => new NavigationControl()},
      {persistence_id: "locparsing", name: "Loc Parsing", constructor: () => new ParserManagementLayer()},
    ])
      .addTo(this)
      .loadPersistence()
  }

  override onAdd(map: GameMap): this {
    super.onAdd(map)

    // Restore view
    const view = this.view_storage.get()

    if (view?.center) {
      this.map.setView(view.center, view.zoom)
    }

    if (view?.floor != null) {
      this.map.floor.set(view.floor)
    }

    return this;
  }

  eventViewChanged(event: GameMapViewChangedEvent) {
    super.eventViewChanged(event)

    event.onPre(() => {
      this.view_storage.set({
        floor: this.map.floor.value(),
        center: this.map.getCenter(),
        zoom: this.map.getZoom()
      })
    })
  }
}