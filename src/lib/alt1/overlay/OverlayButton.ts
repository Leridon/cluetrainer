import {Alt1Overlay} from "../Alt1Overlay";
import {ScreenRectangle} from "../ScreenRectangle";
import {OverlayGeometry} from "../OverlayGeometry";
import {Vector2} from "../../math";
import {Alt1MainHotkeyEvent} from "../Alt1MainHotkeyEvent";
import {Alt1} from "../Alt1";

export class OverlayButton extends Alt1Overlay {
  constructor(private config: {
    area: ScreenRectangle,
    text?: {
      text: string,

    }
  }) {
    super(true);

  }

  protected begin() {
    super.begin();

    Alt1.instance().main_hotkey.subscribe(10, event => {

    })
  }

  render(overlay: OverlayGeometry) {
  }

  checkHover(position: Vector2) {

  }

  checkClick(event: Alt1MainHotkeyEvent.Event) {

  }
}