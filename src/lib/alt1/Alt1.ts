import {lazy} from "../Lazy";
import {Alt1MouseTracking} from "./Alt1MouseTracking";
import {Alt1MainHotkeyEvent} from "./Alt1MainHotkeyEvent";
import {Alt1ContextMenuDetection} from "./Alt1ContextMenuDetection";
import * as a1lib from "alt1"
import {Vector2} from "../math";
import {Alt1TooltipManager} from "./Alt1TooltipManager";
import {Alt1ScreenCaptureService} from "./capture/Alt1ScreenCaptureService";
import {Alt1OverlayManager} from "./Alt1OverlayManager";

export class Alt1 {
  public readonly mouse_tracking = new Alt1MouseTracking()
  public readonly main_hotkey = new Alt1MainHotkeyEvent()
  public readonly context_menu = new Alt1ContextMenuDetection()
  public readonly tooltips = new Alt1TooltipManager()
  public readonly capturing = new Alt1ScreenCaptureService()
  public readonly overlays = new Alt1OverlayManager()

  private static _instance = lazy(() => new Alt1())

  public static instance(): Alt1 {
    return this._instance.get()
  }

  public permissions(): Alt1.Permissions {
    return {
      installed: alt1.permissionInstalled,
      overlays: alt1.permissionOverlay,
      screen_capture: alt1.permissionPixel,
      gamestate: alt1.permissionGameState,
    }
  }
}

export namespace Alt1 {

  export type Permissions = {
    installed: boolean,
    overlays: boolean,
    screen_capture: boolean,
    gamestate: boolean
  }

  export function exists(): boolean {
    return a1lib.hasAlt1
  }

  export function checkPermission(f: (_: Permissions) => boolean): boolean {
    if(!Alt1.exists()) return false

    return f(Alt1.instance().permissions())
  }

  export function clientSize(): Vector2 {
    return {x: alt1.rsWidth, y: alt1.rsHeight}
  }
}