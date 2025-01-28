import * as jquery from "jquery";
import {ewent, observe} from "../reactive";
import Widget from "./Widget";
import {C} from "./constructors";
import cls = C.cls;
import {LifetimeManager} from "../lifetime/LifetimeManager";

export abstract class Modal2 {
  protected lifetime_manager = new LifetimeManager()

  state = observe<"unmounted" | "showing" | "shown" | "hiding" | "hidden">("unmounted")

  shown = ewent<this>()
  hiding = ewent<this>()
  hidden = ewent<this>()

  private should_hide: boolean = false

  protected _container: Widget
  protected _backdrop: Widget
  protected _modal: Widget
  protected _dialog: Widget
  protected _content: Widget

  protected constructor(protected options: Modal2.Options = {}) {
    this.state.subscribe(s => {
      switch (s) {
        case "shown":
          if(this.should_hide) this.hide()
          this.shown.trigger(this);
          break;
        case "hiding":
          this.lifetime_manager.endLifetime()

          this.hiding.trigger(this)
          break;
        case"hidden":
          this.hidden.trigger(this);
          break;
      }
    })
  }

  abstract render(): Promise<void> | void

  private mount() {

    this._container = cls("ctr-modal-container").css("z-index", 10000 + Modal2.open_count)
      .on("click", () => {
        if (!this.options.fixed) this.hide()
      })

    if (!this.options.no_backdrop) {
      this._backdrop = cls("ctr-modal-backdrop").appendTo(this._container)
    }

    this._modal = c("<div class='modal ctr-modal' tabindex='-1'></div>").appendTo(this._container)
    this._dialog = c("<div class='modal-dialog'></div>").appendTo(this._modal)
      .on("click", e => e.stopPropagation())
    this._content = c("<div class='modal-content'></div>").appendTo(this._dialog)

    if (!this.options.no_fade) {
      this._modal.addClass("fade")
      this._backdrop.addClass("fade")
    }

    switch (this.options.size ?? "medium") {
      case "small":
        this._dialog.addClass("modal-sm")
        break;
      case "large":
        this._dialog.addClass("modal-lg")
        break;
      case "fullscreen":
        this._dialog.addClass("ctr-modal-fullscreen")
    }

    this._container.appendTo(jquery(document.body))
  }

  async show(): Promise<this> {
    let promise = new Promise<this>((resolve) => {
      this.hidden.on(() => resolve(this))
    })

    this.mount()

    Modal2.open_count++

    setTimeout(() => {
      this.state.set("showing")

      this._modal.addClass("show").css("display", "block")
      this._backdrop.addClass("show")

      setTimeout(() => {
        if (this.state.value() == "showing") this.state.set("shown")
      }, 0.15)
    }, 0.1)

    await this.render()

    return promise
  }

  hide() {
    if (this.state.value() == "shown") {
      this.state.set("hiding")

      this._modal.toggleClass("show", false).css("display", undefined)
      this._backdrop.toggleClass("show", false)

      setTimeout(() => {
        if (this.state.value() == "hiding") {
          this.state.set("hidden")
          Modal2.open_count--
          this._container.remove()
        }
      }, 0.15)
    } else {
      this.should_hide = true
    }
  }

  remove() {
    //this.should_dismount.set(true)
    this.hide()
  }

  content(): Widget {
    return this._content
  }
}

export namespace Modal2 {
  export let open_count: number = 0

  export type Options = {
    no_fade?: boolean,
    size?: "small" | "medium" | "large" | "fullscreen",
    fixed?: boolean,
    no_backdrop?: boolean,
    disable_close_button?: boolean
  }
}