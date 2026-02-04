import Behaviour, {SingleBehaviour} from "../../../lib/ui/Behaviour";
import {ClueTrainer} from "../../ClueTrainer";
import {C} from "../../../lib/ui/constructors";
import Widget from "../../../lib/ui/Widget";
import {AbstractDropdownSelection} from "../widgets/AbstractDropdownSelection";
import {Clues} from "../../../lib/runescape/clues";
import {TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import lodash, {capitalize} from "lodash";
import {Path} from "../../../lib/runescape/pathing";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import {SolvingMethods} from "../../model/methods";
import BoundsBuilder from "../../../lib/gamemap/BoundsBuilder";
import {RenderingUtility} from "../map/RenderingUtility";
import MethodSelector from "./MethodSelector";
import PathControl from "./PathControl";
import {CursorType} from "../../../lib/runescape/CursorType";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {ClueReader} from "./cluereader/ClueReader";
import {ClueEntities} from "./ClueEntities";
import {NislIcon} from "../nisl";
import {ClueProperties} from "../theorycrafting/ClueProperties";
import {SlideGuider, SliderSolving} from "./subbehaviours/SliderSolving";
import {NeoSolvingSubBehaviour} from "./NeoSolvingSubBehaviour";
import {CompassSolving} from "./subbehaviours/CompassSolving";
import {ScanTreeSolving} from "./subbehaviours/scans/ScanTreeSolving";
import {KnotSolving} from "./subbehaviours/KnotSolving";
import {LockboxSolving} from "./subbehaviours/LockboxSolving";
import {TowersSolving} from "./subbehaviours/TowersSolving";
import {Log} from "../../../lib/util/Log";
import {CapturedScan} from "./cluereader/capture/CapturedScan";
import {SimpleScanSolving} from "./subbehaviours/scans/SimpleScanSolving";
import {ScanSolving} from "./subbehaviours/scans/ScanSolving";
import {Transportation} from "../../../lib/runescape/transportation";
import {SettingsNormalization} from "../../../lib/util/SettingsNormalization";
import {util} from "../../../lib/util/util";
import {ScanTree} from "../../../lib/cluetheory/scans/ScanTree";
import {PathOverlayControl} from "../../overlay3d/PathOverlayControl";
import {NeoSolvingMapLayer} from "./NeoSolvingMapLayer";
import {ClueReadingBehaviour} from "./ClueReadingBehaviour";
import span = C.span;
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import interactionMarker = RenderingUtility.interactionMarker;
import GenericPathMethod = SolvingMethods.GenericPathMethod;
import inlineimg = C.inlineimg;
import item = C.item;
import cls = C.cls;
import vbox = C.vbox;
import bold = C.bold;
import spacer = C.spacer;
import space = C.space;
import hboxl = C.hboxl;

import activate = TileArea.activate;
import ClueSpot = Clues.ClueSpot;
import log = Log.log;
import default_interactive_area = Transportation.EntityTransportation.default_interactive_area;
import digSpotArea = Clues.digSpotArea;

/**
 * NeoSolvingBehaviour is the central coordinator for clue solving.
 * It controls the map, the {@link ClueReader}, (automatic) method selection, puzzle solvers, and more.
 *
 * Logic specific to different types of clues and puzzles is outsourced in subclasses of {@link NeoSolvingSubBehaviour}.
 */
export default class NeoSolvingBehaviour extends Behaviour {
  public map_layer: NeoSolvingMapLayer

  // Active clue step and step history
  private state: NeoSolving.ClueState = null
  private history: NeoSolving.ClueState[] = []

  active_method: AugmentedMethod = null
  active_behaviour: SingleBehaviour<NeoSolvingSubBehaviour> = this.withSub(new SingleBehaviour<NeoSolvingSubBehaviour>())

  // Clue Reader that reads the game screen with Alt1 to detect clues
  clue_reader: ClueReadingBehaviour = this.withSub(new ClueReadingBehaviour(this))

  // Controller for path display on the map, including an ui component
  public path_control = this.withSub(new PathControl(this))

  // Method dropdown ui component
  private method_selector: MethodSelector = null

  // Component responsible for drawing and managing ingame path overlays using Alt1Gl
  private overlay_control: PathOverlayControl

  constructor(public app: ClueTrainer, public tetracompass_only: boolean) {
    super();

    this.path_control.section_selected.on(p => {
      if (this.active_method?.method?.type != "scantree") this.map_layer.fit(Path.bounds(p))
      else {
        const behaviour = this.active_behaviour.get()
        if (behaviour instanceof ScanTreeSolving) behaviour.onSectionSelectedInPathControl(p)
      }
    })

    this.overlay_control = new PathOverlayControl()
  }

  /**
   * Get an estimate for the player's current position based on the solution of the previous clue.
   * Currently, only scans and compasses report their respective solution to be used by this.
   * Solutions expire after 10 seconds, puzzles extend this expiry.
   */
  getAssumedPlayerPositionByLastClueSolution(): TileArea | null {

    const now = Date.now()

    const LOOKBACK = 10000 // 10 seconds

    let OLDEST_CONSIDERED_STEP = now - LOOKBACK

    for (let i = this.history.length - 2; i >= 0; i--) {
      const state = this.history[i]

      if (state.end_time < OLDEST_CONSIDERED_STEP) return null

      if (state.step.type == "puzzle") OLDEST_CONSIDERED_STEP = state.start_time - LOOKBACK
      else return state.solution_area
    }

    return null
  }

  private activateSubBehaviour(behaviour: NeoSolvingSubBehaviour) {
    if (behaviour) {
      behaviour.setRelatedState(this.state)
      log().log(`Activating subbehaviour: ${behaviour.constructor.name}`, "Solving")
    }

    this.active_behaviour.set(behaviour)
  }

  private pushState(state: NeoSolving.ClueState["step"], read_result: ClueReader.Result | undefined): NeoSolving.ClueState {
    const now = Date.now()

    if (this.state) {
      this.state.read_result = undefined

      if (!this.state.end_time) {
        this.state.end_time = now
      }
    }

    const next_id = this.history.length > 0 ? this.history[this.history.length - 1].state_id + 1 : 0

    this.state = {
      state_id: next_id,
      step: state,
      start_time: now,
      read_result: read_result,
      end_time: undefined,
      solution_area: undefined
    }

    log().log(`Created state ${this.state.state_id} (${NeoSolving.ClueState.title(this.state)})`, "Solving")

    this.history.push(this.state)

    return this.state
  }

  setPuzzle(puzzle: ClueReader.Result.Puzzle.Puzzle | null): boolean {
    if (this.state?.step?.type == "puzzle" && this.state.step.puzzle.type == puzzle?.type) return false // Don't do anything if a puzzle of that type is already active

    this.reset(this.state)

    this.pushState({ type: "puzzle", puzzle: puzzle }, undefined)

    if (puzzle) {
      this.activateSubBehaviour((() => {
        switch (puzzle.type) {
          case "slider":
            return new SliderSolving(this, puzzle)
          case "knot":
            return new KnotSolving(this, puzzle)
          case "lockbox":
            return new LockboxSolving(this, puzzle)
          case "tower":
            return new TowersSolving(this, puzzle)
        }
      })())
    }

    return true
  }

  setSolutionArea(state: NeoSolving.ClueState, area: TileArea): void {
    if (!state) return

    log().log(`Setting clue solution (state ${state.state_id}) to ${TileArea.toString(area)}`, "Solving")

    state.solution_area = area
  }

  public fitToClue() {
    if (!this.state.step || this.state.step.type == "puzzle") return

    const step = this.state.step.clue

    const bounds = new BoundsBuilder()

    const sol = Clues.Step.solution(step.step)

    switch (sol?.type) {
      case "talkto":
        let npc_spot_id = 0
        let spot = sol.spots[npc_spot_id]

        bounds.addArea(spot.range)
        break;
      case "dig":
        bounds.addTile(sol.spot)
        break;
      case "search":
        bounds.addRectangle(sol.spot)
        break;
    }

    switch (step.step.type) {
      case "emote":
        bounds.addArea(step.step.area)
        break;
      case "skilling":
        bounds.addRectangle(TileArea.toRect(step.step.areas[0]))
        break;
      case "scan":
        bounds.addTile(...step.step.spots)
        break;
    }

    this.map_layer.fit(bounds.get(), "setting")
  }

  /**
   * Sets the active clue. Builds the ui elements and moves the map view to the appropriate spot.
   *
   * @param step The clue step combined with the index of the selected text variant.
   * @param fit_target
   * @param read_result
   */
  setClue(step: { step: Clues.Step, text_index: number }, fit_target: boolean = true, read_result: ClueReader.Result): void {
    if (this.state?.step?.type == "clue" && this.state.step.clue.step.id == step.step.id && this.state.step.clue.text_index == step.text_index) {
      return
    }

    if (this.state?.read_result && this.state?.step?.type == "clue" && this.state.step.clue.step.type == "compass" && step.step.type == "compass") {
      // This is a workaround fix for a rare issue where a master compass is reset and reloaded as an elite compass because of interface interference.
      // Changing from an active compass to another compass is disallowed.
      return
    }

    this.reset(this.state)

    const state = this.pushState({ type: "clue", clue: step }, read_result)

    switch (step.step.solution?.type) {
      case "search":
        this.setSolutionArea(state, default_interactive_area(step.step.solution.spot))
        break;
      case "dig":
        this.setSolutionArea(state, digSpotArea(step.step.solution.spot))
        break;
      case "talkto":
        if (step.step.solution.spots.length == 1) {
          this.setSolutionArea(state, step.step.solution.spots[0].range)
        }
        break;
    }

    if (step.step.type == "anagram") {
      step.step.solution.spots
    }

    const settings = this.app.settings.settings.solving

    const clue = step.step

    // Render controls and solution on map
    {
      let w = c()

      if (step.step.type == "map") {
        if (settings.info_panel.map_image == "show") {
          w.append(c(`<img src='${step.step.image_url}' style="width: 100%">`).addClass("ctr-neosolving-solution-row"))
        } else if (settings.info_panel.map_image == "transcript") {
          cls("ctr-neosolving-solution-row").text(step.step.text[0]).appendTo(w)
        }
      } else {
        switch (settings.info_panel.clue_text) {
          case "full":
            cls("ctr-neosolving-solution-row").text(step.step.text[step.text_index]).appendTo(w)
            break
          case "abridged":
            if (clue.type == "compass") break

            const short = Clues.Step.shortString(clue, step.text_index)

            const row = cls("ctr-neosolving-solution-row").text(short).appendTo(w)

            if (clue.text[step.text_index]) row.addClass("ctr-neosolving-solution-row-shortened")

            break
          case "hide":
          // Do nothing
        }
      }

      const sol = Clues.Step.solution(step.step)

      if (sol) {
        switch (sol?.type) {
          case "talkto":
            let npc_spot_id = 0
            let spot = sol.spots[npc_spot_id]

            if (settings.info_panel.talk_target == "show") {
              w.append(cls("ctr-neosolving-solution-row")
                .append(
                  inlineimg("/assets/icons/cursor_talk.png"),
                  span("Talk to "),
                  C.npc(sol.npc, true)
                    .tooltip("Click to center")
                    .on("click", () => {
                      this.map_layer.fit(TileArea.toRect(spot.range))
                    }),
                  spot.description
                    ? span(" " + spot.description)
                    : undefined
                ))
            }

            for (let i = 0; i < sol.spots.length; i++) {
              const spot = sol.spots[i]

              new ClueEntities.TalkSolutionNpcEntity(sol.npc, spot)
                .addTo(this.map_layer.generic_solution_layer)
            }

            break;
          case "search":
            if (sol.key && settings.info_panel.search_key == "show") {
              w.append(cls("ctr-neosolving-solution-row").append(
                inlineimg("/assets/icons/key.png"),
                " ",
                span(sol.key.answer).addClass("ctr-clickable").on("click", () => {
                  this.map_layer.fit(TileArea.toRect(sol.key.area))
                }),
              ))
            }

            if (settings.info_panel.search_target == "show") {
              w.append(cls("ctr-neosolving-solution-row").append(
                inlineimg("/assets/icons/cursor_search.png"),
                " ",
                span("Search "),
                C.staticentity(sol.entity, true)
                  .tooltip("Click to center")
                  .on("click", () => {
                    this.map_layer.fit(sol.spot)
                  })
              ))
            }

            new ClueEntities.SearchSolutionEntity(sol)
              .addTo(this.map_layer.generic_solution_layer)

            break;
          case "dig":
            if (settings.info_panel.dig_target == "show") {
              w.append(cls("ctr-neosolving-solution-row").append(
                inlineimg("/assets/icons/cursor_shovel.png"),
                " ",
                span("Dig"),
                sol.description
                  ? span(" " + sol.description)
                  : span(` at ${TileCoordinates.toString(sol.spot)}`)
              ))
            }
            new ClueEntities.DigSolutionEntity(sol)
              .addTo(this.map_layer.generic_solution_layer)

            break;
        }
      }

      if (clue.type == "emote") {
        if (clue.hidey_hole && settings.info_panel.hidey_hole == "show") {
          w.append(cls("ctr-neosolving-solution-row").append(
            inlineimg("/assets/icons/cursor_search.png"),
            " ",
            span("Get items from "),
            C.staticentity(clue.hidey_hole.name)
              .tooltip("Click to center")
              .addClass("ctr-clickable")
              .on("click", () => {
                this.map_layer.fit(clue.hidey_hole.location)
              })
          ))
        }

        if (settings.info_panel.emote_items == "show") {
          let row = cls("ctr-neosolving-solution-row").append(
            inlineimg("/assets/icons/cursor_equip.png"),
            " ",
            span("Equip "),
          ).appendTo(w)

          for (let i = 0; i < clue.items.length; i++) {
            const itm = clue.items[i]

            if (i > 0) {
              if (i == clue.items.length - 1) row.append(", and ")
              else row.append(", ")
            }

            row.append(item(itm))
          }
        }
        if (settings.info_panel.emotes == "show") {
          let row = cls("ctr-neosolving-solution-row").append(
            inlineimg("/assets/icons/emotes.png"),
            " ",
          ).appendTo(w)

          for (let i = 0; i < clue.emotes.length; i++) {
            const item = clue.emotes[i]

            if (i > 0) {
              if (i == clue.emotes.length - 1) row.append(", then ")
              else row.append(", ")
            }

            row.append(item).addClass("nisl-emote")
          }
        }

        if (clue.double_agent && settings.info_panel.double_agent == "show") {
          w.append(cls("ctr-neosolving-solution-row").append(
            inlineimg("/assets/icons/cursor_attack.png"),
            space(),
            span("Kill "),
            C.npc("Double Agent")
          ))
        }

        new ClueEntities.EmoteAreaEntity(clue).addTo(this.map_layer.generic_solution_layer)

        if (clue.hidey_hole) {
          new ClueEntities.HideyHoleEntity(clue, false).addTo(this.map_layer.generic_solution_layer)
        }
      } else if (clue.type == "skilling") {
        w.append(cls("ctr-neosolving-solution-row").append(
          inlineimg(CursorType.meta(clue.cursor).icon_url),
          space(),
          span(clue.answer)
        ))

        interactionMarker(activate(clue.areas[0]).center(), clue.cursor)
          .addTo(this.map_layer.generic_solution_layer)
      } else if (clue.type == "scan") {
        this.map_layer.scan_layer.marker.setClickable(true)
        this.map_layer.scan_layer.setSpots(clue.spots)
        this.map_layer.scan_layer.marker.setRadius(clue.range + 5, true)
      } else if (clue.type == "compass") {
        // bounds.addTile(...clue.spots)
      }

      if (clue.challenge && clue.challenge.length > 0) {
        const challenge = clue.challenge.find(c => c.type == "challengescroll") as Clues.Challenge & { type: "challengescroll" }

        if (challenge) {
          const answer_id = this.app.favourites.getChallengeAnswerId(clue)
          const answer = challenge.answers[answer_id]

          if (settings.info_panel.challenge != "hide") {
            let row: Widget = null
            let answer_span: Widget = null

            w.append(row = cls("ctr-neosolving-solution-row")
              .toggleClass("ctr-clickable", challenge.answers.length > 1)
              .append(
                hboxl(
                  inlineimg("/assets/icons/activeclue.png"),
                  vbox(
                    settings.info_panel.challenge == "full"
                      ? c().css("font-style", "italic").text(challenge.question) : undefined,
                    hboxl(
                      bold(`Answer:`),
                      space(),
                      answer_span = span(answer.answer.toString()),
                      spacer(),
                      challenge.answers.length > 1 ? NislIcon.dropdown() : undefined
                    )
                  ).css("flex-grow", "1")
                )
              ))

            if (challenge.answers.length > 1) {
              row.on("click", () => {
                new AbstractDropdownSelection.DropDown<Clues.Challenge.ChallengeScroll["answers"][number]>({
                  dropdownClass: "ctr-neosolving-favourite-dropdown",
                  renderItem: a => c().text(`${a.answer} (${a.note})`)
                })
                  .setItems(challenge.answers)
                  .setHighlighted(answer)
                  .open(row, undefined)
                  .onSelected(a => {
                    this.app.favourites.setChallengeAnswerId(clue, challenge.answers.indexOf(a))
                    answer_span.text(a.answer.toString())
                  })
              })
            }
          }
        } else {
          if (settings.info_panel.puzzle == "show" || (settings.info_panel.puzzle == "hideforscansandcompasses" && step.step.type != "compass" && step.step.type != "scan")) {
            const row = cls("ctr-neosolving-solution-row").appendTo(w)

            for (let i = 0; i < clue.challenge.length; i++) {
              if (i > 0) {
                if (i == clue.challenge.length - 1) row.append(", or ")
                else row.append(", ")
              }

              row.append(ClueProperties.render_challenge(clue.challenge[i]).css("display", "inline-block"))
            }
          }
        }
      }

      if (!w.container.is(":empty"))
        this.map_layer.solution_container.append(w)
    }

    if (fit_target) this.fitToClue()

    if (this.app.settings.settings.teleport_customization.preset_bindings_active) {
      const active_preset = this.app.settings.settings.teleport_customization.active_preset
      const bound_preset = this.app.settings.settings.teleport_customization.preset_bindings[clue.tier]

      if (active_preset != bound_preset && bound_preset != null)
        this.app.settings.update(set => set.teleport_customization.active_preset = bound_preset)
    }

    if (clue.type == "compass") {
      const behaviour = new CompassSolving(this, clue, read_result?.type == "compass" ? read_result.reader : undefined,
        async spot => {
          if (spot) {
            const method = await this.getAutomaticMethod({ clue: clue.id, spot: spot })

            this.setMethod(method)
          } else {
            this.setMethod(null)
          }
        }
      )

      if (!read_result) this.map_layer.fit(TileRectangle.from(...clue.spots))

      this.activateSubBehaviour(behaviour)
    }
  }

  /**
   * Sets the active solving method.
   * Use {@link setClue} to activate the related clue first!
   * Builds the necessary ui elements and potentially zooms to the start point.
   *
   * @param method
   * @param read_result
   */
  async setMethod(method: AugmentedMethod, read_result: ClueReader.Result = null): Promise<void> {
    log().log(`Setting method ${method ? method.method.name : "null"}`)

    if (!read_result && this.state?.read_result) read_result = this.state.read_result

    if (method) {
      log().log(`Setting method to ${method.method.name} (${method.method.id.substring(0, 8)})`, "Solving")
    } else {
      log().log(`Setting method to null`, "Solving")
    }

    if (this.state?.step?.type != "clue") {
      log().log(`Aborting set method because active state is not a clue step: '${this.state?.step?.type}'.`, "Solving")

      return;
    }

    if (method && (method.clue.clue.id != this.state?.step?.clue?.step?.id)) {
      log().log(`Aborting set method because method does not match clue.`, "Solving")

      return;
    }
    if (method && method == this.active_method) {
      log().log(`Aborting set method because same method is already active.`, "Solving")

      return;
    }

    this.path_control.reset()
    this.method_selector.hide()

    this.active_method = null

    const clue = this.state.step.clue.step

    const active_behaviour = this.active_behaviour.get()

    if (active_behaviour?.type == "method") {
      active_behaviour.stop()
    }

    if (method) {
      this.active_method = method

      if (method.method.type == "scantree") {
        const scan_interface: CapturedScan = (() => {
          if (read_result?.type == "scan") {
            return read_result.scan_interface
          } else return null
        })()

        this.activateSubBehaviour(
          new ScanTreeSolving(this, method as AugmentedMethod<ScanTreeMethod, Clues.Scan>, scan_interface, this.app.settings.observable.scans)
        )

        const paths: Path[] = []
        ScanTree.traverse(method.method.tree.root, n => paths.push(n.path))

        this.overlay_control.setIngameOverlays(paths)
      } else if (method.method.type == "general_path") {
        this.path_control.setMethod(method as AugmentedMethod<GenericPathMethod>)
        this.overlay_control.setIngameOverlays([
          method.method.pre_path,
          method.method.main_path,
          method.method.post_path,
        ])
      }
    } else {
      if (clue.type == "scan") {
        // When deselecting the active scan tree, zoom to the spots
        if (active_behaviour instanceof ScanTreeSolving) this.map_layer.fit(TileRectangle.from(...clue.spots))

        const behaviour = new SimpleScanSolving(this, clue, read_result?.type == "scan" ? read_result.scan_interface : null)

        this.activateSubBehaviour(behaviour)
      }
    }

    if ((this.state.step?.clue?.step?.type != "compass") || (active_behaviour instanceof CompassSolving && active_behaviour.selected_spot.value())) {

      const clue: ClueSpot.Id = active_behaviour instanceof CompassSolving
        ? { clue: this.state.step.clue.step.id, spot: active_behaviour.selected_spot.value().spot.spot }
        : { clue: this.state.step.clue.step.id }

      this.method_selector.setClue(clue, method)
        .then(() => this.method_selector.show())
    }
  }

  async getAutomaticMethod(step: ClueSpot.Id): Promise<AugmentedMethod> {
    let m = await this.app.favourites.getMethod(step)

    if (m === undefined) {
      let ms = await MethodPackManager.instance().getForClue(step)
      if (ms.length > 0) m = ms[0]
    }

    return m
  }

  async setClueWithAutomaticMethod(step: Clues.StepWithTextIndex, read_result: ClueReader.Result) {
    if (this.state?.step?.type == "clue" && this.state.step.clue.step.id == step.step.id && this.state.step.clue.text_index == step.text_index) {
      return
    }

    let m = await this.getAutomaticMethod({ clue: step.step.id })

    this.setClue(step, !m, read_result)
    this.setMethod(m, read_result)
  }

  /**
   * Resets both the active clue and method, resets all displayed pathing.
   */
  reset(state: NeoSolving.ClueState): boolean {
    if (state != this.state) return false // The caller needs to provide the active state as a token to prevent potential timing issues

    this.map_layer.reset()

    this.path_control.reset()
    this.activateSubBehaviour(null)
    this.overlay_control.reset()
    this.method_selector.hide()
    this.state = null
    this.active_method = null

    log().log("Reset state", "Solving")

    return true
  }

  protected begin() {
    this.app.map.addGameLayer(this.map_layer = new NeoSolvingMapLayer(this))

    this.method_selector = new MethodSelector(this.app.favourites)
      .addClass("ctr-neosolving-solution-row")
      .appendTo(this.map_layer.method_selection_container)

    this.method_selector.method_selected.on(m => {
      this.app.favourites.setMethod(m.clue, m.method)
      this.setMethod(m.method)
      if (!m) this.fitToClue()
    })
  }

  protected end() {
    this.map_layer.remove()
  }
}

export namespace NeoSolving {

  export type ClueState = {
    state_id: number,
    step: {
      type: "puzzle",
      puzzle: ClueReader.Result.Puzzle.Puzzle
    } | {
      type: "clue",
      clue: Clues.StepWithTextIndex
    },
    read_result: ClueReader.Result,
    start_time: number,
    end_time: number,
    solution_area: TileArea,
  }

  export namespace ClueState {
    export function title(state: ClueState): string {
      switch (state.step.type) {
        case "puzzle":
          switch (state.step.puzzle.type) {
            case "slider":
              return `Slider (${state.step.puzzle.puzzle.theme})`
            case "knot":
              return "Knot"
            case "tower":
              return "Tower"
            case "lockbox":
              return "Lockbox"
            default:
              return "Unknown Puzzle"
          }
        case "clue":
          return `${capitalize(state.step.clue.step.type)} id ${state.step.clue.step.id}`

      }
    }
  }

  export type Settings = {
    general: Settings.GeneralSettings,
    info_panel: Settings.InfoPanel,
    puzzles: Settings.Puzzles,
    compass: CompassSolving.Settings,
    scans: ScanSolving.Settings,
  }

  export namespace Settings {
    import NormalizationFunction = SettingsNormalization.NormalizationFunction;
    export type Puzzles = {
      sliders: SlideGuider.Settings,
      knots: KnotSolving.Settings,
      lockboxes: LockboxSolving.Settings,
      towers: TowersSolving.Settings,
    }

    export namespace Puzzles {
      export const DEFAULT: Puzzles = {
        sliders: SlideGuider.Settings.DEFAULT,
        knots: KnotSolving.Settings.DEFAULT,
        lockboxes: LockboxSolving.Settings.DEFAULT,
        towers: TowersSolving.Settings.DEFAULT,
      }

      export function normalize(settings: Puzzles): Puzzles {
        if (!settings) return lodash.cloneDeep(DEFAULT)

        settings.sliders = SlideGuider.Settings.normalize(settings.sliders)
        settings.knots = KnotSolving.Settings.normalize(settings.knots)
        settings.lockboxes = LockboxSolving.Settings.normalize(settings.lockboxes)
        settings.towers = TowersSolving.Settings.normalize(settings.towers)

        return settings
      }
    }

    export type InfoPanel = {
      clue_text: "full" | "abridged" | "hide"
      map_image: "show" | "transcript" | "hide",
      dig_target: "show" | "hide",
      talk_target: "show" | "hide",
      search_target: "show" | "hide",
      search_key: "show" | "hide",
      hidey_hole: "show" | "hide",
      emote_items: "show" | "hide",
      emotes: "show" | "hide",
      double_agent: "show" | "hide",
      puzzle: "show" | "hide" | "hideforscansandcompasses",
      challenge: "full" | "answer_only" | "hide",
      path_step_list: "show" | "hide"
    }

    export namespace InfoPanel {
      export const EVERYTHING: Settings["info_panel"] = {
        clue_text: "full",
        map_image: "show",
        dig_target: "show",
        talk_target: "show",
        search_target: "show",
        search_key: "show",
        hidey_hole: "show",
        emote_items: "show",
        emotes: "show",
        double_agent: "show",
        challenge: "full",
        puzzle: "show",
        path_step_list: "show",
      }

      export const NOTHING: Settings["info_panel"] = {
        clue_text: "hide",
        map_image: "hide",
        dig_target: "hide",
        talk_target: "hide",
        search_target: "hide",
        search_key: "hide",
        hidey_hole: "hide",
        emote_items: "hide",
        emotes: "hide",
        double_agent: "hide",
        challenge: "hide",
        puzzle: "hide",
        path_step_list: "hide",
      }

      export const REDUCED: Settings["info_panel"] = {
        clue_text: "abridged",
        map_image: "show",
        dig_target: "show",
        talk_target: "show",
        search_target: "show",
        search_key: "hide",
        hidey_hole: "hide",
        emote_items: "hide",
        emotes: "hide",
        double_agent: "hide",
        challenge: "answer_only",
        puzzle: "hideforscansandcompasses",
        path_step_list: "hide",
      }

      export const DEFAULT = REDUCED

      export function normalize(settings: InfoPanel): InfoPanel {
        if (!settings) return lodash.cloneDeep(DEFAULT)

        if (!["full", "hide", "abridged"].includes(settings.clue_text)) settings.clue_text = DEFAULT.clue_text
        if (!["show", "hide", "transcript"].includes(settings.map_image)) settings.map_image = DEFAULT.map_image
        if (!["show", "hide"].includes(settings.dig_target)) settings.dig_target = DEFAULT.dig_target
        if (!["show", "hide"].includes(settings.talk_target)) settings.talk_target = DEFAULT.talk_target
        if (!["show", "hide"].includes(settings.search_target)) settings.search_target = DEFAULT.search_target
        if (!["show", "hide"].includes(settings.search_key)) settings.search_key = DEFAULT.search_key

        if (!["show", "hide"].includes(settings.hidey_hole)) settings.hidey_hole = DEFAULT.hidey_hole
        if (!["show", "hide"].includes(settings.emote_items)) settings.emote_items = DEFAULT.emote_items
        if (!["show", "hide"].includes(settings.emotes)) settings.emotes = DEFAULT.emotes
        if (!["show", "hide"].includes(settings.double_agent)) settings.double_agent = DEFAULT.double_agent
        if (!["show", "hide"].includes(settings.path_step_list)) settings.path_step_list = DEFAULT.path_step_list

        if (!["show", "hide"].includes(settings.puzzle)) settings.puzzle = DEFAULT.puzzle
        if (!["full", "answer_only", "hide"].includes(settings.challenge)) settings.challenge = DEFAULT.challenge

        return settings
      }
    }

    export type GeneralSettings = {
      global_max_zoom: number,
      minimum_view_size: number,
      include_closest_teleport: boolean,
    }

    export namespace GeneralSettings {
      import compose = util.compose;
      export const normalize: SettingsNormalization.NormalizationFunction<GeneralSettings> = SettingsNormalization.normaliz({
        global_max_zoom: compose(SettingsNormalization.number(7), SettingsNormalization.clamp(0, 7)),
        minimum_view_size: compose(SettingsNormalization.number(8), SettingsNormalization.clamp(1, 64)),
        include_closest_teleport: SettingsNormalization.bool(true)
      })
    }

    export const normalize: NormalizationFunction<Settings> = SettingsNormalization.normaliz<Settings>({
      general: GeneralSettings.normalize,
      info_panel: InfoPanel.normalize,
      puzzles: Puzzles.normalize,
      compass: CompassSolving.Settings.normalize,
      scans: ScanSolving.Settings.normalize
    })
  }
}

