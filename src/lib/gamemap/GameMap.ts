import * as leaflet from "leaflet";
import {FitBoundsOptions, MapOptions, Polygon} from "leaflet";
import {floor_t, TileCoordinates, TileRectangle} from "../runescape/coordinates";
import Graticule from "./defaultlayers/Graticule";
import Widget from "../ui/Widget";
import ContextMenu from "../../trainer/ui/widgets/ContextMenu";
import TileHighlightLayer from "./defaultlayers/TileHighlightLayer";
import {GameMapContextMenuEvent, GameMapEvent, GameMapKeyboardEvent, GameMapMouseEvent, GameMapViewChangedEvent} from "./MapEvents";
import {GameMapControl} from "./GameMapControl";
import BaseTileLayer from "./defaultlayers/BaseTileLayer";
import FloorControl from "./defaultlayers/FloorControl";
import {Rectangle, Vector2} from "../math";
import {util} from "../util/util";
import {Observable, observe} from "../reactive";
import {GameLayer} from "./GameLayer";
import {InteractionGuard} from "./interaction/InteractionLayer";
import {ValueInteraction} from "./interaction/ValueInteraction";
import * as jquery from "jquery";
import {C} from "../ui/constructors";
import {Constants} from "../../trainer/constants";
import cls = C.cls;
import {boxPolygon} from "../../trainer/ui/polygon_helpers";

export const red_marker = "/assets/icons/marker_red.png"
export const blue_marker = "/assets/icons/marker_blue.png"
export const green_marker = "/assets/icons/marker_green.png"
export const yellow_marker = "/assets/icons/marker_yellow.png"

export const red_icon = leaflet.icon({
  iconUrl: red_marker,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  className: "marker-icon"
})
export const blue_icon = leaflet.icon({
  iconUrl: blue_marker,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  className: "marker-icon"
})
export const green_icon = leaflet.icon({
  iconUrl: green_marker,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  className: "marker-icon"
})

export const yellow_icon = leaflet.icon({
  iconUrl: yellow_marker,
  iconSize: [18, 24],
  iconAnchor: [9, 24],
  className: "marker-icon"
})

export function levelIcon(floor: floor_t, scale: number = 1) {
  const levels = [
    "/assets/icons/marker_red.png",
    "/assets/icons/marker_blue.png",
    "/assets/icons/marker_green.png",
    "/assets/icons/marker_yellow.png",
  ]

  // Original size: 46 x 62
  // 23 x 31

  return leaflet.icon({
    iconUrl: levels[floor],
    iconSize: [scale * 18, scale * 24],
    iconAnchor: [scale * 9, scale * 24],
    className: "marker-icon",
  })
}

/**
 * This map class wraps a leaflet map view and provides features needed for the solver.
 * Map data is sourced from Skillbert's amazing runeapps.org.
 */
export class GameMap extends leaflet.Map {
  floor: Observable<floor_t> = observe(0)

  public viewport: Observable<GameMap.View> = observe(null).equality(GameMap.View.equals)

  container: JQuery
  private ui_container: Widget

  private internal_root_layer: GameLayer

  private baseLayers: leaflet.TileLayer[]

  private _lastHoveredTile: TileCoordinates = null

  constructor(element: HTMLElement) {
    super(element, GameMap.gameMapOptions());

    this.container = jquery(element)

    {
      // Setup custom panes for z layering
      const overlay_pane = this.getPane("overlayPane")

      const areaPane = this.createPane(GameMap.areaPane, overlay_pane);
      const pathTargetPane = this.createPane(GameMap.pathTargetPane, overlay_pane);
      const objectPane = this.createPane(GameMap.objectPane, overlay_pane);
      const pathArrowPane = this.createPane(GameMap.pathArrowPane, overlay_pane);

      areaPane.style.zIndex = "410"
      pathTargetPane.style.zIndex = "420"
      objectPane.style.zIndex = "430"
      pathArrowPane.style.zIndex = "440"
    }

    // Set up UI layers
    {
      this.ui_container = cls("gamemap-ui-container").appendTo(this.container)
      //this.top_control_container.container.on("click", (e) => e.stopPropagation())
      // TODO: prevent event propagation like above?

      for (let key in GameMap.position_layer_class_mapping) {
        cls(GameMap.position_layer_class_mapping[key])
          .appendTo(this.ui_container)
      }
    }

    const gridPane = this.createPane("gridPane")

    gridPane.style.zIndex = "250" // Above tile pane, below overlay pane

    this.internal_root_layer = new GameLayer()
    this.addLayer(this.internal_root_layer)

    this.addGameLayer(new FloorControl())
      .addGameLayer(new TileHighlightLayer())

    // Set up all the event handlers to translate into GameMapEvents
    {
      this.on("contextmenu", async (e) => {
        e.originalEvent.preventDefault()

        let event = this.event(new GameMapContextMenuEvent(this, e, this.eventCoordinate(e)), (l) => (e) => l.eventContextMenu(e))

        if (event.active_entity) {
          await this.internal_root_layer.lockEntity(event.active_entity)
        }

        new ContextMenu(await event.getMenu())
          .show(this.container.get()[0], {x: e.originalEvent.clientX, y: e.originalEvent.clientY})
          .onClosed(async () => {
            this.container.focus()
            await this.internal_root_layer.lockEntity(null)
          })

      })

      this.on("click", (e) => {
        e.originalEvent.preventDefault()

        this.event(new GameMapMouseEvent(this, e, this.eventCoordinate(e)), (l) => (e) => l.eventClick(e))
      })

      this.on("mousemove", (e) => {
        let t =TileCoordinates.snap(this.eventCoordinate(e))

        if (this.internal_root_layer.activeEntity()?.isStillHovered() == false) {
          this.internal_root_layer.requestEntityActivation(null)
        }

        if (!TileCoordinates.eq2(t, this._lastHoveredTile)) {
          this._lastHoveredTile = t
          this.event(new GameMapMouseEvent(this, e, t), (l) => (e) => l.eventHover(e))
        }
      })

      this.on("mouseup", (e) => {
        e.originalEvent.preventDefault()

        this.event(new GameMapMouseEvent(this, e, this.eventCoordinate(e)), (l) => (e) => l.eventMouseUp(e))
      })

      this.on("mousedown", (e) => {
        e.originalEvent.preventDefault()
        e.originalEvent.stopPropagation()

        this.event(new GameMapMouseEvent(this, e, this.eventCoordinate(e)), (l) => (e) => l.eventMouseDown(e))
      })

      this.on("keydown", (e) => {
        this.event(new GameMapKeyboardEvent(this, e), l => e => l.eventKeyDown(e))
      })

      this.on("keyup", (e) => {
        this.event(new GameMapKeyboardEvent(this, e), l => e => l.eventKeyUp(e))
      })

      this.viewport.subscribe((new_value, old) => {
        this.event(new GameMapViewChangedEvent(this, old, new_value), l => e => l.eventViewChanged(e))
      })

      this.on("moveend", () => this.updateView())
      this.on("zoomend", () => this.updateView())
      this.floor.subscribe(() => this.updateView())
    }

    // Add subtle gridlines
    new Graticule({
      intervals: [
        {min_zoom: -3, interval: 64},
        {min_zoom: 0.5, interval: 8},
        {min_zoom: 1, interval: 4},
        {min_zoom: 2, interval: 1},
      ],
      lineStyle: {
        weight: 1,
        color: '#111111',
        opacity: 0.25,
        interactive: false
      },
      pane: "gridPane"
    })
      .addTo(this)

    this.updateBaseLayers()

    this.floor.subscribe(() => this.updateBaseLayers())
  }

  /*
  _handleDOMEvent(e) {
    // Fix bug with leaflet  by overriding this function

    const self = this as any

    var el = (e.target || e.srcElement);
    if (!self._loaded || el['_leaflet_disable_events'] || e.type === 'click' && self._isClickDisabled(el)) {
      console.log("discarding")

      return;
    }

    var type = e.type;

    if (type == "click") console.log("Click still alive")

    if (type === 'mousedown' && el) { // This is the fix because el is null in some cases
      // prevents outline when clicking on keyboard-focusable element
      try {
        DomUtil.preventOutline(el);
      } catch (e) {

      }
    }

    self._fireDOMEvent(e, type);
  }
  _fireDOMEvent(e, type, canvasTargets) {

    const self = this as any

    if (e.type === 'click') {
      // Fire a synthetic 'preclick' event which propagates up (mainly for closing popups).
      // @event preclick: MouseEvent
      // Fired before mouse click on the map (sometimes useful when you
      // want something to happen on click before any existing click
      // handlers start running).
      var synth = Util.extend({}, e);
      synth.type = 'preclick';
      this._fireDOMEvent(synth, synth.type, canvasTargets);
    }

// Find the layer the event is propagating from and its parents.
    var targets = self._findEventTargets(e, type);

    if (canvasTargets) {
      var filtered = []; // pick only targets with listeners
      for (var i = 0; i < canvasTargets.length; i++) {
        if (canvasTargets[i].listens(type, true)) {
          filtered.push(canvasTargets[i]);
        }
      }
      targets = filtered.concat(targets);
    }

    if (!targets.length) {
      if (type == "click") console.log("Discard due to lack of targets")
      return;
    }

    if (type === 'contextmenu') {
      DomEvent.preventDefault(e);
    }

    var target = targets[0];
    var data = {
      originalEvent: e
    } as any;


    if (e.type !== 'keypress' && e.type !== 'keydown' && e.type !== 'keyup') {
      var isMarker = target.getLatLng && (!target._radius || target._radius <= 10);
      data.containerPoint = isMarker ?
        this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
      data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
      data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
    }


    for (i = 0; i < targets.length; i++) {
      targets[i].fire(type, data, true);
      if (data.originalEvent._stopped ||
        (targets[i].options.bubblingMouseEvents === false && Util.indexOf(self._mouseEvents, type) !== -1)) { return; }
    }
  }

   */

  private updateView(): this {
    const bounds = this.getBounds()

    this.viewport.set({
      rect: TileRectangle.lift(Rectangle.extend(Rectangle.from(Vector2.fromLatLong(bounds.getNorthEast()), Vector2.fromLatLong(bounds.getSouthWest())), 1), this.floor.value()),
      zoom: this.getZoom()
    })

    return this
  }

  private fitArea: Polygon = null
  private debug_show_fit_area = false

  public fitView(view: TileRectangle, options: FitBoundsOptions = {}): this {
    options.maxZoom ??= 4

    this.invalidateSize()

    const finalbounds = util.convert_bounds(Rectangle.toBounds(view)).pad(0.1)

    this.fitBounds(finalbounds, options)

    if (this.debug_show_fit_area) {
      this.fitArea?.remove()

      this.fitArea = leaflet.polygon([finalbounds.getNorthEast(), finalbounds.getNorthWest(), finalbounds.getSouthWest(), finalbounds.getSouthEast()]).setStyle({
        color: "#FFFFFF",
        weight: 5
      }).addTo(this)
    }

    this.floor.set(view.level)
    return this
  }

  getClientPos(coordinates: Vector2): Vector2 {
    return Vector2.add(this.latLngToContainerPoint(Vector2.toLatLong(coordinates)), {
      x: this.container.get()[0].getBoundingClientRect().left,
      y: this.container.get()[0].getBoundingClientRect().top
    })
  }

  public addGameLayer(layer: GameLayer): this {
    this.internal_root_layer.add(layer)

    return this
  }

  public override addControl(control: leaflet.Control | GameMapControl): this {
    if (!(control instanceof GameMapControl)) {
      super.addControl(control)
    } else {
      let self = this

      function getPositionLayer(position: GameMapControl.position_t): JQuery {
        return self.ui_container.container.children(`.${GameMap.position_layer_class_mapping[position]}`)
      }

      control.content.appendTo(getPositionLayer(control.config.position))
    }

    return this
  }

  private updateBaseLayers() {
    const SKILLBERT_ATTRIBUTION = '<a href="https://runeapps.org/" title="Creator of Alt1 and RuneApps.org">Skillbert</a>'

    function geturls(filename: string) {
      return [
        `https://map.cluetrainer.app/${filename}`,
      ];
    }

    const layers: leaflet.TileLayer[] = [
      // Rendered Top Down Layer
      new BaseTileLayer([
        {urls: geturls(`topdown-${this.floor.value()}/{z}/{x}-{y}.webp`)}
      ], {
        attribution: SKILLBERT_ATTRIBUTION,
        tileSize: 512,
        maxNativeZoom: 5,
        minZoom: -5,
        bounds: GameMap.bounds()
      }),
      // Walls SVG Layer
      new BaseTileLayer([
        {to: 2, urls: geturls(`walls-${this.floor.value()}/{z}/{x}-{y}.webp`)},
        {from: 3, to: 3, urls: geturls(`walls-${this.floor.value()}/{z}/{x}-{y}.svg`)}
      ], {
        attribution: SKILLBERT_ATTRIBUTION,
        tileSize: 512,
        maxNativeZoom: 3,
        pane: GameMap.objectPane,
        minZoom: -5,
        bounds: GameMap.bounds()
      }),
      // Filtered Collision Layer
      new BaseTileLayer([
        {urls: geturls(`collision-${this.floor.value()}/{z}/{x}-{y}.png`)}
      ], {
        attribution: SKILLBERT_ATTRIBUTION,
        tileSize: 512,
        maxNativeZoom: 3,
        minZoom: -5,
        className: "map-collisionlayer",
        bounds: GameMap.bounds()
      })
    ]

    const oldbase = this.baseLayers;
    if (oldbase && oldbase.length > 0) {
      //prevent loading of new tiles on old layer
      oldbase.forEach(q => q.on("tileloadstart", e => e.target.src = ""));

      layers[0].on("load", () => oldbase.forEach(q => q.remove()));

      // Definitely remove old base layers after 500 ms in case the event doesn't trigger
      setTimeout(() => oldbase.forEach(q => q.remove()), 500)
    }

    this.baseLayers = layers

    layers.forEach((l) => l.addTo(this))
  }

  eventCoordinate(e: leaflet.LeafletMouseEvent): TileCoordinates {
    return {
      x: e.latlng.lng,
      y: e.latlng.lat,
      level: this.floor.value()
    }
  }

  private event<T extends GameMapEvent<any, any>>(event: T, h: (_: GameLayer) => (_: T) => any): T {
    function propagate(l: GameLayer) {
      if (!l) return;

      event.propagation_state.phase = "pre"
      h(l)(event)

      if (!event.propagation_state.trickle_stopped && !event.propagation_state.trickle_stopped_immediate) {
        l.eachLayer(lay => {
          if (lay instanceof GameLayer) propagate(lay)
        })
      }

      if (event.propagation_state.trigger_post_order) {
        event.propagation_state.phase = "post"
        h(l)(event)
      }

      event.propagation_state.trickle_stopped_immediate = false
    }

    event.active_entity = this.internal_root_layer.getHoveredEntity()

    if (!event.active_entity?.isStillHovered()) event.active_entity = null

    propagate(this.internal_root_layer)

    return event
  }
}

export namespace GameMap {
  export const areaPane = "underlayAreaPane"
  export const pathArrowPane = "pathArrowPane"
  export const pathTargetPane = "pathAreaPane"
  export const objectPane = "objectAreaPane"

  export const size = {
    chunks: {x: 100, y: 200},
    chunk_size: {x: 64, y: 64},
  }

  export function bounds(): leaflet.LatLngBounds {
    return new leaflet.LatLngBounds([0, 0], [size.chunks.y * size.chunk_size.y, size.chunks.x * size.chunk_size.x])
  }

  export function gameMapOptions(): MapOptions {

    function getCRS(): leaflet.CRS {
      const chunkoffset = {
        x: 16,
        z: 16
      }

      const mapsize = {
        x: 100,
        z: 200
      }

      const chunksize = 64;

      let crs = leaflet.CRS.Simple;

      //add 0.5 to so coords are center of tile
      // @ts-ignore
      crs.transformation = leaflet.transformation(
        1, chunkoffset.x + 0.5,
        -1, mapsize.z * chunksize + -1 * (chunkoffset.z + 0.5)
      );

      return crs
    }

    return {
      crs: getCRS(),
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      minZoom: -5,
      maxZoom: 7,
      zoomControl: false,
      dragging: true,
      doubleClickZoom: false,
      boxZoom: false,
      attributionControl: false,
      preferCanvas: false,
      maxBounds: bounds(),
      maxBoundsViscosity: 0.5
    }
  }

  export const position_layer_class_mapping: Record<GameMapControl.position_t, string> = {
    "bottom-center": "gamemap-ui-layer-bc",
    "bottom-left": "gamemap-ui-layer-bl",
    "bottom-right": "gamemap-ui-layer-br",
    "left-bottom": "gamemap-ui-layer-lb",
    "left-center": "gamemap-ui-layer-lc",
    "left-top": "gamemap-ui-layer-lt",
    "right-bottom": "gamemap-ui-layer-rb",
    "right-center": "gamemap-ui-layer-rc",
    "right-top": "gamemap-ui-layer-rt",
    "top-center": "gamemap-ui-layer-tc",
    "top-left": "gamemap-ui-layer-tl",
    "top-right": "gamemap-ui-layer-tr"
  }

  export type View = { rect: TileRectangle, zoom: number }

  export namespace View {
    export function equals(a: View, b: View): boolean {
      return TileRectangle.equals(a?.rect, b?.rect) && a?.zoom == b?.zoom
    }
  }
}

export class GameMapWidget extends Widget {
  map: GameMap

  constructor(container: JQuery = jquery("<div>")) {
    super(container)

    this.map = new GameMap(container.get()[0])
      .setView([3200, 3000], 0);
  }
}

export class GameMapMiniWidget extends Widget {
  map: GameMap

  private interaction_guard: InteractionGuard
  main_layer: GameLayer

  constructor() {
    super();

    this.map = new GameMap(this.raw())
      .setView([3200, 3000], 0);

    this.main_layer = new GameLayer().addTo(this.map)

    this.interaction_guard = new InteractionGuard().setDefaultLayer(this.main_layer)
  }

  setInteraction(interaction: ValueInteraction<any>): this {
    this.interaction_guard.set(interaction)

    return this
  }
}