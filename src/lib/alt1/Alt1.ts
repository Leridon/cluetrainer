import {lazy} from "../Lazy";
import {Alt1MouseTracking} from "./Alt1MouseTracking";
import {Alt1MainHotkeyEvent} from "./Alt1MainHotkeyEvent";
import {Alt1ContextMenuDetection} from "./Alt1ContextMenuDetection";
import * as a1lib from "alt1"
import {Vector2} from "../math";
import {Alt1TooltipManager} from "./Alt1TooltipManager";
import {Alt1ScreenCaptureService} from "./capture/Alt1ScreenCaptureService";

export class Alt1 {
  public readonly mouse_tracking = new Alt1MouseTracking()
  public readonly main_hotkey = new Alt1MainHotkeyEvent()
  public readonly context_menu = new Alt1ContextMenuDetection()
  public readonly tooltips = new Alt1TooltipManager()
  public readonly capturing = new Alt1ScreenCaptureService()

  private static _instance = lazy(() => new Alt1())

  public static instance(): Alt1 {
    return this._instance.get()
  }
}

export namespace Alt1 {
  export function exists(): boolean {
    return a1lib.hasAlt1
  }

  export function clientSize(): Vector2 {
    return {x: alt1.rsWidth, y: alt1.rsHeight}
  }
}