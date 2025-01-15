import {GameMapControl} from "lib/gamemap/GameMapControl";
import Widget from "lib/ui/Widget";
import {GameMapKeyboardEvent} from "../../../lib/gamemap/MapEvents";
import ControlWithHeader from "./ControlWithHeader";

export default class InteractionTopControl extends GameMapControl<ControlWithHeader> {
  constructor(public _config: {
    name?: string,
    cancel_handler?: () => void
  } = {}) {
    super({
      type: "gapless",
      position: "top-center"
    }, new ControlWithHeader(_config.name ?? "Interaction", _config.cancel_handler));

    this.content.addClass("ctr-interaction-control")
  }

  public setCancelHandler(f: () => void): this {
    this._config.cancel_handler = f

    this.content.header.close_handler.set(f)

    return this
  }

  public setName(name: string): this {
    this.content.header.name.set(name)

    return this
  }

  setContent(widget: Widget): this {
    this.content.setContent(widget)

    return this
  }

  setText(text: string): this {
    return this.setContent(c().text(text))
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    if (this._config.cancel_handler) {

      event.onPre(() => {
        if (event.original.key == "Escape") {
          event.stopAllPropagation()
          this._config.cancel_handler()
        }
      })
    }
  }
}