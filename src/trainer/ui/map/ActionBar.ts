import Widget from "lib/ui/Widget";
import Button from "lib/ui/controls/Button";
import {Observable, observe} from "lib/reactive";
import InteractionLayer from "lib/gamemap/interaction/InteractionLayer";
import * as jquery from "jquery";
import {C} from "../../../lib/ui/constructors";

export class ActionBar extends Widget {
  constructor(buttons: ActionBar.ActionBarButton[]) {
    super();

    this.addClass("ctr-actionbar")

    this.append(...buttons)
  }
}

export namespace ActionBar {
  import observe_combined = Observable.observe_combined;
  import cls = C.cls;

  export class ActionBarButton extends Button {
    private _activeInteraction: Observable<InteractionLayer> = observe(null)
    public cooldown = observe(0)
    public hotkey = observe("")

    constructor(private icon: string,
                private activation: (_: JQuery.ClickEvent) => Promise<InteractionLayer> | InteractionLayer | any) {
      super();

      this._activeInteraction.subscribe((i) => {
        this.render()

        if (i) i.onEnd(() => this._activeInteraction.set(null))
      })

      this.onClick(async (e) => {
        if (this._activeInteraction.value()) this._activeInteraction.value().cancel()
        else this.trigger(e)
      })

      observe_combined({
        cd: this.cooldown,
        hk: this.hotkey
      }).subscribe(() => {
        this.render()
      }, true)
    }

    async trigger(e: JQuery.ClickEvent | undefined = undefined) {
      if (!this._activeInteraction.value()) {
        let activated = await this.activation(e)

        if (activated instanceof InteractionLayer) this._activeInteraction.set(activated)
      }
    }

    private render() {
      this.empty()

      this.addClass("ctr-action-bar-button")
        .append(jquery(`<img src='${this.icon}'>`))
        .css("position", "relative")

      if (this.cooldown.value() > 0 || this._activeInteraction.value()) {

        c("<div class='ctr-cooldown-overlay-shadow'></div>").appendTo(this)

        if (this.cooldown.value() > 0) {
          cls("ctr-cooldown-overlay").text(this.cooldown.value() + "t")
            .appendTo(this)
        }
      }

      if (this.hotkey.value() != "") {
        cls("ctr-hotkey-overlay").text(this.hotkey.value())
          .appendTo(this)
      }

      if (this._activeInteraction.value()) {
        cls("ctr-cooldown-overlay-cancel").text("X")
          .appendTo(this)
      }
    }

    setHotKey(key: string): this {
      this.hotkey.set(key)
      return this
    }
  }

}