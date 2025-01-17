import {lazy} from "../properties/Lazy";
import {Alt1MouseTracking} from "./Alt1MouseTracking";
import {Alt1MainHotkeyEvent} from "./Alt1MainHotkeyEvent";
import {Alt1ContextMenuDetection} from "./Alt1ContextMenuDetection";

export class Alt1 {
  public readonly mouse_tracking = new Alt1MouseTracking()
  public readonly main_hotkey = new Alt1MainHotkeyEvent()
  public readonly context_menu = new Alt1ContextMenuDetection()

  private static _instance = lazy(() => new Alt1())

  public static instance(): Alt1 {
    return this._instance.get()
  }
}