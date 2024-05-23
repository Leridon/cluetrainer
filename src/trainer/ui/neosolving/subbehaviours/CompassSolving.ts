import {NeoSolvingSubBehaviour} from "../NeoSolvingSubBehaviour";
import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {GameLayer} from "../../../../lib/gamemap/GameLayer";
import {Clues} from "../../../../lib/runescape/clues";
import {TileMarker} from "../../../../lib/gamemap/TileMarker";
import {TileCoordinates, TileRectangle} from "../../../../lib/runescape/coordinates";
import {GameMapMouseEvent} from "../../../../lib/gamemap/MapEvents";
import {C} from "../../../../lib/ui/constructors";
import * as leaflet from "leaflet"
import {degreesToRadians, radiansToDegrees, Rectangle, Transform, Vector2} from "../../../../lib/math";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {Compasses} from "../../../../lib/cluetheory/Compasses";
import {TeleportSpotEntity} from "../../map/entities/TeleportSpotEntity";
import * as lodash from "lodash";
import {isArray} from "lodash";
import {ClueReader} from "../cluereader/ClueReader";
import {Process} from "../../../../lib/Process";
import * as a1lib from "@alt1/base";
import {mixColor} from "@alt1/base";
import {CompassReader} from "../cluereader/CompassReader";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import {Transportation} from "../../../../lib/runescape/transportation";
import {TransportData} from "../../../../data/transports";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {PathGraphics} from "../../path_graphics";
import {util} from "../../../../lib/util/util";
import {ewent, observe} from "../../../../lib/reactive";
import {deps} from "../../../dependencies";
import {clue_data} from "../../../../data/clues";
import Properties from "../../widgets/Properties";
import {Notification} from "../../NotificationBar";
import Widget from "../../../../lib/ui/Widget";
import span = C.span;
import cls = C.cls;
import MatchedUI = ClueReader.MatchedUI;
import TeleportGroup = Transportation.TeleportGroup;
import findBestMatch = util.findBestMatch;
import stringSimilarity = util.stringSimilarity;
import angleDifference = Compasses.angleDifference;
import italic = C.italic;
import activate = TileArea.activate;
import notification = Notification.notification;
import CompassReadResult = CompassReader.CompassReadResult;

const DEVELOPMENT_CALIBRATION_MODE = false

class CompassHandlingLayer extends GameLayer {
  private lines: {
    line: leaflet.Layer
  }[] = []

  constructor(private solving: CompassSolving) {
    super()

    this.solving.spots.forEach((e, i) =>
      e.marker = new KnownCompassSpot(this.solving.clue, i)
        .setInteractive(true)
        .addTo(this)
    )
  }

  async updateOverlay() {
    this.lines.forEach(l => {
      l.line.remove()
    })

    this.lines = []

    const information = this.solving.entries.filter(e => e.information).map(l => l.information)

    this.lines = information.map(info => {
      const from = Rectangle.center(info.position.rect(), false)

      const off = Vector2.transform(Vector2.scale(2000, Compasses.ANGLE_REFERENCE_VECTOR), Transform.rotationRadians(info.angle_radians))

      const to = Vector2.add(from, off)

      const right = Vector2.transform(info.direction, Transform.rotationRadians(Math.PI / 2))

      const corner_near_left = Vector2.add(from, Vector2.scale(info.origin_uncertainty, right))
      const corner_near_right = Vector2.add(from, Vector2.scale(-info.origin_uncertainty, right))
      const corner_far_left = Vector2.add(from, Vector2.transform(off, Transform.rotationRadians(-CompassReader.EPSILON)))
      const corner_far_right = Vector2.add(from, Vector2.transform(off, Transform.rotationRadians(CompassReader.EPSILON)))

      return {
        line:
          leaflet.featureGroup([
            leaflet.polyline([Vector2.toLatLong(from), Vector2.toLatLong(to)])
            ,
            leaflet.polygon([
              Vector2.toLatLong(corner_near_left),
              Vector2.toLatLong(corner_near_right),
              Vector2.toLatLong(corner_far_left),
              Vector2.toLatLong(corner_far_right),
            ]).setStyle({
              stroke: false,
              fillOpacity: 0.2
            })
          ]).addTo(this)
      }
    })
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(() => {

      if (event.active_entity instanceof TeleportSpotEntity) {
        this.solving.registerSpot(event.active_entity.teleport)
      } else if (event.active_entity instanceof KnownCompassSpot && this.solving.selected_spot.value()) {
        this.solving.selected_spot.set(event.active_entity.spot)
      } else {
        this.solving.registerSpot(
          activate(TileArea.fromRect(TileRectangle.lift(
              Rectangle.centeredOn(event.tile(), this.solving.settings.manual_tile_inaccuracy),
              0
            ))
          )
        )
      }
    })
  }
}

class KnownCompassSpot extends MapEntity {
  public readonly spot: TileCoordinates

  constructor(public readonly clue: Clues.Compass, public readonly spot_id: number) {
    super()

    this.spot = clue.spots[spot_id]

    this.setTooltip(() => {
      const layout = new Properties()

      layout.header(`Compass spot ${this.spot_id + 1}`)

      return layout
    })
  }

  private possible: boolean = true
  private number: number | null = null

  setPossible(v: boolean, number: number): this {
    if (this.number != number || v != this.possible) {
      this.number = number
      this.possible = v

      this.requestRendering()
    }

    return this
  }

  bounds(): Rectangle {
    return Rectangle.from(this.spot)
  }

  protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
    const opacity = this.possible ? 1 : 0.5

    const marker = new TileMarker(this.spot)
      .withMarker(null, 0.5 * (props.highlight ? 1.5 : 1))

    if (this.number != null)
      marker.withLabel(this.number.toString(), "spot-number-on-map", [0, 10])

    marker
      .setOpacity(opacity)
      .addTo(this)

    return marker.marker.getElement()
  }

  setNumber(n: number): this {

    if (n != this.number) {
      this.number = n

      this.requestRendering()
    }

    return this

  }
}

class CompassReadService extends Process<void> {
  state = observe<{
    angle: number,
    spinning: boolean
  }>(null).equality((a, b) => a?.angle == b?.angle && a?.spinning == b?.spinning)

  closed = ewent<this>()

  last_read: CompassReadResult = null
  last_successful_angle: number = null

  ticks_since_stationary: number = 0

  constructor(private matched_ui: MatchedUI.Compass,
              private calibration_mode: CompassReader.CalibrationMode,
              private show_overlay: boolean
  ) {
    super();

    this.asInterval(100)
  }

  private overlay: OverlayGeometry = new OverlayGeometry()

  async implementation(): Promise<void> {

    while (!this.should_stop) {
      try {
        const capture_rect = this.matched_ui.rect

        const img = a1lib.captureHold(
          Rectangle.screenOrigin(capture_rect).x,
          Rectangle.screenOrigin(capture_rect).y,
          Rectangle.width(capture_rect) + 5,
          Rectangle.height(capture_rect) + 5,
        )

        this.overlay.clear()
        //this.overlay.rect(capture_rect)

        const read = this.last_read = CompassReader.readCompassState(
          CompassReader.find(img, Rectangle.screenOrigin(capture_rect)),
          DEVELOPMENT_CALIBRATION_MODE ? null : this.calibration_mode
        )

        switch (read.type) {
          case "likely_closed":
            this.closed.trigger(this)
            break;
          case "likely_concealed":
            break;
          case "success":
            if (this.last_successful_angle == read.state.angle) {
              this.state.set({
                angle: read.state.angle,
                spinning: false
              })
              this.ticks_since_stationary = 0
            } else {
              this.ticks_since_stationary++

              if (this.ticks_since_stationary > 2) {
                this.state.set({
                  angle: null,
                  spinning: true
                })
              }
            }

            this.last_successful_angle = read.state.angle

            break;
        }

        if (this.state.value()) {
          let text: string = null

          const state = this.state.value()

          if (state.spinning) {
            text = "Spinning"
          } else if (state.angle != null) {
            text = `${radiansToDegrees(state.angle).toFixed(DEVELOPMENT_CALIBRATION_MODE ? 3 : 2)}°`
          }

          if (text) {
            this.overlay.text(text,
              Vector2.add(Rectangle.center(capture_rect), {x: 5, y: 8}), {
                shadow: true,
                centered: true,
                width: 15,
                color: mixColor(255, 255, 255)
              })
          }
        }

        if (this.show_overlay) this.overlay.render()
      } catch (e) {
        // Catch errors to avoid crashing on rare errors.
      }
      await this.checkTime()
    }

    this.overlay?.clear()
    this.overlay?.render()
  }
}

class CompassEntryWidget extends Widget {
  selection_requested = ewent<this>()
  discard_requested = ewent<this>()
  commit_requested = ewent<this>()

  constructor(public entry: CompassSolving.Entry) {
    super(cls("ctr-compass-solving-entry"));

    this.tooltip("Select")
      .on("click", () => {
        this.selection_requested.trigger(this)
      })

    this.render()
  }

  setSelected(value: boolean): this {
    this.toggleClass("selected", value)
    return this
  }

  setPreviewAngle(angle: number | null): this {
    console.log(`Setting ${angle}`)

    if (this.entry.angle == null) {
      if (angle != null) {
        this.angle_container.text(`${radiansToDegrees(angle).toFixed(0)}°`)
      } else {
        this.angle_container.text(`???°`)
      }
    }

    return this
  }

  private angle_container: Widget = null

  render(): void {
    this.empty()

    const row = this

    {
      const position = cls("ctr-neosolving-compass-entry-position").appendTo(row)

      if (this.entry.position) {
        if (this.entry.position instanceof TeleportGroup.Spot) {
          position.append(
            PathGraphics.Teleport.asSpan(this.entry.position),
            span(this.entry.position.spot.name)
          )
        } else {
          position.append(span(TileCoordinates.toString(this.entry.position.center())))
        }
      } else {
        position.append(italic("No location selected"))
      }
    }

    {
      const angle = this.angle_container = cls("ctr-compass-solving-angle").appendTo(row)
        .on("click", (e) => {
          e.stopPropagation()

          if (this.entry.angle != null) {
            this.entry.angle = null
            angle.toggleClass("committed", false)
              .tooltip("Click to discard")
          } else {
            this.commit_requested.trigger(this)
          }
        })

      if (this.entry.angle != null) {
        angle
          .tooltip("Click to discard")
          .addClass("committed")
          .text(`${radiansToDegrees(this.entry.angle).toFixed(0)}°`)
      } else {
        angle
          .tooltip("Click to commit (Alt + 1)")
          .text(`???°`)
      }
    }

    {
      const discard_button = cls("ctr-neosolving-compass-entry-button")
        .setInnerHtml("&times;")
        .tooltip("Discard")
        .appendTo(row)
        .on("click", () => {
          this.discard_requested.trigger(this)
        })
    }
  }
}

/**
 * The {@link NeoSolvingSubBehaviour} for compass clues.
 * It controls the compass UI and uses an internal process to continuously read the compass state.
 */
export class CompassSolving extends NeoSolvingSubBehaviour {
  readonly settings: CompassSolving.Settings

  spots: {
    spot: TileCoordinates,
    isPossible: boolean,
    marker?: KnownCompassSpot
  }[]

  layer: CompassHandlingLayer
  process: CompassReadService

  private preconfigured_sequence: CompassSolving.TriangulationPreset = null

  // Variables defining the state machine
  entry_selection_index: number = 0
  entries: CompassSolving.Entry[] = []
  selected_spot = observe<TileCoordinates>(null).equality(TileCoordinates.equals)

  private readonly debug_solution: TileCoordinates

  constructor(parent: NeoSolvingBehaviour, public clue: Clues.Compass, public ui: MatchedUI.Compass | null) {
    super(parent)

    this.settings = deps().app.settings.settings.solving.compass

    const preconfigured_id = this.settings.active_triangulation_presets.find(p => p.compass_id == clue.id)?.preset_id

    if (preconfigured_id != null) {
      this.preconfigured_sequence = [
        ...CompassSolving.TriangulationPreset.builtin,
        ...this.settings.custom_triangulation_presets
      ].find(p => p.id == preconfigured_id)
    }

    this.spots = clue.spots.map(s => ({spot: s, isPossible: true}))

    this.debug_solution = clue.spots[lodash.random(0, clue.spots.length)]

    if (ui) {
      this.process = new CompassReadService(this.ui,
        this.settings.calibration_mode,
        this.settings.enable_status_overlay
      )

      this.process.closed.on(() => {
        this.stop()
      })

      this.process.state.subscribe((is_state, was_state) => {

        if (was_state && this.settings.auto_commit_on_angle_change && !is_state.spinning) {
          if (was_state.spinning ||
            angleDifference(is_state.angle, was_state.angle) > CompassSolving.ANGLE_CHANGE_COMMIT_THRESHOLD) {
            this.commit()
          }
        }

        if (is_state) {
          console.log("Setting preview")
          this.entries.forEach(e => e.widget.setPreviewAngle(!is_state.spinning ? is_state.angle : null))
        }
      })
    }
  }

  pausesClueReader(): boolean {
    return this.process && this.process.last_read?.type == "success"
  }

  private entry_container: Widget
  private spot_selection_container: Widget

  renderWidget() {
    this.parent.layer.compass_container.empty()

    const container = this.parent.layer.compass_container

    cls("ctr-neosolving-solution-row")
      .addClass("ctr-neosolving-compass-entries-header")
      .text("Compass Solver [WIP]")
      .appendTo(container)

    this.entry_container = c().appendTo(container)
    this.spot_selection_container = c().appendTo(container)
  }

  private setSelection(i: number) {
    i = lodash.clamp(i, 0, this.entries.length)

    this.entry_selection_index = i

    this.entries.forEach((e, i) => {
      e.widget.setSelected(this.entry_selection_index == i)
    })
  }

  async discard(entry: CompassSolving.Entry) {
    const i = this.entries.indexOf(entry)

    if (i < 0) return

    entry.widget.remove()

    this.entries.splice(i, 1)

    if (this.entry_selection_index >= i) this.setSelection(this.entry_selection_index - 1)

    await this.updatePossibilities(false)
  }

  async commit(entry: CompassSolving.Entry = undefined, is_manual: boolean = false) {
    entry = entry ?? this.entries[this.entry_selection_index]

    if (!entry || !this.entries.some(e => e == entry)) return

    if (!entry?.position) return
    if (entry.angle != null) return

    const angle = this.process.state.value().angle

    const info = Compasses.TriangulationPoint.construct(CompassSolving.Spot.coords(entry.position), angle)

    if (!this.spots.some(s => Compasses.isPossible([info], s.spot))) {
      if (is_manual) notification("Refusing to lock in impossible angle.", "error").show()
      return
    }

    entry.angle = angle
    entry.information = info

    entry.widget.render()

    await this.updatePossibilities(true)
  }

  /**
   * Update possible spots, potentially add a new triangulation entry, activate method for specific spot...
   * @param maybe_fit
   */
  async updatePossibilities(maybe_fit: boolean) {
    this.layer.rendering.lock()

    const information = this.entries.filter(e => e.information).map(e => e.information)

    this.spots.forEach(m => {
      const p = Compasses.isPossible(information, m.spot)

      m.isPossible = p

      if (!p) m.marker?.setPossible(false, null)
    })

    const possible = lodash.sortBy(this.spots.filter(s => s.isPossible), p =>
      Math.max(...information.map(info =>
          angleDifference(Compasses.getExpectedAngle(
            info.modified_origin,
            p.spot
          ), info.angle_radians)
        )
      )
    )

    const method = await this.parent.getAutomaticMethod({clue: this.clue.id, spot: possible[0].spot})

    if (method) {
      this.parent.setMethod(method)
    }

    const add_numbers = possible.length <= 5

    possible.forEach((m, i) => {
      m.marker?.setPossible(true, add_numbers ? i + 1 : null)
    })

    if (add_numbers) {
      const old_selection = this.selected_spot.value()

      // Reference comparison is fine because only the instances from the original array in the clue are handled
      if (!possible.some(e => TileCoordinates.equals(old_selection, e.spot))) {
        this.selected_spot.set(possible[0].spot)
      }
    } else {
      this.selected_spot.set(null)
    }

    if (maybe_fit) {
      if (possible.length > 0 && (information.length > 0 || possible.length < 100)) {
        this.layer.getMap().fitView(TileRectangle.from(...possible.map(s => s.spot)),
          {maxZoom: 2}
        )
      }
    }

    if (this.entries.every(e => e.information) && possible.length > 1) {
      let added = false

      const unused_preconfigured = this.preconfigured_sequence?.sequence?.find(step => !this.entries.some(e => e.preconfigured == step))

      if (unused_preconfigured) {
        const spot = unused_preconfigured.teleport
          ? TransportData.resolveTeleport(unused_preconfigured.teleport)
          : activate(TileArea.init(unused_preconfigured.tile))

        if (spot) {
          this.createEntry({
            position: spot,
            angle: null,
            information: null,
            preconfigured: unused_preconfigured,
          })
          added = true
        }
      }

      if (!added) {
        this.createEntry({
          position: null,
          angle: null,
          information: null,
          preconfigured: unused_preconfigured,
        })
      }

      this.setSelection(this.entries.length - 1)
    }

    this.entry_selection_index = this.entries.findIndex(e => e.information == null)

    if (this.entry_selection_index < 0) this.entry_selection_index = this.entries.length - 1

    /*
    if (possible.length == 1) {
      const m = await deps().app.favourites.getMethod({
        clue: this.solving.clue.id, spot:
        this.known_spot_markers.find(s => s.isPossible()).spot
      })

      if (m) this.solving.parent.path_control.setMethod(m as AugmentedMethod<GenericPathMethod>)
    }*/

    await this.layer.updateOverlay()

    this.layer.rendering.unlock()
  }

  private createEntry(entry: CompassSolving.Entry) {
    const state = this.process.state.value()

    entry.widget = new CompassEntryWidget(entry)
      .setPreviewAngle((!state || state.spinning) ? null : state.angle)
      .appendTo(this.entry_container)


    entry.widget.discard_requested.on(e => {
      this.discard(e.entry)
    })

    entry.widget.commit_requested.on(e => {
      this.commit(e.entry, true)
    })

    entry.widget.selection_requested.on(e => {
      const i = this.entries.indexOf(e.entry)
      if (i < 0) return
      this.setSelection(i)
    })

    this.entries.push(entry)
  }

  async registerSpot(coords: TileArea.ActiveTileArea | TeleportGroup.Spot): Promise<void> {
    const i = this.entry_selection_index

    const entry = this.entries[i]

    if (!entry) return

    entry.position = coords
    entry.angle = null
    entry.information = null
    entry.preconfigured = null

    entry.widget.render()

    const state = this.process.state.value()
    entry.widget.setPreviewAngle(!state || state.spinning ? null : state.angle)

    await this.updatePossibilities(false)
  }

  protected begin() {
    this.layer = new CompassHandlingLayer(this)
    this.parent.layer.add(this.layer)

    this.process.run()

    this.parent.app.main_hotkey.subscribe(0, e => {
      if (e.text) {
        const matched_teleport = findBestMatch(CompassSolving.teleport_hovers, ref => stringSimilarity(e.text, ref.expected), 0.9)

        if (matched_teleport) {
          const tele = TransportData.resolveTeleport(matched_teleport.value.teleport_id)
          if (!tele) return
          this.registerSpot(tele)
        }
      } else {
        this.commit(undefined, true)
      }
    }).bindTo(this.handler_pool)

    this.renderWidget()

    this.updatePossibilities(true)
  }

  protected end() {
    this.layer.remove()

    if (this.process) this.process.stop()
  }
}

export namespace CompassSolving {

  export type Entry = {
    position: TileArea.ActiveTileArea | TeleportGroup.Spot | null,
    angle: number | null,
    information: Compasses.TriangulationPoint | null,
    preconfigured?: CompassSolving.TriangulationPreset["sequence"][number],
    widget?: CompassEntryWidget
  }

  export type Spot = TileArea.ActiveTileArea | TeleportGroup.Spot

  export namespace Spot {
    import activate = TileArea.activate;

    export function coords(spot: Spot): TileArea.ActiveTileArea {
      if (spot instanceof TeleportGroup.Spot) return activate(spot.targetArea())
      else return spot
    }
  }
  export const teleport_hovers: {
    expected: string,
    teleport_id: TeleportGroup.SpotId
  }[] =
    [
      {
        expected: "Cast South Feldip Hills Teleport",
        teleport_id: {group: "normalspellbook", spot: "southfeldiphills"}
      }, {
      expected: "Cast Taverley Teleport",
      teleport_id: {group: "normalspellbook", spot: "taverley"}
    }, {
      expected: "Cast Varrock Teleport",
      teleport_id: {group: "normalspellbook", spot: "varrock"}
    }, {
      expected: "Cast Lumbridge Teleport",
      teleport_id: {group: "normalspellbook", spot: "lumbridge"}
    }, {
      expected: "Cast Falador Teleport",
      teleport_id: {group: "normalspellbook", spot: "falador"}
    }, {
      expected: "Cast Camelot Teleport",
      teleport_id: {group: "normalspellbook", spot: "camelot"}
    }, {
      expected: "Cast Ardougne Teleport",
      teleport_id: {group: "normalspellbook", spot: "ardougne"}
    }, {
      expected: "Cast Watchtower Teleport",
      teleport_id: {group: "normalspellbook", spot: "watchtower-yanille"}
    }, {
      expected: "Cast Trollheim Teleport",
      teleport_id: {group: "normalspellbook", spot: "trollheim"}
    }, {
      expected: "Cast God Wars Dungeon Teleport",
      teleport_id: {group: "normalspellbook", spot: "godwars"}
    }, {
      expected: "Cast Paddewwa Teleport",
      teleport_id: {group: "ancientspellook", spot: "paddewwa"}
    }, {
      expected: "Cast Senntisten Teleport",
      teleport_id: {group: "ancientspellook", spot: "senntisten"}
    }, {
      expected: "Cast Kharyll Teleport",
      teleport_id: {group: "ancientspellook", spot: "kharyll"}
    }, {
      expected: "Cast Lassar Teleport",
      teleport_id: {group: "ancientspellook", spot: "lassar"}
    }, {
      expected: "Cast Dareeyak Teleport",
      teleport_id: {group: "ancientspellook", spot: "dareeyak"}
    }, {
      expected: "Cast Carrallanger Teleport",
      teleport_id: {group: "ancientspellook", spot: "carallaner"}
    }, {
      expected: "Cast Annakarl Teleport",
      teleport_id: {group: "ancientspellook", spot: "annakarl"}
    }, {
      expected: "Cast Ghorrock Teleport",
      teleport_id: {group: "ancientspellook", spot: "ghorrock"}
    },

      {expected: "Cast Moonclan Teleport", teleport_id: {group: "lunarspellbook", spot: "moonclan"}},
      {expected: "Cast Ourania Altar Teleport", teleport_id: {group: "lunarspellbook", spot: "ourania"}},
      {expected: "Cast South Falador Teleport", teleport_id: {group: "lunarspellbook", spot: "southfalador"}},
      {expected: "Cast Waterbirth Teleport", teleport_id: {group: "lunarspellbook", spot: "waterbirth"}},
      {expected: "Cast Barbarian Teleport", teleport_id: {group: "lunarspellbook", spot: "barbarian"}},
      {expected: "Cast North Ardougne Teleport", teleport_id: {group: "lunarspellbook", spot: "northardougne"}},
      {expected: "Cast Khazard Teleport", teleport_id: {group: "lunarspellbook", spot: "khazard"}},
      {expected: "Cast Fishing Guild Teleport", teleport_id: {group: "lunarspellbook", spot: "fishing"}},
      {expected: "Cast Catherby Teleport", teleport_id: {group: "lunarspellbook", spot: "catherby"}},
      {expected: "Cast Ice Plateau Teleport", teleport_id: {group: "lunarspellbook", spot: "iceplateu"}},
      {expected: "Cast Trollheim Farm Teleport", teleport_id: {group: "lunarspellbook", spot: "trollheim"}},

      {expected: "Quick teleport Al Kharid Lodestone", teleport_id: {group: "home", spot: "alkharid"}},
      {expected: "Teleport Al Kharid Lodestone", teleport_id: {group: "home", spot: "alkharid"}},
      {expected: "Quick teleport Anachronia Lodestone", teleport_id: {group: "home", spot: "anachronia"}},
      {expected: "Teleport Anachronia Lodestone", teleport_id: {group: "home", spot: "anachronia"}},
      {expected: "Quick teleport Ardounge Lodestone", teleport_id: {group: "home", spot: "ardougne"}},
      {expected: "Teleport Ardounge Lodestone", teleport_id: {group: "home", spot: "ardougne"}},
      {expected: "Quick teleport Ashdale Lodestone", teleport_id: {group: "home", spot: "ashdale"}},
      {expected: "Teleport Ashdale Lodestone", teleport_id: {group: "home", spot: "ashdale"}},
      {expected: "Quick teleport Bandit Camp Lodestone", teleport_id: {group: "home", spot: "banditcamp"}},
      {expected: "Teleport Bandit Camp Lodestone", teleport_id: {group: "home", spot: "banditcamp"}},
      {expected: "Quick teleport Burthorpe Lodestone", teleport_id: {group: "home", spot: "burthorpe"}},
      {expected: "Teleport Burthorpe Lodestone", teleport_id: {group: "home", spot: "burthorpe"}},
      {expected: "Quick teleport Canifis Lodestone", teleport_id: {group: "home", spot: "canifis"}},
      {expected: "Teleport Canifis Lodestone", teleport_id: {group: "home", spot: "canifis"}},
      {expected: "Quick teleport Catherby Lodestone", teleport_id: {group: "home", spot: "catherby"}},
      {expected: "Teleport Catherby Lodestone", teleport_id: {group: "home", spot: "catherby"}},
      {expected: "Quick teleport Draynor Lodestone", teleport_id: {group: "home", spot: "draynor"}},
      {expected: "Teleport Draynor Lodestone", teleport_id: {group: "home", spot: "draynor"}},
      {expected: "Quick teleport Eagles` Peak Lodestone", teleport_id: {group: "home", spot: "eaglespeak"}},
      {expected: "Teleport Eagles` Peak Lodestone", teleport_id: {group: "home", spot: "eaglespeak"}},
      {expected: "Quick teleport Edgeville Lodestone", teleport_id: {group: "home", spot: "edgeville"}},
      {expected: "Teleport Edgeville Lodestone", teleport_id: {group: "home", spot: "edgeville"}},
      {expected: "Quick teleport Falador Lodestone", teleport_id: {group: "home", spot: "falador"}},
      {expected: "Teleport Falador Lodestone", teleport_id: {group: "home", spot: "falador"}},
      {expected: "Quick teleport Fremmenik Province Lodestone", teleport_id: {group: "home", spot: "fremmenik"}},
      {expected: "Teleport Fremmenik Province Lodestone", teleport_id: {group: "home", spot: "fremmenik"}},
      {expected: "Quick teleport Karamja Lodestone", teleport_id: {group: "home", spot: "karamja"}},
      {expected: "Teleport Karamja Lodestone", teleport_id: {group: "home", spot: "karamja"}},
      {expected: "Quick teleport Lumbridge Lodestone", teleport_id: {group: "home", spot: "lumbridge"}},
      {expected: "Teleport Lumbridge Lodestone", teleport_id: {group: "home", spot: "lumbridge"}},
      {expected: "Quick teleport Lunar Isle Lodestone", teleport_id: {group: "home", spot: "lunarisle"}},
      {expected: "Teleport Lunar Isle Lodestone", teleport_id: {group: "home", spot: "lunarisle"}},
      {expected: "Quick teleport Oo´glog Lodestone", teleport_id: {group: "home", spot: "ooglog"}},
      {expected: "Teleport Oo´glog Lodestone", teleport_id: {group: "home", spot: "ooglog"}},
      {expected: "Quick teleport Port Sarim Lodestone", teleport_id: {group: "home", spot: "portsarim"}},
      {expected: "Teleport Port Sarim Lodestone", teleport_id: {group: "home", spot: "portsarim"}},
      {expected: "Quick teleport Prifddinas Lodestone", teleport_id: {group: "home", spot: "prifddinas"}},
      {expected: "Teleport Prifddinas Lodestone", teleport_id: {group: "home", spot: "prifddinas"}},
      {expected: "Quick teleport Seers´ Village Lodestone", teleport_id: {group: "home", spot: "seersvillage"}},
      {expected: "Teleport Seers´ Village Lodestone", teleport_id: {group: "home", spot: "seersvillage"}},
      {expected: "Quick teleport Taverley Lodestone", teleport_id: {group: "home", spot: "taverley"}},
      {expected: "Teleport Taverley Lodestone", teleport_id: {group: "home", spot: "taverley"}},
      {expected: "Quick teleport Tirannwn Lodestone", teleport_id: {group: "home", spot: "tirannwn"}},
      {expected: "Teleport Tirannwn Lodestone", teleport_id: {group: "home", spot: "tirannwn"}},
      {expected: "Quick teleport Varrock Lodestone", teleport_id: {group: "home", spot: "varrock"}},
      {expected: "Teleport Varrock Lodestone", teleport_id: {group: "home", spot: "varrock"}},
      {expected: "Quick teleport Wilderness Lodestone", teleport_id: {group: "home", spot: "wilderness"}},
      {expected: "Teleport Wilderness Lodestone", teleport_id: {group: "home", spot: "wilderness"}},
      {expected: "Quick teleport Yanille Lodestone", teleport_id: {group: "home", spot: "yanille"}},
      {expected: "Teleport Yanille Lodestone", teleport_id: {group: "home", spot: "yanille"}},
      {expected: "Quick teleport Menaphos Lodestone", teleport_id: {group: "home", spot: "menaphos"}},
      {expected: "Teleport Menaphos Lodestone", teleport_id: {group: "home", spot: "menaphos"}},
      {expected: "Quick teleport Fort Forinthry Lodestone", teleport_id: {group: "home", spot: "fortforinthry"}},
      {expected: "Teleport Fort Forinthry Lodestone", teleport_id: {group: "home", spot: "fortforinthry"}},
      {expected: "Quick teleport City of Um Lodestone", teleport_id: {group: "home", spot: "cityofum"}},
      {expected: "Teleport City of Um Lodestone", teleport_id: {group: "home", spot: "cityofum"}},
    ]

  export const ANGLE_CHANGE_COMMIT_THRESHOLD = degreesToRadians(4)

  export type Settings = {
    auto_commit_on_angle_change: boolean,
    enable_status_overlay: boolean,
    calibration_mode: CompassReader.CalibrationMode,
    active_triangulation_presets: {
      compass_id: number,
      preset_id: number | null
    }[],
    custom_triangulation_presets: TriangulationPreset[],
    manual_tile_inaccuracy: number
  }

  export type TriangulationPreset = {
    id: number,
    compass_id: number,
    name: string,
    sequence: {
      tile?: TileCoordinates,
      teleport?: TeleportGroup.SpotId
    }[]
  }

  export namespace TriangulationPreset {

    export const elite_moonclan_southfeldiphills: TriangulationPreset = {
      compass_id: clue_data.gielinor_compass.id,
      id: -1,
      name: "{{teleport lunarspellbook moonclan}} Moonclan - {{teleport normalspellbook southfeldiphills}} South Feldip Hills",
      sequence: [
        {teleport: {group: "lunarspellbook", spot: "moonclan"}},
        {teleport: {group: "normalspellbook", spot: "southfeldiphills"}},
      ]
    }

    export const elite_moonclan_iceplateu: TriangulationPreset = {
      compass_id: clue_data.gielinor_compass.id,
      id: -2,
      name: "{{teleport lunarspellbook moonclan}} Moonclan - {{teleport lunarspellbook iceplateu}} Ice Plateau",
      sequence: [
        {teleport: {group: "lunarspellbook", spot: "moonclan"}},
        {teleport: {group: "lunarspellbook", spot: "iceplateu"}},
      ]
    }

    export const master_turtle_island: TriangulationPreset = {
      compass_id: clue_data.arc_compass.id,
      id: -3,
      name: "{{teleport arctabs turtleislands}} Turtle Island",
      sequence: [
        {teleport: {group: "arctabs", spot: "turtleislands"}},
      ]
    }

    export const elite_falador: TriangulationPreset = {
      compass_id: clue_data.gielinor_compass.id,
      id: -4,
      name: "{{teleport normalspellbook falador}} Falador",
      sequence: [
        {teleport: {group: "normalspellbook", spot: "falador"}},
      ]
    }

    export const master_turtle_island_dock: TriangulationPreset = {
      compass_id: clue_data.arc_compass.id,
      id: -5,
      name: "{{teleport arcsailing turtleislands}} Ship to Turtle Island",
      sequence: [
        {teleport: {group: "arcsailing", spot: "turtleislands"}},
      ]
    }

    export const master_whales_maw: TriangulationPreset = {
      compass_id: clue_data.arc_compass.id,
      id: -6,
      name: "{{teleport arctabs whalesmaw}} Whale`s Maw",
      sequence: [
        {teleport: {group: "arctabs", spot: "whalesmaw"}},
      ]
    }
    export const builtin: TriangulationPreset[] = [
      elite_moonclan_southfeldiphills,
      elite_moonclan_iceplateu,
      master_turtle_island,
      elite_falador,
      master_turtle_island_dock,
      master_whales_maw
    ]
  }

  export namespace Settings {
    export const DEFAULT: Settings = {
      auto_commit_on_angle_change: true,
      enable_status_overlay: true,
      calibration_mode: "off",
      custom_triangulation_presets: [],
      active_triangulation_presets: [],
      manual_tile_inaccuracy: 3
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return DEFAULT

      if (!isArray(settings.custom_triangulation_presets)) settings.custom_triangulation_presets = []
      if (!isArray(settings.active_triangulation_presets)) settings.active_triangulation_presets = []
      if (![true, false].includes(settings.auto_commit_on_angle_change)) settings.auto_commit_on_angle_change = DEFAULT.auto_commit_on_angle_change
      if (![true, false].includes(settings.enable_status_overlay)) settings.enable_status_overlay = DEFAULT.enable_status_overlay
      if (typeof settings.manual_tile_inaccuracy != "number") settings.manual_tile_inaccuracy = DEFAULT.manual_tile_inaccuracy

      if (!Object.keys(CompassReader.calibration_tables).includes(settings.calibration_mode)) settings.calibration_mode = DEFAULT.calibration_mode

      return settings
    }
  }
}