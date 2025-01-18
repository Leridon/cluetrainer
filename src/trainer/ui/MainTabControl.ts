import Widget from "../../lib/ui/Widget";
import {C} from "../../lib/ui/constructors";
import {Application} from "../application";
import {PathEditor} from "./pathedit/PathEditor";
import {GameLayer} from "../../lib/gamemap/GameLayer";
import TheoryCrafter from "./theorycrafting/TheoryCrafter";
import Button from "../../lib/ui/controls/Button";
import MapUtilityBehaviour from "./MapUtilityBehaviour";
import {Observable, observe} from "../../lib/reactive";
import Behaviour from "../../lib/ui/Behaviour";
import NeoSolvingBehaviour from "./neosolving/NeoSolvingBehaviour";
import Properties from "./widgets/Properties";
import {SettingsModal} from "./settings/SettingsEdit";
import {AboutModal} from "../AboutModal";
import {Alt1Modal} from "../Alt1Modal";
import {HoverTileDisplay} from "./devutilitylayer/UtilityLayer";
import {ClueTrainerWiki} from "../wiki";
import spacer = C.spacer;
import span = C.span;

class MenuButton extends Button {

  constructor(name: string, icon: string) {
    super()

    this.addClass("ctr-menubar-button")

    this.append(
      c("<div style='height: 32px'></div>").append(c(`<img src="${icon}" style="width: 32px" alt="">`)),
      span(name)
    )
  }

  setActive(v: boolean): this {
    this.toggleClass("active", v)

    return this
  }
}

export class SimpleMapBehaviour extends Behaviour {
  private layer = new GameLayer()

  constructor(private app: Application) {
    super();

    this.layer.add(new HoverTileDisplay())
  }

  protected begin() {
    this.app.map.addGameLayer(this.layer)
  }

  protected end() {
    this.layer.remove()
  }

}

export default class MainTabControl extends Widget {
  solve_button: MenuButton
  tetracompass_button: MenuButton
  map_button: MenuButton
  create_button: MenuButton
  paths_button: MenuButton
  utility_button: MenuButton
  settings_button: MenuButton

  private active_tab: Observable<MainTabControl.Tab> = observe(null)

  constructor(public app: Application) {
    super();

    this.addClass("ctr-menubar")

    this.append(
      this.solve_button = new MenuButton("Solve", "assets/icons/ribbon_clue.png")
        .onClick(() => {
          this.switchToTab("solve")
        })
        .addTippy(
          new Properties().header("Clue Solver")
            .row(c().text("Clue solver to use while solving or for looking at methods.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          })
      ,
      this.map_button = new MenuButton("Map", "assets/icons/ribbon_map.png")
        .onClick(() => {
          this.switchToTab("map")
        })
        .addTippy(
          new Properties().header("Map")
            .row(c().text("A simple map view.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          }),
      this.create_button = new MenuButton("Methods", "assets/icons/ribbon_notes.webp")
        .onClick(() => {
          this.switchToTab("create")
        })

        .addTippy(
          new Properties().header("Method Management")
            .row(c().text("View, Manage and Create methods for clue steps.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          })
      ,
      this.paths_button = new MenuButton("Paths", "assets/icons/ribbon_activitytracker.webp")
        .onClick(() => {
          this.switchToTab("pathedit")
        })
        .addTippy(
          new Properties().header("Path Editor")
            .row(c().text("Edit paths on the map independently of clues.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          })
      ,
      this.tetracompass_button = new MenuButton("Tetras", "assets/icons/ribbon_tetra.png")
        .onClick(() => {
          this.switchToTab("tetracompass")
        })
        .addTippy(
          new Properties().header("Tetracompass Solver")
            .row(c().text("The compass solver adapted to work for tetracompasses.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          }),

      this.app.in_dev_mode ?
        this.utility_button = new MenuButton("Utility", "assets/icons/ribbon_notes.webp")
          .onClick(() => {
            this.switchToTab("utility")
          })
          .addTippy(
            new Properties().header("Development Utility")
              .row(c().text("This tab contains some internal utilities for development. Don't try to make sense out of it.").css("font-style", "italic"))
            , {
              placement: "right",
              hideOnClick: false
            })
        : undefined
      ,
      spacer(),
      this.app.in_alt1 ? undefined :

        new MenuButton("Alt1", "assets/icons/ribbon_alt1.png")
          .onClick(() => {
            new Alt1Modal().show()
          })
          .setActive(true)
          .addTippy(
            new Properties().header("Alt 1")
              .row(c().text("Shows instructions how to add Clue Trainer to Alt1.").css("font-style", "italic"))
            , {
              placement: "right",
              hideOnClick: false
            }),
      new MenuButton("Guide", "assets/icons/ribbon_osh.png")
        .onClick(() => ClueTrainerWiki.open()
        )
        .setActive(true)
        .addTippy(
          new Properties().header("Cluepedia")
            .row(c().text("Cluepedia is a mini wiki included with Clue Trainer that contains guides and explanations of clue mechanics.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          }),
      this.settings_button = new MenuButton("Settings", "assets/icons/ribbon_options.webp").onClick(() => {
          new SettingsModal().do()
        })
        .setActive(true)
        .addTippy(
          new Properties().header("Settings")
            .row(c().text("Access settings.").css("font-style", "italic"))
          , {
            placement: "right",
            hideOnClick: false
          }),
      new MenuButton("About", "assets/icons/ribbon_about.webp")
        .setActive(true)
        .onClick(() => [
          new AboutModal().show()
        ]),
      c().append(
        c(`<a href="https://github.com/Leridon/cluetrainer" target="_blank"> <img class="ctr-clickable" height="15px" style="padding: 0 2px" src="assets/icons/github-mark-white.png"></a>`),
        c(`<a href="https://ko-fi.com/I2I4XY829" target="_blank"><img class="ctr-clickable" height="15px" src="assets/icons/kofi.webp"></a>`),
        //c(`<a href="https://discord.gg/cluechasers" target="_blank"> <img class="ctr-clickable" height="16px" style="padding: 0 2px" src="assets/icons/cluechasers.png"></a>`),
      ),
      c().append(
      )
    )

    this.updateState()

    // Solving (Clue Icon)
    // Method Editor (including overview map)
    // Path Editor  (Path Icon)
    // Shortcut Editor (Shortcut Icon)

    // Settings
  }

  switchToTab(tab: MainTabControl.Tab) {
    if (tab == this.active_tab.value()) return

    switch (tab) {
      case "map":
        this.app.main_behaviour.set(new SimpleMapBehaviour(this.app))
        break;
      case "solve":
        this.app.main_behaviour.set(new NeoSolvingBehaviour(this.app, false))
        break;
      case "tetracompass":
        this.app.main_behaviour.set(new NeoSolvingBehaviour(this.app, true))
        break;
      case "create":
        this.app.main_behaviour.set(new TheoryCrafter(this.app))
        break;
      case "pathedit":
        this.app.main_behaviour.set(new PathEditor(new GameLayer().addTo(this.app.map), this.app.template_resolver, {initial: []}, true))
        break;
      case "utility":
        this.app.main_behaviour.set(new MapUtilityBehaviour(this.app))
        break;
    }

    this.active_tab.set(tab)

    this.updateState()
  }

  updateState() {
    const active_tab = this.active_tab.value()

    this.solve_button?.setActive(active_tab == "solve")
    this.map_button?.setActive(active_tab == "map")
    this.create_button?.setActive(active_tab == "create")
    this.paths_button?.setActive(active_tab == "pathedit")
    this.utility_button?.setActive(active_tab == "utility")
    this.tetracompass_button?.setActive(active_tab == "tetracompass")
  }

  setCollapsed(v: boolean) {
    if (v) this.container.animate({"width": "hide"}, 0)
    else this.container.animate({"width": "show"}, 0)
  }
}

export namespace MainTabControl {
  export type Tab = "map" | "solve" | "create" | "pathedit" | "utility" | "tetracompass"
}