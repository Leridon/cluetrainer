import {storage} from "lib/util/storage";
import {TemplateResolver} from "lib/util/TemplateResolver";
import {ClueTier, ClueType} from "lib/runescape/clues";
import {GameMap, GameMapWidget} from "lib/gamemap/GameMap";
import {QueryLinks} from "trainer/query_functions";
import {Path} from "lib/runescape/pathing";
import {ExportImport} from "lib/util/exportString";
import {TileRectangle} from "lib/runescape/coordinates/TileRectangle";
import Behaviour, {SingleBehaviour} from "lib/ui/Behaviour";
import {SolvingMethods} from "./model/methods";
import {GameLayer} from "../lib/gamemap/GameLayer";
import MainTabControl from "./ui/MainTabControl";
import Widget from "../lib/ui/Widget";
import {MethodPackManager} from "./model/MethodPackManager";
import {C} from "../lib/ui/constructors";
import {Observable, observe} from "../lib/reactive";
import {FavoriteIndex} from "./favorites";
import Dependencies from "./dependencies";
import {Transportation} from "../lib/runescape/transportation";
import * as jquery from "jquery";
import * as lodash from "lodash";
import {Settings} from "./ui/settings/Settings";
import * as assert from "assert";
import {TextRendering} from "./ui/TextRendering";
import {TransportData} from "../data/transports";
import {PathGraphics} from "./ui/path_graphics";
import {CrowdSourcing} from "./CrowdSourcing";
import {Notification, NotificationBar} from "./ui/NotificationBar";
import {Log} from "../lib/util/Log";
import {Changelog} from "./ChangeLog";
import {DevelopmentModal} from "../devtools/DevelopmentMenu";
import {LogViewer} from "../devtools/LogViewer";
import {NisModal} from "../lib/ui/NisModal";
import {BigNisButton} from "./ui/widgets/BigNisButton";
import Properties from "./ui/widgets/Properties";
import {DataExport} from "./DataExport";
import {BookmarkStorage} from "./ui/pathedit/BookmarkStorage";
import {FormModal} from "../lib/ui/controls/FormModal";
import {Alt1Modal} from "./Alt1Modal";
import {List} from "../lib/ui/List";
import {ClickToCopy} from "../lib/ui/ClickToCopy";
import {ChatReader} from "../lib/alt1/readers/ChatReader";
import {MinimapReader} from "../lib/alt1/readers/MinimapReader";
import {ScreenCaptureService} from "../lib/alt1/capture";
import {SectionMemory} from "./ui/neosolving/PathControl";
import ActiveTeleportCustomization = Transportation.TeleportGroup.ActiveTeleportCustomization;
import TeleportSettings = Settings.TeleportSettings;
import inlineimg = C.inlineimg;
import render_digspot = TextRendering.render_digspot;
import render_scanregion = TextRendering.render_scanregion;
import resolveTeleport = TransportData.resolveTeleport;
import npc = C.npc;
import staticentity = C.staticentity;
import entity = C.entity;
import notification = Notification.notification;
import log = Log.log;
import img = C.img;

class PermissionChecker extends NisModal {
  constructor() {
    super({disable_close_button: true, fixed: true});

    this.title.set("Missing Permissions")
  }

  render() {
    super.render();

    const props = new Properties().appendTo(this.body)

    props.paragraph("Clue Trainer is missing permissions that are essential for it to function. Please grant the necessary permissions and then check again by clicking the button on the bottom of this modal.")

    props.header("How to set permissions")

    props.paragraph("Open Clue Trainer settings by clicking the small wrench on the top left, next to the buttons to minimize or close the window.")

    props.row(img("media/how_to_set_permissions_1.png"))

    props.paragraph("Make sure all permissions are checked.")

    props.row(img("media/how_to_set_permissions_2.png"))

    props.paragraph("Click 'Check' below to check if permissions have correctly been set.")
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Ignore", "cancel")
        .onClick(() => {
          notification("Please be aware that Clue Trainer will not work without granting the permissions.", "error").show()
          this.remove()
        }),
      new BigNisButton("Check", "confirm")
        .onClick(() => {
          if (!alt1) this.remove()
          else {
            if (alt1.permissionPixel && alt1.permissionOverlay && alt1.permissionGameState) {
              notification("Success! Permissions are fine now", "information").show()
              this.remove()
            } else {
              notification("Clue Trainer is still missing permissions.", "error").show()
            }
          }
        })
    ]
  }
}

namespace PermissionChecker {
  export function arePermissionsFine(): boolean {
    return alt1.permissionPixel && alt1.permissionOverlay && alt1.permissionGameState
  }

  export function check() {
    if (alt1.permissionInstalled && !arePermissionsFine()) new PermissionChecker().show()
  }
}

export class SimpleLayerBehaviour extends Behaviour {
  constructor(private map: GameMap, private layer: GameLayer) {
    super();
  }

  protected begin() {
    this.map.addGameLayer(this.layer)
  }

  protected end() {
    this.layer.remove()
  }
}

export namespace ScanTrainerCommands {
  import Command = QueryLinks.Command;
  import ScanTreeMethod = SolvingMethods.ScanTreeMethod;

  export const load_path: Command<{
    steps: Path.raw,
    target?: TileRectangle,
    start_state?: Path.movement_state
  }> = {
    name: "load_path",
    parser: {
      steps: ExportImport.imp<Path.Step[]>({expected_type: "path", expected_version: 0}), // import is idempotent if it's not a serialized payload string
    },
    default: {},
    serializer: {},
    instantiate: (arg: {
      steps: Path.raw,
      target?: TileRectangle,
      start_state?: Path.movement_state
    }) => (app: ClueTrainer): void => {
      // TODO: Fix the PathEditor behaviour stuff

      /*
      new PathEditor(app.map.map).start().load(arg.steps, {
          commit_handler: null,
          discard_handler: () => {
          },
          target: arg.target,
          start_state: arg.start_state
      })*/
    },
  }

  export const load_overview: Command<{
    tiers: ClueTier[],
    types: ClueType[]
  }> = {
    name: "load_overview",
    parser: {
      tiers: (s: string) => s.split(",").map(t => t == "null" ? null : t) as ClueTier[],
      types: (s: string) => s.split(",") as ClueType[]
    },
    default: {
      tiers: ["easy", "medium", "hard", "elite", "master", null],
      types: ["anagram", "compass", "coordinates", "cryptic", "emote", "map", "scan", "simple", "skilling"]
    },
    serializer: {
      tiers: (tiers: ClueTier[]) => tiers.join(","),
      types: (tiers: ClueType[]) => tiers.join(",")
    },
    instantiate: ({tiers, types}) => (app: ClueTrainer): void => {
      //TODO app.main_behaviour.set(new SimpleLayerBehaviour(app.map, new OverviewLayer(clues.filter(c => tiers.indexOf(c.tier) >= 0 && types.indexOf(c.type) >= 0), app)))
    },
  }

  export const load_method: Command<{
    method: ScanTreeMethod
  }> = {
    name: "load_method",
    parser: {
      // method: (a) => imp<ScanTree.ScanTreeMethod>({expected_type: "scantree", expected_version: 0})(a)
    },
    default: {},
    serializer: {
      // method: (a) => exp({type: "scantree", version: 0}, true, true)(a)
    },
    instantiate: ({method}) => (app: ClueTrainer): void => {
      //let resolved = resolve(method)
      //let resolved = withClue(method, app.data.clues.byId(method.clue_id) as ScanStep)

      //app.showMethod(resolved)
    },
  }


  export const index = [
    load_path, load_overview, load_method
  ]
}

const DEBUG_SIMULATE_INALT1 = false

export class SettingsManagement {
  public readonly storage = new storage.Variable<Settings.Settings>("preferences/settings", () => null)

  settings: Settings.Settings
  observable_settings: Observable.Simple<Settings.Settings> = observe<Settings.Settings>(null).equality(lodash.isEqual)

  observable = {
    scans: this.observable_settings.map(s => s?.solving?.scans).structuralEquality()
  }

  active_teleport_customization: Observable<ActiveTeleportCustomization> = observe(null).equality(lodash.isEqual)

  constructor() {
    this.observable_settings.subscribe(v => {
      this.settings = v
      this.storage.set(v)
      this.active_teleport_customization.set(TeleportSettings.inferActiveCustomization(v.teleport_customization))
    })

    // Normalize on first load to prevent migration issues
    this.set(Settings.normalize(this.storage.get()))
  }

  set(settings: Settings.Settings) {
    this.observable_settings.set(settings)
  }

  update(f: (_: Settings.Settings) => void) {
    const clone = lodash.cloneDeep(this.settings)
    f(clone)
    this.set(clone)
  }
}

class UpdateAlt1Modal extends FormModal<number> {
  constructor(private app: ClueTrainer) {super();}

  render() {
    super.render();

    this.setTitle("You should update your Alt 1")

    const layout = new Properties().appendTo(this.body)

    layout.paragraph("You are currently on the outdated Alt 1 version 1.5.6. The newest version is 1.6.0. This can potentially lead to issues while using Clue Trainer and other plugins. For example, you will notice that Clue Trainer will re-download databases for slider puzzles on every session instead of caching them locally. Other possible issues include performance problems or crashes.")

    layout.paragraph("Unfortunately, at the current time you can not automatically update from 1.5.6 to 1.6.0. To update manually, you will need to follow these steps:")

    layout.row(
      new List(true)
        .item("Backup any important data. Unfortunately you will lose all of your local data and settings, as well as all installed third party plugins such as Clue Trainer. Make a backup of everything that's possible to backup. See below to export Clue Trainer data and also remember to save your custom AfkWarden presets!",
          new List(false)
            .item("Alt 1 stores installed apps and their data in ",
              new ClickToCopy("%localappdata%/alt1toolkit"),
              ". Backup the ",
              new ClickToCopy("config.json"),
              " file and the ",
              new ClickToCopy("chromecache"),
              " folder to easily save all of your data."
            )
        )
        .item("Uninstall your current Alt 1 version.")
        .item("Download the current Alt 1 installer from <a href='https://runeapps.org/alt1'>https://runeapps.org</a>. This is the only official source of Alt 1!")
        .item("Install the downloaded version of Alt 1. Make sure that your game is closed while you do it or the setup will fail!")
        .item("Install any required third party plugins such as Clue Trainer and restore your data backups.")
    )

    layout.divider()

    layout.paragraph("You can save your Clue Trainer data before you update by clicking the button below. On the new version, please visit the 'Data' page in settings to restore your data.")

    layout.row(new BigNisButton("Export Data", "confirm").onClick(() => this.app.data_dump.dump()))
  }

  protected getValueForCancel(): number {
    return null
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Remind me another time", "confirm")
        .onClick(() => this.confirm(21 * 24 * 60 * 60 * 1000))
    ]
  }

}

namespace UpdateAlt1Modal {
  const earliest_reminder_time = new storage.Variable<number>("preferences/dontremindtoupdatealt1until", () => null)

  export async function maybeRemind(app: ClueTrainer) {
    if (window.alt1?.permissionInstalled && alt1.version == "1.5.6") {
      if (earliest_reminder_time.get() < Date.now()) {
        const reminder = await new UpdateAlt1Modal(app).do()

        if (reminder != null) {
          earliest_reminder_time.set(Date.now() + reminder)
        }
      }
    }
  }
}

class MigrateToCluetrainerAppDomain extends FormModal<number> {
  constructor(private app: ClueTrainer) {super();}

  render() {
    super.render();

    this.setTitle("Please Migrate")

    const layout = new Properties().appendTo(this.body)

    let first_paragraph = ""

    if (this.app.in_alt1) {
      first_paragraph += "Your installation of Clue Trainer is still using 'leridon.github.io/rs3scantrainer'. "
    } else {
      first_paragraph += "You are currently on leridon.github.io/rs3scantrainer. "
    }

    first_paragraph += "This version of Clue Trainer is hosted using GitHub pages on the Clue Trainer repository, which is currently blocking me from renaming the repository to something more fitting of the current state. When the rename happens, your current installation of Clue Trainer will stop to work."

    layout.paragraph(first_paragraph)

    layout.paragraph(
      `Clue Trainer has been available on the custom domain <a href="https://cluetrainer.app">cluetrainer.app</a> since June 6th. Please migrate to that URL before 2024-10-31, at which point the repository will be renamed and Clue Trainer becoming unavailable on the 'leridon.github.io/rs3scantrainer' URL without further notice. Please also take note of the option to export your current data/settings to make migration less painful.`
    )

    layout.paragraph(C.bold(`You have ${MigrateToCluetrainerAppDomain.daysLeft()} days left to migrate.`))

    if (this.app.in_alt1) {
      layout.row(
        new BigNisButton("Install cluetrainer.app", "confirm").onClick(() => new Alt1Modal("https://cluetrainer.app").show())
      )
    }

    layout.divider()

    layout.paragraph("If you have any relevant local data or settings on this URL, you can export all of your data using the button below. On the new version, please visit the 'Data' page in settings to restore your data.")

    layout.row(new BigNisButton("Export Data", "confirm").onClick(() => this.app.data_dump.dump()))
  }

  protected getValueForCancel(): number {
    return null
  }

  getButtons(): BigNisButton[] {
    const daysleft = MigrateToCluetrainerAppDomain.daysLeft()

    if (daysleft >= 14) {
      return [
        new BigNisButton("Remind me in a week", "confirm")
          .onClick(() => this.confirm(6 * 24 * 60 * 60 * 1000))
      ]
    } else {
      return [
        new BigNisButton("Remind me tomorrow", "confirm")
          .onClick(() => this.confirm(1 * 24 * 60 * 60 * 1000))
      ]
    }
  }
}

namespace MigrateToCluetrainerAppDomain {
  export const deadline = new Date(2024, 9, 31)

  export function daysLeft(): number {
    const now = Date.now()

    const DAY = 24 * 60 * 60 * 1000

    return Math.max(0, Math.floor((deadline.getTime() - now) / DAY))
  }
}

export class ClueTrainer extends Behaviour {
  crowdsourcing: CrowdSourcing = new CrowdSourcing(this, "https://api.cluetrainer.app")

  settings = new SettingsManagement()

  in_alt1: boolean = !!window.alt1?.permissionInstalled || DEBUG_SIMULATE_INALT1
  in_dev_mode = !!process.env.DEV_MODE

  menu_bar: MainTabControl
  main_content: Widget = null
  map_widget: GameMapWidget
  map: GameMap

  favourites: FavoriteIndex

  main_behaviour = this.withSub(new SingleBehaviour())

  template_resolver = new TemplateResolver(
    {name: "surge", apply: () => [{type: "domelement", value: inlineimg('assets/icons/surge.png')}]},
    {name: "dive", apply: () => [{type: "domelement", value: inlineimg('assets/icons/dive.png')}]},
    {name: "surgedive", apply: () => [{type: "domelement", value: inlineimg('assets/icons/surgedive.png')}]},
    {name: "bladeddive", apply: () => [{type: "domelement", value: inlineimg('assets/icons/bladeddive.png')}]},
    {name: "escape", apply: () => [{type: "domelement", value: inlineimg('assets/icons/escape.png')}]},
    {name: "barge", apply: () => [{type: "domelement", value: inlineimg('assets/icons/barge.png')}]},
    {
      name: "digspot", apply: ([arg0]) => {
        assert(arg0.type == "safestring")

        return [{type: "domelement", value: render_digspot(arg0.value)}]
      }
    }, {
      name: "scanarea", apply: ([arg0]) => {
        assert(arg0.type == "safestring")

        return [{type: "domelement", value: render_scanregion(arg0.value)}]
      }
    }, {
      name: "teleport", apply: ([groupid, spotid]) => {
        assert(groupid.type == "safestring")
        assert(spotid.type == "safestring")

        let tele = resolveTeleport({group: groupid.value, spot: spotid.value})

        if (!tele) return [{type: "safestring", value: "NULL"}]

        return [{type: "domelement", value: PathGraphics.Teleport.asSpan(tele)}]
      }
    }, {
      name: "icon", apply: ([icon_url]) => {
        assert(icon_url.type == "safestring")

        return [{type: "domelement", value: inlineimg(`assets/icons/${icon_url.value}.png`)}]
      }
    }, {
      name: "npc", apply: ([npc_name]) => {
        assert(npc_name.type == "safestring")

        return [{type: "domelement", value: npc(npc_name.value)}]
      }
    }, {
      name: "object", apply: ([npc_name]) => {
        assert(npc_name.type == "safestring")

        return [{type: "domelement", value: staticentity(npc_name.value)}]
      }
    }, {
      name: "item", apply: ([npc_name]) => {
        assert(npc_name.type == "safestring")

        return [{type: "domelement", value: entity({kind: "item", name: npc_name.value})}]
      }
    }
  )

  readonly version: number = Changelog.latest_patch.version

  data_dump: DataExport

  private startup_settings_storage = new storage.Variable<ClueTrainer.Preferences>("preferences/startupsettings", () => ({}))
  startup_settings = observe(this.startup_settings_storage.get())

  notifications: NotificationBar

  capture_service: ScreenCaptureService = new ScreenCaptureService()
  chatreader: ChatReader = new ChatReader(this.capture_service)
  minimapreader: MinimapReader = new MinimapReader(this.capture_service)

  constructor() {
    super()

    this.favourites = new FavoriteIndex(MethodPackManager.instance())

    this.data_dump = new DataExport("cluetrainer", this.version, DataExport.createSpec(
      this.settings.storage,
      MethodPackManager.instance().local_pack_store,
      this.favourites.data,
      BookmarkStorage.persistance,
      SectionMemory.instance().data
    ))

    if (this.in_dev_mode) {
      log().log("In development mode")
    }

    //this.capture_service.run()
    //this.chatreader.run()
    this.chatreader/*.subscribe({
      options: () => ({interval: CaptureInterval.fromApproximateInterval(300)})
    })*/
    this.minimapreader//.registerInterest(true)
  }

  protected async begin() {
    let container = Widget.wrap(jquery("#main-content"))

    this.startup_settings.subscribe(s => this.startup_settings_storage.set(s))

    let map_widget: Widget

    this.notifications = NotificationBar.instance().appendTo(jquery("body"))

    container.append(
      this.menu_bar = new MainTabControl(this),
      this.main_content = c("<div style='display: flex; height: 100%; flex-grow: 1'></div>")
        .append(map_widget = c("<div style='flex-grow: 1; height: 100%'></div>"))
    )

    this.map_widget = new GameMapWidget(map_widget.container)
    this.map = this.map_widget.map

    this.menu_bar.switchToTab(this.in_alt1 ? "solve" : "solve")

    /*
    if (this.mode() == "preview") {
      if (!this.startup_settings.value().hide_preview_notice) {
        notification("Preview Notice: Clue Trainer is actively in development and currently incomplete.")
          .setDuration(null)
          .addButton("Don't show again", (not) => {
            this.startup_settings.update(s => s.hide_preview_notice = true)
            not.dismiss()
          }).show()
      }
    }

    if (!this.in_alt1 && !this.startup_settings.value().dont_recommend_alt1) {
      notification("Clue Trainer is an Alt1 plugin and has clue-solving features when installed.")
        .setDuration(null)
        .addButton(C.text_link("Click here to install", () => new Alt1Modal().show()))
        .addButton("Don't show again", (not) => {
          this.startup_settings.update(s => s.dont_recommend_alt1 = true)
          not.dismiss()
        }).show()
    }*/

    const is_first_visit = this.startup_settings.value().last_loaded_version == null

    if (is_first_visit && this.in_alt1) {
      (new class extends NisModal {

        render() {
          super.render();

          this.title.set("Welcome to Clue Trainer")

          const layout = new Properties().appendTo(this.body)
          layout.paragraph("You have successfully installed Clue Trainer! If you want, check out the video tutorial made by <b>Ngis</b> embedded below. It teaches you how to setup Clue Trainer according to your preferences and how its solving features are used. For additional info, open the 'About' page linked in the left sidebar.")

          layout.row(c("<iframe width=\"560\" height=\"315\" src=\"https://www.youtube-nocookie.com/embed/EGDHM4USIp8?si=YLcuCoqZnAUAjI8s\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>"))
        }

        getButtons(): BigNisButton[] {
          return [
            new BigNisButton("Dismiss", "cancel").onClick(() => this.hide())
          ]
        }
      }).show()
    }

    if (!is_first_visit && this.startup_settings.value().last_loaded_version != Changelog.latest_patch.version) {
      const unseen_updates = Changelog.log.filter(e => e.version > this.startup_settings.value().last_loaded_version)

      const notify_at_all = lodash.some(unseen_updates, e => !e.silent)

      if (notify_at_all) {
        const notifyable_update = lodash.findLast(unseen_updates, e => !!e.notification)

        notification(notifyable_update?.notification ?? "There has been an update.")
          .setDuration(30000)
          .addButton("View patch notes", (not) => {
            new Changelog.Modal().show()
            not.dismiss()
          }).show()
      }
    }

    this.startup_settings.update(s => s.last_loaded_version = Changelog.latest_patch.version)

    //let query_function = QueryLinks.get_from_params(ScanTrainerCommands.index, new URLSearchParams(window.location.search))
    //if (query_function) query_function(this)

    document.body.addEventListener("keydown", e => {
      if (e.key == "F6") {
        log().log("Log exported")

        LogViewer.do(log().get())

        /*ExportStringModal.do(
          log().toString(),
          "",
          `cluetrainerlog${Date.now()}.txt`
        )*/
      }

      if (e.key == "F4") {
        new DevelopmentModal().show()
      }
    })

    log().log(`Clue Trainer v${Changelog.latest_patch.version} started`)

    if (globalThis.alt1) {
      log().log(`Alt 1 version detected: ${alt1.version}`)
      log().log(`Active capture mode: ${alt1.captureMethod}`)
      log().log(`Permissions: Installed ${alt1.permissionInstalled}, GameState ${alt1.permissionGameState}, Pixel ${alt1.permissionPixel}, Overlay ${alt1.permissionOverlay}`)
      log().log("Settings on startup", "Startup", {type: "object", value: lodash.cloneDeep(this.settings.settings)})

      PermissionChecker.check()
    }

    UpdateAlt1Modal.maybeRemind(this)

    if (window.location.host == "leridon.github.io" && window.location.pathname.startsWith("/rs3scantrainer")) {
      const next_notice = this.startup_settings.value().earliest_next_cluetrainer_dot_app_migration_notice

      if (!next_notice || next_notice < Date.now()) {
        const remind_later = await new MigrateToCluetrainerAppDomain(this).do()

        if (remind_later != null) {
          this.startup_settings.update(s => s.earliest_next_cluetrainer_dot_app_migration_notice = Date.now() + remind_later)
        }
      }
    }
  }

  protected end() {
  }
}

namespace ClueTrainer {
  export type Preferences = {
    last_loaded_version?: number,
    earliest_next_cluetrainer_dot_app_migration_notice?: number
  }
}

export function initialize() {
  let app = new ClueTrainer()
  Dependencies.instance().app = app
  app.start()
}