import Widget from "../../../lib/ui/Widget";
import {GameLayer} from "../../../lib/gamemap/GameLayer";
import {ScanEditLayer} from "../theorycrafting/scanedit/ScanEditor";
import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import TransportLayer from "../map/TransportLayer";
import NeoSolvingBehaviour from "./NeoSolvingBehaviour";
import {C} from "../../../lib/ui/constructors";
import cls = C.cls;
import BoundsBuilder from "../../../lib/gamemap/BoundsBuilder";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import {Rectangle, Vector2} from "../../../lib/math";
import {util} from "../../../lib/util/util";
import findBestMatch = util.findBestMatch;
import lodash from "lodash";
import {deps} from "../../dependencies";
import {Clues} from "../../../lib/runescape/clues";
import Button from "lib/ui/controls/Button";
import {storage} from "../../../lib/util/storage";
import TextField from "lib/ui/controls/TextField";
import {ExpansionBehaviour} from "../../../lib/ui/ExpansionBehaviour";
import PreparedSearchIndex from "../../../lib/util/PreparedSearchIndex";
import {AbstractDropdownSelection} from "../widgets/AbstractDropdownSelection";
import {clue_data} from "../../../data/clues";
import {Alt1Modal} from "../../Alt1Modal";
import {SettingsModal} from "../settings/SettingsEdit";

export class NeoSolvingMapLayer extends GameLayer {
  public solution_container: Widget
  public method_selection_container: Widget
  public compass_container: Widget
  public scantree_container: Widget
  public path_container: Widget

  public scan_layer: ScanEditLayer
  public generic_solution_layer: GameLayer

  private sidebar: GameMapControl

  public transport_layer: TransportLayer

  constructor(private behaviour: NeoSolvingBehaviour) {
    super();

    this.transport_layer = new TransportLayer(true, {transport_policy: "none", teleport_policy: "target_only"}).addTo(this)

    this.sidebar = new GameMapControl({
      position: "top-left",
      type: "floating",
      no_default_styling: true
    }, cls("ctr-neosolving-sidebar")).addTo(this)

    this.sidebar.content.append(
      new NeoSolvingMapLayer.MainControlBar(behaviour),
      this.solution_container = cls("ctr-neosolving-sidebar-container"),
      this.compass_container = cls("ctr-neosolving-sidebar-container"),
      this.method_selection_container = cls("ctr-neosolving-sidebar-container"),
      this.scantree_container = cls("ctr-neosolving-sidebar-container"),
      this.path_container = cls("ctr-neosolving-sidebar-container"),
    )

    this.scan_layer = new ScanEditLayer([]).addTo(this)
    this.generic_solution_layer = new GameLayer().addTo(this)
  }

  fit(view: TileRectangle, extend_to_closest_teleport: boolean | "setting" = false): this {
    if (!view) return this

    if (extend_to_closest_teleport == true || (extend_to_closest_teleport == "setting" && this.behaviour.app.settings.settings.solving.general.include_closest_teleport)) {
      view = (() => {
        const bounds = new BoundsBuilder()

        bounds.addRectangle(view)

        bounds.fixCenter().fixLevel()

        const spots = this.transport_layer.getTeleportSpots()

        const current_center = Rectangle.center(bounds.get())

        const close_enough = spots.filter(e => Vector2.max_axis(Vector2.sub(e.centerOfTarget(), current_center)) < 32)

        close_enough.forEach(s => bounds.addArea(s.targetArea()))

        if (close_enough.length == 0) {
          const closest = findBestMatch(spots, e => Vector2.max_axis(Vector2.sub(e.centerOfTarget(), current_center)), undefined, true)

          if (closest.score < 320) bounds.addArea(closest.value.targetArea())
        }

        return bounds.get()
      })()
    }

    let copy = lodash.cloneDeep(view)

    let padding: [number, number] = null

    const mapSize = this.getMap().getSize()

    function score(w: number, h: number) {
      return (w * w) * (h * h)
    }

    const wideScore = score(mapSize.x - this.sidebar.content.raw().clientWidth, mapSize.y)
    const highScore = score(mapSize.x, mapSize.y - this.sidebar.content.raw().clientHeight)

    if (wideScore > highScore) {
      padding = [this.sidebar.content.raw().offsetWidth, 0]
    } else {
      padding = [0, this.sidebar.content.raw().offsetHeight]
    }

    // Minimum size the fit bounds should have, expand if necessary.
    const min = this.behaviour.app.settings.settings.solving.general.minimum_view_size

    const size = Rectangle.size(copy)

    copy = TileRectangle.extend(copy, [Math.max(0, (min - size.x) / 2), Math.max(0, (min - size.y) / 2)])

    this.map.fitView(copy, {
      maxZoom: this.behaviour.app.settings.settings.solving.general.global_max_zoom,
      paddingTopLeft: padding
    })

    return this
  }

  reset(): void {
    this.solution_container.empty()
    this.compass_container.empty()

    this.scan_layer.marker.setClickable(false)
    this.scan_layer.marker.setFixedSpot(null)
    this.scan_layer.setSpots([])

    this.generic_solution_layer.clearLayers()
  }
}

export namespace NeoSolvingMapLayer {
  import hbox = C.hbox;
  import Step = Clues.Step;

  class MainControlButton extends Button {
    constructor(options: { icon?: string, text?: string, centered?: boolean }) {
      super();

      if (options.icon) {
        this.append(c(`<img src="${options.icon}" class="ctr-neosolving-main-bar-icon">`))
      }

      if (options.centered) this.css("justify-content", "center")

      if (options.text) {
        this.append(c().text(options.text))

        this.css("flex-grow", "1")
      }

      this.addClass("ctr-neosolving-main-bar-button")
        .addClass("ctr-neosolving-main-bar-section")
    }
  }

  export class MainControlBar extends Widget {
    fullscreen_preference = new storage.Variable<boolean>("preferences/solve/fullscreen", () => false)
    autosolve_preference = new storage.Variable<boolean>("preferences/solve/autosolve", () => deps().app.in_alt1)

    search_bar: TextField
    rest: Widget

    search_bar_collapsible: ExpansionBehaviour
    rest_collapsible: ExpansionBehaviour

    dropdown: AbstractDropdownSelection.DropDown<{ step: Clues.Step, text_index: number }> = null

    prepared_search_index: PreparedSearchIndex<{ step: Clues.Step, text_index: number }>

    constructor(private parent: NeoSolvingBehaviour) {
      super();

      this.addClass("ctr-neosolving-main-bar")

      this.prepared_search_index = new PreparedSearchIndex<{ step: Clues.Step, text_index: number }>(
        clue_data.all.flatMap(step => step.text.map((_, i) => ({step: step, text_index: i}))),
        (step) => step.step.text[step.text_index]
        , {
          all: true,
          threshold: -10000
        }
      )

      this.append(
        this.parent.tetracompass_only
          ? new MainControlButton({icon: "/assets/icons/tetracompass.png"})
            .css("cursor", "default")
          : new MainControlButton({icon: "/assets/icons/glass.png"})
            .append(
              this.search_bar = new TextField()
                .css("flex-grow", "1")
                .css("font-weight", "normal")
                .setPlaceholder("Enter Search Term...")
                .toggleClass("nisl-textinput", false)
                .addClass("ctr-neosolving-main-bar-search")
                .setVisible(false)
                .onPreview((value) => {
                  let results = this.prepared_search_index.search(value)

                  this.dropdown.setItems(results)
                })
            )
            .tooltip("Search Clues")
            .onClick((e) => {
              e.stopPropagation()

              if (this.search_bar_collapsible.isExpanded()) {
                e.preventDefault()
              } else {
                this.search_bar_collapsible.expand()
                this.search_bar.container.focus()
                this.search_bar.setValue("")
              }
            }),
        this.rest = hbox(
          deps().app.in_alt1
            ? undefined
            : new MainControlButton({icon: "/assets/icons/Alt1.png", text: "Solving available in Alt1", centered: true})
              .tooltip("More available in Alt1")
              .onClick(() => new Alt1Modal().show()),
          !deps().app.in_alt1 ? undefined :
            new MainControlButton({icon: "/assets/icons/activeclue.png", text: "Solve", centered: true})
              .onClick(() => this.parent.clue_reader.solveManuallyTriggered())
              .tooltip("Read a clue from screen")
              .setEnabled(deps().app.in_alt1),
          !deps().app.in_alt1 ? undefined :
            new MainControlButton({icon: "/assets/icons/lock.png", text: "Auto-Solve", centered: true})
              .setToggleable(true)
              .tooltip("Continuously read clues from screen")
              .setEnabled(deps().app.in_alt1)
              .onToggle(v => {
                this.parent.clue_reader.setAutoSolve(v)
                this.autosolve_preference.set(v)
              })
              .setToggled(this.autosolve_preference.get())
          ,
          new MainControlButton({icon: "/assets/icons/fullscreen.png", centered: true})
            .tooltip("Hide the menu bar")
            .setToggleable(true)
            .onToggle(t => {
              deps().app.menu_bar.setCollapsed(t)
              this.fullscreen_preference.set(t)

              this.parent.app.map.invalidateSize()
            })
            .setToggled(this.fullscreen_preference.get()),
          new MainControlButton({icon: "/assets/icons/settings.png", centered: true})
            .tooltip("Open settings")
            .onClick(() => SettingsModal.openOnPage("solving_general"))
        ).css("flex-grow", "1"),
      )

      this.dropdown = new AbstractDropdownSelection.DropDown<{ step: Clues.Step, text_index: number }>({
        dropdownClass: "ctr-neosolving-favourite-dropdown",
        renderItem: e => {
          return c().text(Step.shortString(e.step, e.text_index))
        }
      })
        .onSelected(async clue => {
          this.parent.setClueWithAutomaticMethod(clue, null)
        })
        .onClosed(() => {
          this.search_bar_collapsible.collapse()
        })
        .setItems([])

      this.search_bar_collapsible = ExpansionBehaviour.horizontal({target: this.search_bar, starts_collapsed: true, duration: 100})
        .onChange(v => {
          if (v) this.dropdown?.close()
          else {
            this.dropdown.setItems(this.prepared_search_index.items())
            this.dropdown?.open(this, this.search_bar)
          }

          this.rest_collapsible.setCollapsed(!v)
        })

      this.rest_collapsible = ExpansionBehaviour.horizontal({target: this.rest, starts_collapsed: false})
    }
  }
}