import {storage} from "lib/util/storage";
import {TemplateResolver} from "lib/util/TemplateResolver";
import {GameMap, GameMapWidget} from "lib/gamemap/GameMap";
import {QueryLinks} from "trainer/query_functions";
import Behaviour, {SingleBehaviour} from "lib/ui/Behaviour";
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
import {DataExport} from "./DataExport";
import {BookmarkStorage} from "./pathedit/BookmarkStorage";
import {SectionMemory} from "./ui/neosolving/PathControl";
import {Alt1UpdateNotice} from "./startup_messages/Alt1UpdateNotice";
import {ClueTrainerAppMigrationNotice} from "./startup_messages/ClueTrainerAppMigrationNotice";
import {PermissionChecker} from "./startup_messages/PermissionChecker";
import {SuccessfullInstallationNotice} from "./startup_messages/SuccessfullInstallationNotice";
import {lazy} from "../lib/Lazy";
import {Alt1} from "../lib/alt1/Alt1";
import {ClueTrainerWiki} from "./wiki";
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

declare global {
  var cluetrainer_build_environment: ClueTrainer.BuildEnvironment
}

export namespace ClueTrainerCommands {
  export const wiki_command: QueryLinks.Command<{ page: ClueTrainerWiki.page_id }> = {
    name: "wiki",
    default: {},
    instantiate: (arg: { page: ClueTrainerWiki.page_id }) => () => ClueTrainerWiki.openOnPage(arg.page),
    parser: {
      page: (s: string) => s as ClueTrainerWiki.page_id
    },
    serializer: {
      page: (page: ClueTrainerWiki.page_id) => page
    }
  }

  export const index = [
    wiki_command
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

export class ClueTrainer extends Behaviour {
  crowdsourcing: CrowdSourcing = new CrowdSourcing(this, "https://api.cluetrainer.app")

  settings = new SettingsManagement()

  in_alt1: boolean = !!window.alt1?.permissionInstalled || DEBUG_SIMULATE_INALT1

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

  readonly version: Changelog.Version = Changelog.log.latest_patch.version

  data_dump: DataExport

  private startup_settings_storage = new storage.Variable<ClueTrainer.Preferences>("preferences/startupsettings", () => ({}))
  startup_settings = observe(this.startup_settings_storage.get())

  constructor() {
    super()

    this.favourites = new FavoriteIndex(MethodPackManager.instance())

    this.data_dump = new DataExport("cluetrainer", this.version.version, DataExport.createSpec(
      this.settings.storage,
      MethodPackManager.instance().local_pack_store,
      this.favourites.data,
      BookmarkStorage.persistance,
      SectionMemory.instance().data
    ))
  }

  protected async begin() {

    const environment = cluetrainer_build_environment

    if (environment) {
      Changelog.log.latest_patch.version.build_info = {
        commit_sha: environment.commit_sha,
        build_timestamp: new Date(environment.build_timestamp),
        is_beta_build: environment.is_beta_build ?? false
      }
    }


    this.startup_settings.subscribe(s => this.startup_settings_storage.set(s))

    NotificationBar.instance().appendTo(jquery("body"))

    const map_widget: Widget = c("<div style='flex-grow: 1; height: 100%'></div>")

    this.menu_bar = new MainTabControl(this)
    this.main_content = c("<div style='display: flex; height: 100%; flex-grow: 1'></div>").append(map_widget)

    Widget.wrap(jquery("#main-content")).append(
      this.menu_bar,
      this.main_content
    )

    this.map_widget = new GameMapWidget(map_widget.container)
    this.map = this.map_widget.map

    this.menu_bar.switchToTab(this.in_alt1 ? "solve" : "solve")

    if (Alt1.exists()) {
      alt1.identifyAppUrl("appconfig.json");
    }

    const is_first_visit = this.startup_settings.value().last_loaded_version == null

    if (is_first_visit && this.in_alt1) {
      new SuccessfullInstallationNotice().show()
    }

    if (!is_first_visit && this.startup_settings.value().last_loaded_version != Changelog.log.latest_patch.version) {
      const last_loaded_version = Changelog.Version.lift(this.startup_settings.value().last_loaded_version)

      const unseen_updates = Changelog.log.entries.filter(e => Changelog.Version.isNewerThan(e.version, last_loaded_version))

      const notify_at_all = lodash.some(unseen_updates, e => !e.silent)

      if (notify_at_all) {
        const notifyable_update = lodash.findLast(unseen_updates, e => !!e.notification)

        notification(notifyable_update?.notification ?? "There has been an update.")
          .setDuration(null)
          .addButton("View patch notes", (not) => {
            Changelog.log.showModal()
            not.dismiss()
          }).show()
      }
    }

    this.startup_settings.update(s => s.last_loaded_version = Changelog.log.latest_patch.version)

    const logDiagnostics = () => {
      log().log("Current settings", "General", {type: "object", value: lodash.cloneDeep(this.settings.settings)})

      if (globalThis.alt1) {
        try {
          log().log(`Alt 1 version: ${alt1.version}`)
          log().log(`Active capture mode: ${alt1.captureMethod}`)
          log().log(`Permissions: Installed ${alt1.permissionInstalled}, GameState ${alt1.permissionGameState}, Pixel ${alt1.permissionPixel}, Overlay ${alt1.permissionOverlay}`)
        } catch (e) {
          if (e instanceof Error) {
            log().log("Error while logging Alt 1 Info")
            log().log(e.toString())
            log().log(e.stack)
          } else {
            console.error(e.toString())
          }
        }
      }
    }

    document.body.addEventListener("keydown", async e => {
      function logScreen() {
        if (Alt1.exists()) {
          return Alt1.instance().capturing.captureOnce({options: {area: null, interval: null}}).then(img => {
            log().log("Screenshot", "Screenshot", img.value.getData())
            notification("Screenshot added to log", "information").show()
          })
        }
      }

      if (e.key == "F6") {
        log().log("Log exported")

        logDiagnostics()

        if (this.version.build_info?.is_beta_build) await logScreen()

        LogViewer.do(log().get())
      }

      if (e.key == "F7") {
        await logScreen()
      }

      if (e.key == "F4") {
        new DevelopmentModal().show()
      }
    })

    log().log(`Version: ${Changelog.Version.asString(this.version)}`)
    log().log(`Build: ${this.version.build_info?.commit_sha ?? "Unavailable"}`)
    if (this.version.build_info?.build_timestamp) {
      log().log(`Build Timestamp: ${this.version.build_info.build_timestamp.toUTCString()}`)
    } else {
      log().log(`Build Timestamp: Unavailable`)
    }
    log().log(`Beta: ${this.version.build_info?.is_beta_build ?? false}`)

    logDiagnostics()

    if (Alt1.exists()) {
      PermissionChecker.check()
    }

    Alt1UpdateNotice.maybeRemind(this)
    ClueTrainerAppMigrationNotice.maybeRemind(this)

    if (Changelog.log.latest_patch.version.build_info?.is_beta_build) {
      notification(`You are on beta build ${Changelog.Version.asString(this.version)}. Please remember to switch back to the main branch when testing is done.`)
        .setDuration(null)
        .show()

      document.title = "Clue Trainer (Beta Branch)"
    }

    const query_function = QueryLinks.get_from_params(ClueTrainerCommands.index, new URLSearchParams(window.location.search))

    if (query_function) query_function()

    window.history.pushState({}, null, `${location.protocol}//${location.host}`)
  }

  protected end() {
  }
}

export namespace ClueTrainer {

  export type BuildEnvironment = {
    is_beta_build: boolean,
    commit_sha: string,
    build_timestamp: number,
  }

  export type Preferences = {
    last_loaded_version?: number | Changelog.Version,
    earliest_next_cluetrainer_dot_app_migration_notice?: number
  }

  const _instance = lazy(() => Dependencies.instance().app = new ClueTrainer())

  export function instance() {
    return _instance.get()
  }
}