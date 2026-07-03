import {lazy} from "../Lazy";
import {Alt1MouseTracking} from "./Alt1MouseTracking";
import {Alt1MainHotkeyEvent} from "./Alt1MainHotkeyEvent";
import {Alt1ContextMenuDetection} from "./Alt1ContextMenuDetection";
import * as a1lib from "alt1"
import {Vector2} from "../math";
import {Alt1TooltipManager} from "./Alt1TooltipManager";
import {Alt1ScreenCaptureService} from "./capture/Alt1ScreenCaptureService";
import {Alt1OverlayManager} from "./Alt1OverlayManager";
import {Alt1GLSession} from "./alt1gl/Alt1GLSession";
import {Log} from "../util/Log";
import log = Log.log;

export class Alt1 {
  public readonly raw: typeof globalThis.alt1 = globalThis.alt1

  private _alt1gl_disabled: boolean = false

  public readonly mouse_tracking = new Alt1MouseTracking()
  public readonly main_hotkey = new Alt1MainHotkeyEvent()
  public readonly context_menu = new Alt1ContextMenuDetection()
  public readonly tooltips = new Alt1TooltipManager()
  public readonly capturing = new Alt1ScreenCaptureService()
  public readonly overlays = new Alt1OverlayManager()
  private _opengl = this.featureGL() ? new Alt1GLSession(this) : undefined

  private static _instance = lazy(() => new Alt1())

  private constructor() {
    if (this.featureGL()) {
      this.raw?.on("log", e => log().log(e.message, "Alt1"))
    }
  }

  public static instance(): Alt1 {
    return this._instance.get()
  }

  public disableGLApi(): void {
    this._alt1gl_disabled = true

    this._opengl?.forceClose()
    this._opengl = undefined
  }

  public featureGL(): boolean {
    return !this._alt1gl_disabled && this.raw?.permissionGLApi != undefined
  }

  public opengl(): Alt1GLSession {
    return this._opengl
  }

  public permissions(): Alt1.Permissions {
    return {
      installed: alt1.permissionInstalled,
      overlays: alt1.permissionOverlay,
      screen_capture: alt1.permissionPixel,
      gamestate: alt1.permissionGameState,
      gl_api: alt1?.permissionGLApi ?? false,
      settings: alt1?.permissionSettings ?? false,
    }
  }
}

export namespace Alt1 {

  export type Permissions = {
    installed: boolean,
    overlays: boolean,
    screen_capture: boolean,
    gamestate: boolean,
    gl_api: boolean,
    settings: boolean
  }

  export namespace Permissions {
    export function toString(self: Permissions): string {
      return `Installer ${self.installed}, Overlays ${self.overlays}, Pixel ${self.screen_capture}, Gamestate ${self.gamestate}, Gl Api ${self.gl_api}, Settings ${self.settings}`
    }
  }

  export function exists(): boolean {
    return a1lib.hasAlt1 && !!alt1.identifyAppUrl
  }

  export function checkPermission(f: (_: Permissions) => boolean): boolean {
    if (!Alt1.exists()) return false

    return f(Alt1.instance().permissions())
  }

  export function clientSize(): Vector2 {
    return {x: alt1.rsWidth, y: alt1.rsHeight}
  }
}