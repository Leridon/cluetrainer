import {NeoSolvingSubBehaviour} from "../NeoSolvingSubBehaviour";
import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {GameLayer} from "../../../../lib/gamemap/GameLayer";
import {Clues} from "../../../../lib/runescape/clues";
import {GieliCoordinates, TileCoordinates, TileRectangle} from "../../../../lib/runescape/coordinates";
import {GameMapMouseEvent} from "../../../../lib/gamemap/MapEvents";
import {C} from "../../../../lib/ui/constructors";
import * as leaflet from "leaflet"
import {Rectangle, Transform, Vector2} from "../../../../lib/math";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {Compasses} from "../../../../lib/cluetheory/Compasses";
import {TeleportSpotEntity} from "../../map/entities/TeleportSpotEntity";
import lodash, {identity, isArray} from "lodash";
import {CompassReader} from "../cluereader/CompassReader";
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
import {levelIcon} from "../../../../lib/gamemap/GameMap";
import {ClueEntities} from "../ClueEntities";
import {PathStepEntity} from "../../map/entities/PathStepEntity";
import {SettingsModal} from "../../settings/SettingsEdit";
import {Log} from "../../../../lib/util/Log";
import {TextRendering} from "../../TextRendering";
import {Alt1} from "../../../../lib/alt1/Alt1";
import {Angles} from "../../../../lib/math/Angles";
import {ChatReader} from "../../../../lib/alt1/readers/ChatReader";
import {CaptureInterval} from "../../../../lib/alt1/capture";
import {MessageBuffer} from "../../../../lib/alt1/readers/chatreader/ChatBuffer";
import {ClueTrainerWiki} from "../../../wiki";
import span = C.span;
import cls = C.cls;
import TeleportGroup = Transportation.TeleportGroup;
import findBestMatch = util.findBestMatch;
import stringSimilarity = util.stringSimilarity;
import italic = C.italic;
import activate = TileArea.activate;
import notification = Notification.notification;
import DigSolutionEntity = ClueEntities.DigSolutionEntity;
import inlineimg = C.inlineimg;
import count = util.count;
import digSpotArea = Clues.digSpotArea;
import vbox = C.vbox;
import log = Log.log;
import render_digspot = TextRendering.render_digspot;
import UncertainAngle = Angles.UncertainAngle;
import degreesToRadians = Angles.degreesToRadians;

class CompassHandlingLayer extends GameLayer {
  private lines: {
    line: leaflet.Layer
  }[] = []

  constructor(private solving: CompassSolving) {
    super()

    this.solving.spots.forEach((e) =>
      e.marker = new KnownCompassSpot(e)
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
      const from = info.origin

      const off = Vector2.transform(Vector2.scale(2000, Compasses.ANGLE_REFERENCE_VECTOR), Transform.rotationRadians(info.angle_radians.median))

      const to = Vector2.add(from, off)

      const right = Vector2.transform(info.direction, Transform.rotationRadians(Math.PI / 2))

      const corner_near_left = Vector2.add(from, Vector2.scale(info.origin_uncertainty, right))
      const corner_near_right = Vector2.add(from, Vector2.scale(-info.origin_uncertainty, right))


      const corner_far_left = Vector2.add(corner_near_left, Vector2.transform(off, Transform.rotationRadians(info.angle_radians.epsilon)))
      const corner_far_right = Vector2.add(corner_near_right, Vector2.transform(off, Transform.rotationRadians(-info.angle_radians.epsilon)))

      return {
        line:
          leaflet.featureGroup([
            leaflet.polyline([Vector2.toLatLong(from), Vector2.toLatLong(to)], {color: this.solving.settings.beam_color}),
            leaflet.polygon([
              Vector2.toLatLong(corner_near_left),
              Vector2.toLatLong(corner_near_right),
              Vector2.toLatLong(corner_far_right),
              Vector2.toLatLong(corner_far_left),
            ]).setStyle({
              stroke: false,
              fillOpacity: 0.2,
              color: this.solving.settings.beam_color
            })
          ]).addTo(this)
      }
    })
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(() => {

      if (event.active_entity instanceof TeleportSpotEntity) {
        this.solving.registerSpot(event.active_entity.teleport, false)
      } else if (event.active_entity instanceof PathStepEntity && event.active_entity.step.type == "teleport") {
        this.solving.registerSpot(TransportData.resolveTeleport(event.active_entity.step.id), false)
      } else if (event.active_entity instanceof KnownCompassSpot) {
        if (this.solving.entries.some(e => e.information) || !this.solving.reader) {
          this.solving.setSelectedSpot(event.active_entity.spot, true)
        } else {
          this.solving.registerSpot(activate(this.solving.clue.single_tile_target ? TileArea.init(event.active_entity.spot.spot.spot) : digSpotArea(event.active_entity.spot.spot.spot)), true)
        }
      } else {
        this.solving.registerSpot(
          activate(TileArea.fromRect(TileRectangle.lift(
              Rectangle.centeredOn(event.tile(), this.solving.settings.manual_tile_inaccuracy),
              event.tile().level
            ))
          ), false
        )
      }
    })
  }
}

class KnownCompassSpot extends MapEntity {
  constructor(public readonly spot: CompassSolving.SpotData) {
    super()

    this.setTooltip(() => {
      const layout = new Properties()

      layout.header(c().append("Compass spot ", render_digspot(this.spot.spot_id + 1)))

      layout.paragraph("Click to select as solution and view pathing.")

      return layout
    })
  }

  private possible: boolean = true
  private number: number | null = null
  private active: boolean = false

  setPossible(v: boolean, number: number): this {
    if (this.number != number || v != this.possible) {
      this.number = number
      this.possible = v

      this.requestRendering()
    }

    return this
  }

  setActive(v: boolean): this {
    if (v != this.active) {
      this.active = v
      this.requestRendering()
    }

    return this
  }

  bounds(): Rectangle {
    return Rectangle.from(this.spot.spot.spot)
  }

  protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
    const opacity = this.possible ? 1 : 0.5

    const scale = (this.active ? 1 : 0.5) * (props.highlight ? 1.5 : 1)

    const marker = leaflet.marker(Vector2.toLatLong(this.spot.spot.spot), {
      icon: levelIcon(this.spot.spot.spot.level, scale),
      opacity: opacity,
      interactive: true,
      bubblingMouseEvents: true,
    }).addTo(this)

    if (this.number != null) {
      marker.bindTooltip(leaflet.tooltip({
        content: this.number.toString(),
        className: "spot-number-on-map",
        offset: [0, 10],
        permanent: true,
        direction: "center",
        opacity: opacity
      }))
    }


    if (this.active) {
      DigSolutionEntity.areaGraphics(this.spot.spot.spot, this.spot.spot.clue.single_tile_target).addTo(this)
    }

    return marker.getElement()
  }
}

class CompassEntryWidget extends Widget {
  selection_requested = ewent<this>()
  position_discard_requested = ewent<this>()
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

  private _preview_angle: UncertainAngle | null = null

  setPreviewAngle(angle: UncertainAngle | null): this {
    this._preview_angle = angle

    if (this.entry.information == null) {
      if (angle != null) {
        this.angle_container?.text(UncertainAngle.toAngleString(angle))

        this.angle_container?.tooltip(UncertainAngle.toUncertaintyString(angle))
      } else {
        this.angle_container?.text(`???°`)
        this.angle_container?.tooltip(null)
      }
    }

    return this
  }

  private angle_container: Widget = null

  render(): void {
    this.empty()

    const row = this

    {
      const discard_button = cls("ctr-neosolving-compass-entry-button")
        .setInnerHtml("&times;")
        .tooltip("Discard")
        .appendTo(row)
        .on("click", () => {
          this.position_discard_requested.trigger(this)
        })
    }

    {
      const position = cls("ctr-neosolving-compass-entry-position").appendTo(row)

      if (this.entry.position) {
        if (this.entry.position instanceof TeleportGroup.Spot) {
          position.append(
            PathGraphics.Teleport.asSpan(this.entry.position),
            span(this.entry.position.spot.name)
          )

          position.tooltip(TileArea.toString(this.entry.position.targetArea()))
        } else {
          position.append(span(Vector2.toString(this.entry.position.center())))

          position.tooltip(TileArea.toString(this.entry.position.parent))
        }
      } else {
        position.append(italic("No location selected"))
      }
    }

    if (this.entry.position) {
      const isCommited = this.entry.information != null

      const angle = this.angle_container = cls("ctr-compass-solving-angle")
        .toggleClass("committed", isCommited)
        .text(isCommited
          ? UncertainAngle.toAngleString(this.entry.information.angle_radians)
          : (this._preview_angle != null ? UncertainAngle.toAngleString(this._preview_angle) : "???°")
        )
        .appendTo(row)

      if (isCommited) {
        angle.tooltip(UncertainAngle.toUncertaintyString(this.entry.information.angle_radians))
      }

      const angle_button = cls("ctr-neosolving-compass-entry-button")
        .appendTo(row)
        .text(isCommited ? "×" : "✓")
        .tooltip(isCommited ? "Click to discard" : "Click to commit (Alt + 1)")
        .on("click", (e) => {
          e.stopPropagation()

          if (isCommited) {
            this.discard_requested.trigger(this)
          } else {
            this.commit_requested.trigger(this)
          }
        })
    }
  }
}

const DEBUG_ANGLE_OVERRIDE: UncertainAngle = null // degreesToRadians(206.87152474371157)
const DEBUG_LAST_SOLUTION_OVERRIDE: TileArea = null // {origin: {x: 3214, y: 3376, level: 0}}
const DEBUG_LAST_SOLUTION_ANGLE_OVERRIDE: UncertainAngle = undefined // degreesToRadians(112.6)

/**
 * The {@link NeoSolvingSubBehaviour} for compass clues.
 * It controls the compass UI and uses an internal process to continuously read the compass state.
 */
export class CompassSolving extends NeoSolvingSubBehaviour {
  settings: CompassSolving.Settings

  spots: CompassSolving.SpotData[]
  needs_more_info: boolean = true

  layer: CompassHandlingLayer
  process: CompassReader.Service

  // Variables defining the state machine
  entry_selection_index: number = 0
  entries: CompassSolving.Entry[] = []
  selected_spot = observe<CompassSolving.SpotData>(null)

  first_confirmed_state: CompassReader.Service.State = undefined

  constructor(parent: NeoSolvingBehaviour, public clue: Clues.Compass, public reader: CompassReader,
              private spot_selection_callback: (_: TileCoordinates) => Promise<any>
  ) {
    super(parent, "clue")

    this.settings = deps().app.settings.settings.solving.compass

    this.spots = clue.spots.map((s, i) => ({spot: {clue: this.clue, spot: s}, isPossible: true, spot_id: i}))

    this.selected_spot.subscribe((spot, old_spot) => {
      spot?.marker?.setActive(true)
      old_spot?.marker?.setActive(false)

      this.updateMethodPreviews()
    })

    if (reader) {
      this.process = new CompassReader.Service(
        this.reader.capture,
        this.settings.enable_status_overlay ? {
          warn_antialiasing: this.settings.status_overlay_warn_antialiasing
        } : null
      )

      this.process.onChange((is_state, was_state) => {
        if (is_state) this.maybeSetFirstConfirmedState(is_state)

        if (is_state?.state == "closed") {
          this.endClue("Compass Reader reported a closed compass")
        } else {
          if (was_state && this.settings.auto_commit_on_angle_change && is_state.state == "normal") {
            if (was_state.state == "spinning" ||
              was_state.state == "normal" && UncertainAngle.meanDifference(is_state.result.angle, was_state.result.angle) > CompassSolving.ANGLE_CHANGE_COMMIT_THRESHOLD) {
              this.commit()
            }
          }

          this.entries.forEach(e => e.widget.setPreviewAngle(is_state?.state == "normal" ? is_state.result.angle : null))
        }

        if (!was_state && this.latest_unhandled_sextant_position) {
          log().log("Checking backlogged sextant position")
          this.tryToHandleSextantPosition()
        }
      }, h => h.bindTo(this.lifetime_manager))

    }
  }

  /**
   * Sets the first confirmed angle. Commits the angle to a previous-solution entry if applicable
   * @param state The read state
   * @private
   */
  private maybeSetFirstConfirmedState(state: CompassReader.Service.State) {
    if (this.first_confirmed_state != undefined) return

    this.first_confirmed_state = state

    const previous_solution_entry = this.entries.find(e => e.is_solution_of_previous_clue)

    if (previous_solution_entry) {

      if(state.state == "normal") {
        this.commit(previous_solution_entry)
      } else {
        this.discardPosition(previous_solution_entry)
      }

    }
  }

  pausesClueReader(): boolean {
    return this.process && this.process.last_read?.type == "success"
  }

  private entry_container: Widget
  private spot_selection_container: Widget

  renderWidget() {
    this.parent.layer.compass_container.empty()

    const container = vbox().appendTo(this.parent.layer.compass_container)

    cls("ctr-neosolving-compass-solving-header")
      .append(
        inlineimg("/assets/icons/arrow.png").tooltip("Compass Solver"),
        "Compass Solver",
        C.spacer(),
        inlineimg("/assets/icons/reset_nis.png").addClass("ctr-clickable").css("height", "1em").css("margin-top", "2px")
          .on("click", async e => {
            this.reset(true, e.shiftKey)
          })
          .tooltip("Reset compass solver. Hold Shift for a hard reset."),
        inlineimg("/assets/icons/info_nis.png").css("height", "1em").css("margin-top", "2px").addClass("ctr-clickable")
          .on("click", () => ClueTrainerWiki.openOnPage("compasssolver"))
          .tooltip("Learn more about the compass solver."),
        inlineimg("/assets/icons/settings.png").addClass("ctr-clickable").css("height", "1em").css("margin-top", "2px")
          .on("click", async () => {
            const result = await SettingsModal.openOnPage("compass")

            if (result.saved) this.settings = result.value.solving.compass
          }),
      )
      .appendTo(container)

    inlineimg("/assets/icons/settings.png").addClass("ctr-clickable").css("height", "1em").css("margin-top", "2px")
      .on("click", async () => {
        await SettingsModal.openOnPage("scans")
      }),

      this.entry_container = c().css("flex-basis", "100%").appendTo(container)
    //this.spot_selection_container = c().appendTo(container)
  }

  private setSelection(i: number) {
    i = lodash.clamp(i, 0, this.entries.length - 1)

    this.entry_selection_index = i

    this.entries.forEach((e, i) => {
      e.widget.setSelected(this.entry_selection_index == i)
    })
  }

  private deleteEntry(entry: CompassSolving.Entry) {
    const index = this.entries.indexOf(entry)

    if (index >= 0) {
      Log.log().log(`Deleting triangulation spot ${index}.`, "Compass Solving")

      this.entries.splice(index, 1)

      entry.widget?.remove()

      if (this.entries.length > 0 && this.entry_selection_index > index) {
        this.setSelection(this.entry_selection_index - 1)
      } else if (index == this.entry_selection_index) {
        this.setSelection(this.entry_selection_index) // Update selection index to the same value as before to force interface update
      }
    }
  }

  async discardPosition(entry: CompassSolving.Entry) {
    const index = this.entries.indexOf(entry)

    if (index >= 0) {
      if (entry.is_solution_of_previous_clue) {
        this.deleteEntry(entry)
      } else if (!entry.position) {
        if (count(this.entries, e => !e.information) > 1) this.deleteEntry(entry)
        else this.setSelection(index)
      } else {
        entry.information = null
        entry.position = null
        entry.preconfigured = null

        this.setSelection(index)

        entry?.widget?.render()
      }

      if (count(this.entries, e => !e.position) > 1) {
        this.deleteEntry(entry)
      }

      await this.updatePossibilities(false)

      if (!this.entries.some(e => !e.information) && count(this.spots, e => e.isPossible) > 1) {
        this.createEntry({
          position: null,
          information: null,
          preconfigured: null,
        })
      }
    }
  }

  async discardAngle(entry: CompassSolving.Entry) {
    const index = this.entries.indexOf(entry)

    Log.log().log(`Discarding angle of triangulation spot ${index}`, "Compass Solving")

    if (index >= 0) {
      const state = this.process.state()

      entry.information = null
      entry.widget.render()
      entry.widget.setPreviewAngle(
        state.state == "normal"
          ? state.result.angle
          : undefined
      )

      await this.updatePossibilities(false)

      // Select this entry
      this.setSelection(index)
    }
  }

  async commit(entry: CompassSolving.Entry = undefined, is_manual: boolean = false): Promise<boolean> {
    entry = entry ?? this.entries[this.entry_selection_index]

    if (!entry || !this.entries.includes(entry)) return false

    if (!entry?.position) return false
    if (entry.information != null) return false

    const angle: UncertainAngle = ((): UncertainAngle => {
      if (DEBUG_ANGLE_OVERRIDE != null) return DEBUG_ANGLE_OVERRIDE

      if (entry.is_solution_of_previous_clue) {
        if (DEBUG_LAST_SOLUTION_ANGLE_OVERRIDE != undefined) {
          return DEBUG_LAST_SOLUTION_ANGLE_OVERRIDE
        } else if (this.first_confirmed_state?.state == "normal") {
          return this.first_confirmed_state.result.angle
        } else {
          return undefined
        }
      } else {
        const state = this.process.state()

        if (state.state != "normal") return undefined

        return state.result.angle
      }
    })()

    if (angle == undefined) {
      if (is_manual) notification("Cannot commit undefined angle.", "error").show()

      return false
    }

    const info = Compasses.TriangulationPoint.construct(CompassSolving.Spot.coords(entry.position), angle)

    if (!this.spots.some(s => Compasses.isPossible([info], s.spot.spot))) {
      if (is_manual) notification("Refusing to lock in impossible angle.", "error").show()

      log().log(`Cowardly refusing to lock in impossible angle ${UncertainAngle.toString(info.angle_radians, 3)} from ${TileArea.toString(info.position.parent)}`, "Compass Solving")

      return false
    }

    log().log(`Committing ${UncertainAngle.toString(info.angle_radians)} to entry ${this.entries.indexOf(entry)} (${info.modified_origin.x} | ${info.modified_origin.y})`, "Compass Solving")

    entry.information = info

    entry.widget.render()

    await this.updatePossibilities(true)

    if (this.needs_more_info) {
      // Advance selection index to next uncommitted entry, with wrap around
      const current_index = this.entries.indexOf(entry)
      let index_of_next_free_entry = (current_index + 1) % this.entries.length

      // Abort when wrapping index reached the current index
      while (index_of_next_free_entry != current_index) {
        const entry = this.entries[index_of_next_free_entry]

        if (!entry.information && !entry.is_hidden) {
          if (!entry.position || !this.settings.skip_triangulation_point_if_colinear) break

          const spot = CompassSolving.Spot.coords(entry.position)

          const colinear_index = this.entries.findIndex(e => {
            if (!e.information) return false

            const angle = Compasses.getExpectedAngle(
              e.information.origin,
              spot.center(),
            )

            const COLINEARITY_THRESHOLD = degreesToRadians(1.5)

            return Math.min(
              Angles.angleDifference(angle, e.information.angle_radians.median),
              Angles.angleDifference(Angles.normalizeAngle(angle + Math.PI), e.information.angle_radians.median),
            ) < COLINEARITY_THRESHOLD
          })

          const colinear_to_any = colinear_index >= 0

          if (!colinear_to_any) break
          else {
            Log.log().log(`Skipping triangulation entry ${index_of_next_free_entry} because it's colinear to ${colinear_index}`, "Compass Solving")
          }
        }

        index_of_next_free_entry = (index_of_next_free_entry + 1) % this.entries.length // Increment, with wrap around
      }

      if (index_of_next_free_entry == current_index) {
        this.createEntry({
          position: null,
          information: null,
          preconfigured: null,
        })
      } else {
        Log.log().log(`Advancing selection to ${index_of_next_free_entry} from ${this.entry_selection_index}`, "Compass Solving")

        this.setSelection(index_of_next_free_entry)
      }
    }

    return true
  }

  private async updateMethodPreviews() {
    // Render previews of methods for all candidate spots that aren't the currently selected one
    if (this.settings.show_method_preview_of_secondary_solutions) {
      const selected = this.selected_spot.value()

      const show_previews = count(this.spots, s => s.isPossible) <= 5

      for (let spot of this.spots) {
        if (show_previews && spot.isPossible && !spot.path && spot != selected) {
          const m = await this.parent.getAutomaticMethod({clue: this.clue.id, spot: spot.spot.spot})

          if (m?.method?.type != "general_path") continue

          spot.path = PathStepEntity.renderPath(m.method.main_path).eachEntity(e => e.setOpacity(0.5)).addTo(this.layer)
        } else if ((!show_previews || !spot.isPossible || spot == selected) && spot.path) {
          spot.path.remove()
          spot.path = null
        }
      }
    }
  }

  /**
   * Sets the highlighted spot. For the highlighted spot, a path method is shown.
   * @param spot The spot to set as active
   * @param set_as_solution If true, the 3 by 3 dig area for this spot is saved as the current clue's solution.
   */
  async setSelectedSpot(spot: CompassSolving.SpotData, set_as_solution: boolean) {
    this.selected_spot.set(spot)

    await this.spot_selection_callback(spot?.spot?.spot)

    if (set_as_solution) {
      this.registerSolution(this.clue.single_tile_target ? TileArea.fromTiles([spot.spot.spot]) : digSpotArea(spot.spot.spot))
    }
  }

  /**
   * Update possible spots, potentially add a new triangulation entry, activate method for specific spot...
   * @param maybe_fit If true, the map is zoomed/moved to the remaining candidate spots if it has been narrowed down enough.
   */
  async updatePossibilities(maybe_fit: boolean) {

    const FEW_CANDIDATES_THRESHOLD = 5

    this.layer.rendering.lock()

    const information = this.entries.filter(e => e.information).map(e => e.information)

    // Update all spots to see if they are still a possible candidate
    this.spots.forEach(m => {
      const p = Compasses.isPossible(information, m.spot.spot)

      m.isPossible = p

      if (!p) m.marker?.setPossible(false, null)
    })

    // Get a list of possible spots, sorted ascendingly by how far they are away from the angle lines. possible[0] is the closest.
    const possible = lodash.sortBy(this.spots.filter(s => s.isPossible), p =>
      Math.max(...information.map(info =>
          UncertainAngle.meanDifference(UncertainAngle.fromAngle(Compasses.getExpectedAngle(
            info.modified_origin,
            p.spot.spot
          )), info.angle_radians)
        )
      )
    )

    const only_few_candidates_remain = possible.length <= FEW_CANDIDATES_THRESHOLD

    // Actually update rendering of the markers to reflect whether they are still possible and potentially add numbers
    possible.forEach((m, i) => {
      //m.marker?.setPossible(true, only_few_candidates_remain ? i + 1 : null)
      m.marker?.setPossible(true, null)
    })

    // Update the selected solution spot if necessary
    if (possible.length == 1) {
      const old_selection = this.selected_spot.value()

      if (!possible.some(e => TileCoordinates.equals(old_selection?.spot?.spot, e.spot.spot))) {
        await this.setSelectedSpot(possible[0], false)
      }
    } else {
      await this.setSelectedSpot(null, false)
    }

    if (possible.length > 0 && possible.length <= 5) {
      let area = TileRectangle.from(...possible.map(s => s.spot.spot))

      if (!this.clue.single_tile_target) area = TileRectangle.extend(area, 1)

      this.registerSolution(TileArea.fromRect(area))
    }

    // Selected spot and possibilities have been updated, update the preview rendering of methods for spots that are possible but not the most likely.
    await this.updateMethodPreviews()

    // Fit camera view to only the remaining possible spots
    if (maybe_fit) {
      if (!this.parent.active_method && (information.length > 0 || possible.length < 50)
        && (possible.length > 1 || (possible.length == 1 && !this.parent.active_method))) {
        this.parent.layer.fit(TileRectangle.from(...possible.map(s => s.spot.spot)), "setting")
      }
    }

    this.needs_more_info = possible.length > 1

    // Update visibility of widgets
    this.entries.forEach(e => {
      e.is_hidden = !(!!e.information || this.needs_more_info)
      e.widget.setVisible(!e.is_hidden)
    })

    await this.layer.updateOverlay()

    this.layer.rendering.unlock()
  }

  private createEntry(entry: CompassSolving.Entry, dont_update_selection: boolean = false): CompassSolving.Entry {
    const state = this.process.state()

    entry.widget = new CompassEntryWidget(entry)
      .setPreviewAngle((!state || state.state != "normal") ? null : state.result.angle)
      .appendTo(this.entry_container)


    entry.widget.position_discard_requested.on(e => {
      this.discardPosition(e.entry)
    })

    entry.widget.commit_requested.on(e => {
      this.commit(e.entry, true)
    })

    entry.widget.discard_requested.on(e => {
      this.discardAngle(e.entry)
    })

    entry.widget.selection_requested.on(e => {
      const i = this.entries.indexOf(e.entry)
      if (i < 0) return
      this.setSelection(i)
    })

    this.entries.push(entry)

    if (!dont_update_selection) {
      this.setSelection(this.entries.length - 1)
    }

    if (entry.information) {
      this.updatePossibilities(false)
    }

    return entry
  }

  private latest_unhandled_sextant_position: {
    trigger_message: MessageBuffer.Message,
    position: TileCoordinates,
  } = null

  async registerSpot(coords: TileArea.ActiveTileArea | TeleportGroup.Spot, is_compass_solution: boolean): Promise<CompassSolving.Entry> {
    const entry = this.entries.find((entry, i) => {
      if (i < this.entry_selection_index) return false
      if (entry.preconfigured && entry.information == null) return false
      if (i != this.entry_selection_index && entry.information != null) return false

      return true
    }) ?? this.createEntry({
      position: null,
      information: null,
      preconfigured: null,
    })

    const hadInfo = entry.information

    entry.position = coords
    entry.information = null
    entry.preconfigured = null

    if (!is_compass_solution) entry.is_solution_of_previous_clue = undefined

    this.setSelection(this.entries.indexOf(entry))

    entry.widget.render()

    const state = this.process.state()
    entry.widget.setPreviewAngle(state?.state != "normal" ? null : state.result.angle)

    if (hadInfo) {
      if (entry.is_solution_of_previous_clue && is_compass_solution) {
        this.commit(entry)
      } else {
        await this.updatePossibilities(false)
      }
    }

    return entry
  }

  /**
   * Resets triangulation to a state as if the compass solver has just been started.
   *
   * @private
   */
  private async reset(only_use_previous_solution_if_existed_previously: boolean = false, hard_reset: boolean = false) {
    this.settings = deps().app.settings.settings.solving.compass

    this.entries.forEach(e => e.widget?.remove())

    const had_previous_solution = this.entries.some(e => e.is_solution_of_previous_clue)

    this.entries = []

    if (!hard_reset && this.settings.use_previous_solution_as_start && (had_previous_solution || !only_use_previous_solution_if_existed_previously)) {
      (() => {
        const assumed_position_from_previous_clue = DEBUG_LAST_SOLUTION_OVERRIDE ?? this.parent.getAssumedPlayerPositionByLastClueSolution()

        if (!assumed_position_from_previous_clue) return

        const size = activate(assumed_position_from_previous_clue).size

        const COMPASS_PREVIOUS_AREA_MAX_SIZE = 256

        // Only use positions that are reasonably small
        if (Vector2.max_axis(size) > COMPASS_PREVIOUS_AREA_MAX_SIZE) {
          Log.log().log(`Not using previous solution because solution area is too large (${size.x} x ${size.y})`, "Compass Solving")

          return
        }

        if (!Rectangle.containsRect(this.clue.valid_area, TileArea.toRect(assumed_position_from_previous_clue))) {
          Log.log().log(`Not using previous solution because it is outside of the viable area`, "Compass Solving")

          return
        }

        Log.log().log(`Loaded previous solution as first triangulation spot`, "Compass Solving")

        this.createEntry({
          position: TileArea.activate(assumed_position_from_previous_clue),
          information: null,
          is_solution_of_previous_clue: true,
        }, true)
      })()
    }

    const previous_solution_used = !!this.entries[0]?.is_solution_of_previous_clue

    const preconfigured_id = this.settings.active_triangulation_presets.find(p => p.compass_id == this.clue.id)?.preset_id

    const preconfigured_sequence = [
      ...CompassSolving.TriangulationPreset.builtin,
      ...this.settings.custom_triangulation_presets
    ].find(p => p.id == preconfigured_id)

    if (preconfigured_sequence) {
      const sequence =
        (previous_solution_used && this.settings.invert_preset_sequence_if_previous_solution_was_used)
          ? [...preconfigured_sequence.sequence].reverse()
          : preconfigured_sequence.sequence

      sequence.forEach(e => {
        const spot = e.teleport
          ? TransportData.resolveTeleport(e.teleport)
          : activate(TileArea.init(e.tile))

        this.createEntry({
          position: spot,
          information: null,
          preconfigured: e,
        }, true)
      })
    }

    if (this.entries.length == 0) {
      this.createEntry({
        position: null,
        information: null,
        preconfigured: null,
      })
    }

    this.setSelection(0)

    if (previous_solution_used) {
      await this.commit(this.entries[0])
    } else {
      this.setSelection(this.entries.findIndex(e => !e.information))

      this.updatePossibilities(true)
    }
  }

  private async tryToHandleSextantPosition() {
    if (!this.latest_unhandled_sextant_position) return

    const reader_state = this.process.state()

    if (!reader_state) return

    if (reader_state.state != "normal") {
      log().log("Discarding sextant because no valid angle is available.")

      this.latest_unhandled_sextant_position = null

      return
    }

    const entry = await this.registerSpot(TileArea.activate(TileArea.init(this.latest_unhandled_sextant_position.position)), false)

    await this.commit(entry, true)

    this.latest_unhandled_sextant_position = null
  }

  protected async begin() {
    this.layer = new CompassHandlingLayer(this)
    this.parent.layer.add(this.layer)

    if (this.reader) {
      this.process?.start()

      Alt1.instance().main_hotkey.subscribe(0, e => {
        if (e.text) {
          const matched_teleport = CompassSolving.teleport_hovers.findBest(e.text)

          if (matched_teleport) {
            const tele = TransportData.resolveTeleport(matched_teleport)
            if (!tele) return
            this.registerSpot(tele, false)
          }
        } else {
          this.commit(undefined, true)
        }
      }).bindTo(this.lifetime_manager)

      this.renderWidget()

      await this.reset()

      if (Alt1.exists()) {
        this.lifetime_manager.bind(
          ChatReader.instance().subscribe({
            options: () => ({
              interval: CaptureInterval.fromApproximateInterval(300), paused: () => {
                console.log(this.needs_more_info)
                return !this.needs_more_info
              }
            })
          })
        )

        if (this.settings.read_chat_for_sextant_message) {
          ChatReader.instance().new_message_bulk.on(async e => {
            log().log(`Got ${e.length} new messages`, "Sextant Reading", e)

            const trigger_message = lodash.maxBy(e.filter(m => m.text.includes("The sextant displays")), m => m.timestamp)

            if (!trigger_message) {
              return
            }

            if (!trigger_message || (Date.now() - trigger_message.timestamp) > 3000) {
              return
            }

            const rest = e.filter(m => m.timestamp == trigger_message.timestamp)

            const latitude_message = rest.map(m => m.text.match(/^(\d\d) degrees, (\d\d) minutes (north|south)/)).find(identity)
            const longitude_message = rest.map(m => m.text.match(/^(\d\d) degrees, (\d\d) minutes (east|west)/)).find(identity)

            if (!longitude_message || !latitude_message) {
              return
            }

            const coords: GieliCoordinates = {
              longitude: {
                degrees: Number(longitude_message[1]),
                minutes: Number(longitude_message[2]),
                direction: longitude_message[3] as "east" | "west"
              }, latitude: {
                degrees: Number(latitude_message[1]),
                minutes: Number(latitude_message[2]),
                direction: latitude_message[3] as "north" | "south"
              }
            }

            if (!this.latest_unhandled_sextant_position || trigger_message.timestamp > this.latest_unhandled_sextant_position.trigger_message.timestamp) {
              this.latest_unhandled_sextant_position = {
                trigger_message: trigger_message,
                position: GieliCoordinates.toCoords(coords)
              }

              log().log(GieliCoordinates.toString(coords))

              this.tryToHandleSextantPosition()
            }

          }).bindTo(this.lifetime_manager)
        }
      }
    }
  }

  protected end() {
    this.layer.remove()

    if (this.process) this.process.stop()
  }
}

export namespace CompassSolving {
  import ClueSpot = Clues.ClueSpot;

  export type SpotData = {
    spot: ClueSpot<Clues.Compass>,
    spot_id: number,
    isPossible: boolean,
    marker?: KnownCompassSpot,
    path?: GameLayer
  }

  export type Entry = {
    position: TileArea.ActiveTileArea | TeleportGroup.Spot | null,
    information: Compasses.TriangulationPoint | null,
    preconfigured?: CompassSolving.TriangulationPreset["sequence"][number],
    is_solution_of_previous_clue?: boolean,
    is_hidden?: boolean,
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


  export namespace teleport_hovers {
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
      },
        {expected: "Cast Varrock Teleport", teleport_id: {group: "normalspellbook", spot: "varrock"}},
        {expected: "Cast Lumbridge Teleport", teleport_id: {group: "normalspellbook", spot: "lumbridge"}},
        {expected: "Cast North-western Anachronia Teleport", teleport_id: {group: "normalspellbook", spot: "northwesternanachronia"}},
        {expected: "Cast Eastern Anachronia Teleport", teleport_id: {group: "normalspellbook", spot: "easternanachronia"}},
        {expected: "Cast Northern Lost Grove Teleport", teleport_id: {group: "normalspellbook", spot: "northlostgrove"}},

        {
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

        {expected: "Cast Kandarin monastery Teleport", teleport_id: {group: "greenteleport", spot: "monastery"}},
        {expected: "Cast Manor farm Teleport", teleport_id: {group: "greenteleport", spot: "manorfarm"}},
        {expected: "Cast Skeletal horror Teleport", teleport_id: {group: "greenteleport", spot: "skelettalhorror"}},

        {expected: "Cast Moonclan Teleport", teleport_id: {group: "lunarspellbook", spot: "moonclan"}},
        {expected: "Cast Ourania Teleport", teleport_id: {group: "lunarspellbook", spot: "ourania"}},
        {expected: "Cast South Falador Teleport", teleport_id: {group: "lunarspellbook", spot: "southfalador"}},
        {expected: "Cast Waterbirth Teleport", teleport_id: {group: "lunarspellbook", spot: "waterbirth"}},
        {expected: "Cast Barbarian Teleport", teleport_id: {group: "lunarspellbook", spot: "barbarian"}},
        {expected: "Cast North Ardougne Teleport", teleport_id: {group: "lunarspellbook", spot: "northardougne"}},
        {expected: "Cast Khazard Teleport", teleport_id: {group: "lunarspellbook", spot: "khazard"}},
        {expected: "Cast Western Kharazi Jungle Teleport", teleport_id: {group: "lunarspellbook", spot: "westernkharazi"}},
        {expected: "Cast Mountain Camp Teleport", teleport_id: {group: "lunarspellbook", spot: "mountaincamp"}},
        {expected: "Cast Fishing Guild Teleport", teleport_id: {group: "lunarspellbook", spot: "fishing"}},
        {expected: "Cast Catherby Teleport", teleport_id: {group: "lunarspellbook", spot: "catherby"}},
        {expected: "Cast Ice Plateau Teleport", teleport_id: {group: "lunarspellbook", spot: "iceplateu"}},
        {expected: "Cast Trollheim Farm Teleport", teleport_id: {group: "lunarspellbook", spot: "trollheim"}},

        // Lodestone Network Map
        {expected: "Quick teleport Al Kharid", teleport_id: {group: "home", spot: "alkharid"}},
        {expected: "Teleport Al Kharid", teleport_id: {group: "home", spot: "alkharid"}},
        {expected: "Quick teleport Anachronia", teleport_id: {group: "home", spot: "anachronia"}},
        {expected: "Teleport Anachronia", teleport_id: {group: "home", spot: "anachronia"}},
        {expected: "Quick teleport Ardougne", teleport_id: {group: "home", spot: "ardougne"}},
        {expected: "Teleport Ardougne", teleport_id: {group: "home", spot: "ardougne"}},
        {expected: "Quick teleport Ashdale", teleport_id: {group: "home", spot: "ashdale"}},
        {expected: "Teleport Ashdale", teleport_id: {group: "home", spot: "ashdale"}},
        {expected: "Quick teleport Bandit Camp", teleport_id: {group: "home", spot: "banditcamp"}},
        {expected: "Teleport Bandit Camp", teleport_id: {group: "home", spot: "banditcamp"}},
        {expected: "Quick teleport Burthorpe", teleport_id: {group: "home", spot: "burthorpe"}},
        {expected: "Teleport Burthorpe", teleport_id: {group: "home", spot: "burthorpe"}},
        {expected: "Quick teleport Canifis", teleport_id: {group: "home", spot: "canifis"}},
        {expected: "Teleport Canifis", teleport_id: {group: "home", spot: "canifis"}},
        {expected: "Quick teleport Catherby", teleport_id: {group: "home", spot: "catherby"}},
        {expected: "Teleport Catherby", teleport_id: {group: "home", spot: "catherby"}},
        {expected: "Quick teleport Draynor Village", teleport_id: {group: "home", spot: "draynor"}},
        {expected: "Teleport Draynor Village", teleport_id: {group: "home", spot: "draynor"}},
        {expected: "Quick teleport Eagles' Peak", teleport_id: {group: "home", spot: "eaglespeak"}},
        {expected: "Teleport Eagles' Peak", teleport_id: {group: "home", spot: "eaglespeak"}},
        {expected: "Quick teleport Edgeville", teleport_id: {group: "home", spot: "edgeville"}},
        {expected: "Teleport Edgeville", teleport_id: {group: "home", spot: "edgeville"}},
        {expected: "Quick teleport Falador", teleport_id: {group: "home", spot: "falador"}},
        {expected: "Teleport Falador", teleport_id: {group: "home", spot: "falador"}},
        {expected: "Quick teleport Fremennik Province", teleport_id: {group: "home", spot: "fremmenik"}},
        {expected: "Teleport Fremennik Province", teleport_id: {group: "home", spot: "fremmenik"}},
        {expected: "Quick teleport Karamja", teleport_id: {group: "home", spot: "karamja"}},
        {expected: "Teleport Karamja", teleport_id: {group: "home", spot: "karamja"}},
        {expected: "Quick teleport Lumbridge", teleport_id: {group: "home", spot: "lumbridge"}},
        {expected: "Teleport Lumbridge", teleport_id: {group: "home", spot: "lumbridge"}},
        {expected: "Quick teleport Lunar Isle", teleport_id: {group: "home", spot: "lunarisle"}},
        {expected: "Teleport Lunar Isle", teleport_id: {group: "home", spot: "lunarisle"}},
        {expected: "Quick teleport Oo'glog", teleport_id: {group: "home", spot: "ooglog"}},
        {expected: "Teleport Oo'glog", teleport_id: {group: "home", spot: "ooglog"}},
        {expected: "Quick teleport Port Sarim", teleport_id: {group: "home", spot: "portsarim"}},
        {expected: "Teleport Port Sarim", teleport_id: {group: "home", spot: "portsarim"}},
        {expected: "Quick teleport Prifddinas", teleport_id: {group: "home", spot: "prifddinas"}},
        {expected: "Teleport Prifddinas", teleport_id: {group: "home", spot: "prifddinas"}},
        {expected: "Quick teleport Seers' Village", teleport_id: {group: "home", spot: "seersvillage"}},
        {expected: "Teleport Seers' Village", teleport_id: {group: "home", spot: "seersvillage"}},
        {expected: "Quick teleport Taverley", teleport_id: {group: "home", spot: "taverley"}},
        {expected: "Teleport Taverley", teleport_id: {group: "home", spot: "taverley"}},
        {expected: "Quick teleport Tirannwn", teleport_id: {group: "home", spot: "tirannwn"}},
        {expected: "Teleport Tirannwn", teleport_id: {group: "home", spot: "tirannwn"}},
        {expected: "Quick teleport Varrock", teleport_id: {group: "home", spot: "varrock"}},
        {expected: "Teleport Varrock", teleport_id: {group: "home", spot: "varrock"}},
        {expected: "Quick teleport Wilderness Crater", teleport_id: {group: "home", spot: "wilderness"}},
        {expected: "Teleport Wilderness Crater", teleport_id: {group: "home", spot: "wilderness"}},
        {expected: "Quick teleport Yanille", teleport_id: {group: "home", spot: "yanille"}},
        {expected: "Teleport Yanille", teleport_id: {group: "home", spot: "yanille"}},
        {expected: "Quick teleport Menaphos", teleport_id: {group: "home", spot: "menaphos"}},
        {expected: "Teleport Menaphos", teleport_id: {group: "home", spot: "menaphos"}},
        {expected: "Quick teleport Fort Forinthry", teleport_id: {group: "home", spot: "fortforinthry"}},
        {expected: "Teleport Fort Forinthry", teleport_id: {group: "home", spot: "fortforinthry"}},
        {expected: "Quick teleport City of Um", teleport_id: {group: "home", spot: "cityofum"}},
        {expected: "Teleport City of Um", teleport_id: {group: "home", spot: "cityofum"}},

        //Spellbook Lodestones
        {expected: "Quick teleport Al Kharid Lodestone", teleport_id: {group: "home", spot: "alkharid"}},
        {expected: "Teleport Al Kharid Lodestone", teleport_id: {group: "home", spot: "alkharid"}},
        {expected: "Quick teleport Anachronia Lodestone", teleport_id: {group: "home", spot: "anachronia"}},
        {expected: "Teleport Anachronia Lodestone", teleport_id: {group: "home", spot: "anachronia"}},
        {expected: "Quick teleport Ardougne Lodestone", teleport_id: {group: "home", spot: "ardougne"}},
        {expected: "Teleport Ardougne Lodestone", teleport_id: {group: "home", spot: "ardougne"}},
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
        {expected: "Quick teleport Eagles' Peak Lodestone", teleport_id: {group: "home", spot: "eaglespeak"}},
        {expected: "Teleport Eagles' Peak Lodestone", teleport_id: {group: "home", spot: "eaglespeak"}},
        {expected: "Quick teleport Edgeville Lodestone", teleport_id: {group: "home", spot: "edgeville"}},
        {expected: "Teleport Edgeville Lodestone", teleport_id: {group: "home", spot: "edgeville"}},
        {expected: "Quick teleport Falador Lodestone", teleport_id: {group: "home", spot: "falador"}},
        {expected: "Teleport Falador Lodestone", teleport_id: {group: "home", spot: "falador"}},
        {expected: "Quick teleport Fremennik Lodestone", teleport_id: {group: "home", spot: "fremmenik"}},
        {expected: "Teleport Fremennik Lodestone", teleport_id: {group: "home", spot: "fremmenik"}},
        {expected: "Quick teleport Karamja Lodestone", teleport_id: {group: "home", spot: "karamja"}},
        {expected: "Teleport Karamja Lodestone", teleport_id: {group: "home", spot: "karamja"}},
        {expected: "Quick teleport Lumbridge Lodestone", teleport_id: {group: "home", spot: "lumbridge"}},
        {expected: "Teleport Lumbridge Lodestone", teleport_id: {group: "home", spot: "lumbridge"}},
        {expected: "Quick teleport Lunar Isle Lodestone", teleport_id: {group: "home", spot: "lunarisle"}},
        {expected: "Teleport Lunar Isle Lodestone", teleport_id: {group: "home", spot: "lunarisle"}},
        {expected: "Quick teleport Oo'glog Lodestone", teleport_id: {group: "home", spot: "ooglog"}},
        {expected: "Teleport Oo'glog Lodestone", teleport_id: {group: "home", spot: "ooglog"}},
        {expected: "Quick teleport Port Sarim Lodestone", teleport_id: {group: "home", spot: "portsarim"}},
        {expected: "Teleport Port Sarim Lodestone", teleport_id: {group: "home", spot: "portsarim"}},
        {expected: "Quick teleport Prifddinas Lodestone", teleport_id: {group: "home", spot: "prifddinas"}},
        {expected: "Teleport Prifddinas Lodestone", teleport_id: {group: "home", spot: "prifddinas"}},
        {expected: "Quick teleport Seers' Village Lodestone", teleport_id: {group: "home", spot: "seersvillage"}},
        {expected: "Teleport Seers' Village Lodestone", teleport_id: {group: "home", spot: "seersvillage"}},
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

        // Last used lodestone
        {expected: "Al Kharid lodestone", teleport_id: {group: "home", spot: "alkharid"}},
        {expected: "Anachronia lodestone", teleport_id: {group: "home", spot: "anachronia"}},
        {expected: "Ardougne lodestone", teleport_id: {group: "home", spot: "ardougne"}},
        {expected: "Ashdale lodestone", teleport_id: {group: "home", spot: "ashdale"}},
        {expected: "Bandit Camp lodestone", teleport_id: {group: "home", spot: "banditcamp"}},
        {expected: "Burthorpe lodestone", teleport_id: {group: "home", spot: "burthorpe"}},
        {expected: "Canifis lodestone", teleport_id: {group: "home", spot: "canifis"}},
        {expected: "Catherby lodestone", teleport_id: {group: "home", spot: "catherby"}},
        {expected: "Draynor lodestone", teleport_id: {group: "home", spot: "draynor"}},
        {expected: "Eagles' Peak lodestone", teleport_id: {group: "home", spot: "eaglespeak"}},
        {expected: "Edgeville lodestone", teleport_id: {group: "home", spot: "edgeville"}},
        {expected: "Falador lodestone", teleport_id: {group: "home", spot: "falador"}},
        {expected: "Fremennik Province lodestone", teleport_id: {group: "home", spot: "fremmenik"}},
        {expected: "Karamja lodestone", teleport_id: {group: "home", spot: "karamja"}},
        {expected: "Lumbridge lodestone", teleport_id: {group: "home", spot: "lumbridge"}},
        {expected: "Lunar Isle lodestone", teleport_id: {group: "home", spot: "lunarisle"}},
        {expected: "Oo'glog lodestone", teleport_id: {group: "home", spot: "ooglog"}},
        {expected: "Port Sarim lodestone", teleport_id: {group: "home", spot: "portsarim"}},
        {expected: "Prifddinas lodestone", teleport_id: {group: "home", spot: "prifddinas"}},
        {expected: "Seers' Village lodestone", teleport_id: {group: "home", spot: "seersvillage"}},
        {expected: "Taverley lodestone", teleport_id: {group: "home", spot: "taverley"}},
        {expected: "Tirannwn lodestone", teleport_id: {group: "home", spot: "tirannwn"}},
        {expected: "Varrock lodestone", teleport_id: {group: "home", spot: "varrock"}},
        {expected: "Wilderness Crater lodestone", teleport_id: {group: "home", spot: "wilderness"}},
        {expected: "Yanille lodestone", teleport_id: {group: "home", spot: "yanille"}},
        {expected: "Menaphos lodestone", teleport_id: {group: "home", spot: "menaphos"}},
        {expected: "Fort Forinthry lodestone", teleport_id: {group: "home", spot: "fortforinthry"}},
        {expected: "City of Um lodestone", teleport_id: {group: "home", spot: "cityofum"}},

        {expected: "Grand Exchange Luck of the Dwarves", teleport_id: {group: "ringofwealth", spot: "grandexchange"}},
        {expected: "Dwarven Outpost Luck of the Dwarves", teleport_id: {group: "luckofthedwarves", spot: "outpost"}},
      ]

    export function findBest(right_click_string: string): TeleportGroup.SpotId {
      return findBestMatch(teleport_hovers, ref => stringSimilarity(right_click_string, ref.expected), 0.9)?.value?.teleport_id
    }
  }

  export const ANGLE_CHANGE_COMMIT_THRESHOLD = Angles.degreesToRadians(4)

  export type Settings = {
    auto_commit_on_angle_change: boolean,
    enable_status_overlay: boolean,
    status_overlay_warn_antialiasing: boolean
    active_triangulation_presets: {
      compass_id: number,
      preset_id: number | null
    }[],
    custom_triangulation_presets: TriangulationPreset[],
    manual_tile_inaccuracy: number,
    use_previous_solution_as_start: boolean,
    show_method_preview_of_secondary_solutions: boolean,
    invert_preset_sequence_if_previous_solution_was_used: boolean,
    skip_triangulation_point_if_colinear: boolean,
    beam_color: string,
    read_chat_for_sextant_message: boolean
  }

  export type TriangulationPreset = {
    id: number,
    compass_id: number | number[],
    name: string,
    sequence: {
      tile?: TileCoordinates,
      teleport?: TeleportGroup.SpotId
    }[]
  }

  export namespace TriangulationPreset {
    export const elite_moonclan_southfeldiphills: TriangulationPreset = {
      compass_id: [clue_data.gielinor_compass.id, clue_data.tetracompass.id],
      id: -1,
      name: "{{teleport lunarspellbook moonclan}} Moonclan - {{teleport normalspellbook southfeldiphills}} South Feldip Hills",
      sequence: [
        {teleport: {group: "lunarspellbook", spot: "moonclan"}},
        {teleport: {group: "normalspellbook", spot: "southfeldiphills"}},
      ]
    }

    export const elite_moonclan_iceplateu: TriangulationPreset = {
      compass_id: [clue_data.gielinor_compass.id, clue_data.tetracompass.id],
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
      compass_id: [clue_data.gielinor_compass.id, clue_data.tetracompass.id],
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

    export const elite_falador_dave: TriangulationPreset = {
      compass_id: [clue_data.gielinor_compass.id, clue_data.tetracompass.id],
      id: -6,
      name: "{{teleport davesspellbook falador}} Falador",
      sequence: [
        {teleport: {group: "davesspellbook", spot: "falador"}},
      ]
    }

    export const master_whales_maw: TriangulationPreset = {
      compass_id: clue_data.arc_compass.id,
      id: -9,
      name: "{{teleport arctabs whalesmaw}} Whale`s Maw",
      sequence: [
        {teleport: {group: "arctabs", spot: "whalesmaw"}},
      ]
    }

    export const elite_menaphos_house_south_feldip_hills: TriangulationPreset = {
      compass_id: [clue_data.gielinor_compass.id, clue_data.tetracompass.id],
      id: -7,
      name: "{{teleport houseteleports menaphos}} Menaphos - {{teleport normalspellbook southfeldiphills}} South Feldip Hills",
      sequence: [
        {teleport: {group: "houseteleports", spot: "menaphos"}},
        {teleport: {group: "normalspellbook", spot: "southfeldiphills"}},
      ]
    }

    export const elite_amulet_of_nature: TriangulationPreset = {
      compass_id: [clue_data.gielinor_compass.id, clue_data.tetracompass.id],
      id: -8,
      name: "{{teleport amuletofnature faladortree}} Falador",
      sequence: [
        {tile: {"x": 3005, "y": 3375, "level": 0}},
      ]
    }

    export const builtin: TriangulationPreset[] = [
      elite_moonclan_southfeldiphills,
      elite_moonclan_iceplateu,
      master_turtle_island,
      elite_falador,
      master_turtle_island_dock,
      master_whales_maw,
      elite_menaphos_house_south_feldip_hills,
      elite_amulet_of_nature
    ]
  }

  export namespace Settings {
    export const DEFAULT: Settings = {
      auto_commit_on_angle_change: true,
      enable_status_overlay: true,
      status_overlay_warn_antialiasing: true,
      custom_triangulation_presets: [],
      active_triangulation_presets: [],
      manual_tile_inaccuracy: 3,
      use_previous_solution_as_start: false,
      show_method_preview_of_secondary_solutions: true,
      invert_preset_sequence_if_previous_solution_was_used: false,
      skip_triangulation_point_if_colinear: true,
      beam_color: '#3388ff',
      read_chat_for_sextant_message: true
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return DEFAULT

      if (!isArray(settings.custom_triangulation_presets)) settings.custom_triangulation_presets = []
      if (!isArray(settings.active_triangulation_presets)) settings.active_triangulation_presets = []
      if (![true, false].includes(settings.auto_commit_on_angle_change)) settings.auto_commit_on_angle_change = DEFAULT.auto_commit_on_angle_change
      if (![true, false].includes(settings.enable_status_overlay)) settings.enable_status_overlay = DEFAULT.enable_status_overlay
      if (![true, false].includes(settings.status_overlay_warn_antialiasing)) settings.status_overlay_warn_antialiasing = DEFAULT.status_overlay_warn_antialiasing
      if (typeof settings.manual_tile_inaccuracy != "number") settings.manual_tile_inaccuracy = DEFAULT.manual_tile_inaccuracy
      if (![true, false].includes(settings.use_previous_solution_as_start)) settings.use_previous_solution_as_start = DEFAULT.use_previous_solution_as_start
      if (![true, false].includes(settings.show_method_preview_of_secondary_solutions)) settings.show_method_preview_of_secondary_solutions = DEFAULT.show_method_preview_of_secondary_solutions
      if (![true, false].includes(settings.invert_preset_sequence_if_previous_solution_was_used)) settings.show_method_preview_of_secondary_solutions = DEFAULT.invert_preset_sequence_if_previous_solution_was_used
      if (![true, false].includes(settings.skip_triangulation_point_if_colinear)) settings.skip_triangulation_point_if_colinear = DEFAULT.skip_triangulation_point_if_colinear
      if (typeof settings.beam_color != "string") settings.beam_color = DEFAULT.beam_color
      if (![true, false].includes(settings.read_chat_for_sextant_message)) settings.read_chat_for_sextant_message = DEFAULT.read_chat_for_sextant_message

      return settings
    }
  }
}