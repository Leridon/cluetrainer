import {storage} from "lib/util/storage";
import {TemplateResolver} from "lib/util/TemplateResolver";
import {GameMap, GameMapWidget} from "lib/gamemap/GameMap";
import {QueryLinks} from "cluetrainer/query_functions";
import Behaviour, {SingleBehaviour} from "lib/ui/Behaviour";
import MainTabControl from "./ui/MainTabControl";
import Widget from "../lib/ui/Widget";
import {MethodPackManager} from "./MethodPackManager";
import {C} from "../lib/ui/constructors";
import {Observable, observe} from "../lib/reactive";
import {FavoriteIndex} from "./favorites";
import Dependencies from "./dependencies";
import {Transportation} from "../lib/runescape/transportation";
import jquery from "jquery";
import lodash from "lodash";
import {Settings} from "./ui/settings/Settings";
import assert from "assert";
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
import {SectionMemory} from "./cluesolving/PathControl";
import {Alt1UpdateNotice} from "./startup_messages/Alt1UpdateNotice";
import {PermissionChecker} from "./startup_messages/PermissionChecker";
import {SuccessfullInstallationNotice} from "./startup_messages/SuccessfullInstallationNotice";
import {lazy} from "../lib/Lazy";
import {Alt1} from "../lib/alt1/Alt1";
import {ClueTrainerWiki} from "./wiki";
import {ChatReader} from "../lib/alt1/readers/ChatReader";
import {CaptureInterval} from "../lib/alt1/capture";
import {NisModal} from "../lib/ui/NisModal";
import {ClueTrainerMigrations} from "./migrations";
import {TileHighlight} from "../lib/gamemap/defaultlayers/TileHighlightLayer";
import {GameMapControl} from "../lib/gamemap/GameMapControl";
import {Angles} from "../lib/math/Angles";
import {CompassReader} from "./cluesolving/cluereader/CompassReader";
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
import div = C.div;

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
      this.save()
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

  save() {
    this.storage.set(this.settings)
    this.active_teleport_customization.set(TeleportSettings.inferActiveCustomization(this.settings.teleport_customization))
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
        build_type: environment.build_type ?? "development"
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
      (() => {
        switch (this.version.build_info?.build_type) {
          case "production":
            return "appconfig.json"
          case "development":
            return "appconfig.json"
          case "beta":
            return "appconfig.beta.json"
          case "openglbeta":
            return "appconfig.opengl.json"
        }
      })()

      alt1.identifyAppUrl(
        Changelog.Version.isBeta(this.version)
          ? "appconfig.beta.json"
          : "appconfig.json"
      );
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

      if (Alt1.exists()) {
        try {
          log().log(`Alt 1 version: ${Alt1.instance().raw.version}`)
          log().log(`Active capture mode: ${Alt1.instance().raw.captureMethod}`)
          log().log(`Permissions: ${Alt1.Permissions.toString(Alt1.instance().permissions())}`)
        } catch (e) {
          if (e instanceof Error) {
            log().log("Error while logging Alt 1 Info")
            log().log(e.toString())
            log().log(e.stack)
          } else {
            console.error(e.toString())
          }
        }
      } else {
        log().log(`Not in Alt1`)
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

      if (e.key == "F5") {
        window.location.reload()
      }

      if (e.key == "F6") {
        log().log("Log exported")

        logDiagnostics()

        if (Changelog.Version.isBeta(this.version)) await logScreen()

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
    log().log(`Environment: ${this.version.build_info?.build_type ?? "unknown"}`)

    logDiagnostics()

    if (Alt1.exists()) {
      PermissionChecker.check()
    }

    await Alt1UpdateNotice.maybeRemind(this)
    await ClueTrainerMigrations.run_migrations(this)

    if (Changelog.Version.isBeta(Changelog.log.latest_patch.version)) {
      notification(`You are on beta build ${Changelog.Version.asString(this.version)}. Please remember to switch back to the main branch when testing is done.`)
        .setDuration(null)
        .show()

      document.title = "Clue Trainer (Beta Branch)"
    }

    const query_function = QueryLinks.get_from_params(ClueTrainerCommands.index, new URLSearchParams(window.location.search))

    if (query_function) query_function()

    window.history.pushState({}, null, `${location.protocol}//${location.host}`)

    if (Alt1.exists() && ChatReader.instance().debug_mode) {
      ChatReader.instance().subscribe({
        options: () => ({
          interval: CaptureInterval.fromApproximateInterval(300)
        })
      })
    }

    if (this.version.build_info?.build_type != "openglbeta") {
      Alt1.instance().featureGL()
    }

    if (this.version.build_info?.build_type == "openglbeta" || (Alt1.exists() && Alt1.instance().featureGL())) {
      (new class extends NisModal {
        override render() {
          super.render();

          this.title.set("Clue Trainer OpenGL Beta")

          this.body.append(`
            <p>Welcome to the closed beta of Clue Trainer's OpenGL features with Alt1 1.7.0. <b>Please read the following carefully.</b></p>
            <p>Alt1 1.7.0 introduces a new OpenGL Api that allows plugins to do two things: 1. read more detailled game information by intercepting commands RuneScape sends to the GPU, and 2. render 3d overlays such as tile markers directly into the game by sending their own GPU commands. When fully implemented Clue Trainer can use these features to render paths ingame, and automatically read your position, more accurate compass angles, as well as the pulse type in scan clues.</p>
            <p>Both Alt1 1.7.0 and Clue Trainer's OpenGL features are <b>USE AT YOUR OWN RISK</b> in all regards. We are confident that using either is not a bannable offense, but we cannot predict Jagex's stance on this.</p>
            <p>Both the new API itself and Clue Trainer's usage of it can and will be unstable: Expect lag spikes, game and maybe even device crashes, and bugs. Always remember that this is a closed beta of highly experimental features. We are not responsible for any damage caused, both in and outside of the game.</p>
            <p>At the point of writing this, only ingame path rendering is fully implemented and usable. Credits for a significant of the work done so far go to @Spare.</p>
            <p>To activate the features, you need to do the following:</p>
            <ul>
                <li>Be on at least Alt1 1.7.0: (Current ${Alt1.exists() ? Alt1.instance().raw.version : "Not in Alt1"})</li>
                <li>Enable the experimental OpenGL API in the Alt1 settings ("Other" tab): (Current Unknown)</li>
                <li>Switch the Alt1 capture mode to GPU Integrated: (Current ${Alt1.exists() ? (Alt1.instance().raw.captureMethod == "Alt1Gl" ? "GPU Integrated" : Alt1.instance().raw.captureMethod) : "Not in Alt1"})</li>
                <li>Grant Clue Trainer the GPU Api permission: (Current ${Alt1.exists() ? (Alt1.instance().permissions().gl_api ? "Granted" : "Missing") : "Not in Alt1"})</li>
                <li>Restart both Alt1 and the Game.</li>
            </ul>
            `)
        }
      }).show()

      const position_highlight = new TileHighlight({x: 0, y: 0}, "#0929ce")

      this.map.addLayer(position_highlight)

      const status_widget = new GameMapControl({position: "bottom-left", type: "gapless"}, div())

      this.map.addLayer(status_widget)

      /*
      PlayerStateTracking.instance().framed_state.subscribe(state => {
        if (state.value.position) {
          position_highlight.setPosition(state.value.position.tile)
        }

        let text = ""

        if (state.value.pulse_type != null) {
          text += `Pulse: ${state.value.pulse_type}`
        }
        if (state.value.compass_angle != null) {
          text += `Angle: ${UncertainAngle.toString(state.value.compass_angle.angle)}`
        }

        status_widget.content.text(text)

        console.log(state)
      })*/
    }
  }

  protected end() {
  }
}

export namespace ClueTrainer {

  export type BuildEnvironment = {
    commit_sha: string,
    build_timestamp: number,
    build_type: Changelog.Version.BuildType
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