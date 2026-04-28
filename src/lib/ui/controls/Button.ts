import Widget from "../Widget";
import {ewent, observe} from "../../reactive";
import jquery from "jquery";
import {LifetimeManager} from "../../lifetime/LifetimeManager";

export default class Button extends Widget {
  clicked = ewent<JQuery.ClickEvent>()

  enabled = observe(true)
  toggled = observe(false)
  isToggleable = observe(false)

  constructor(container: JQuery = jquery("<div>")) {
    super(container);

    this.addClass("lcss-button")

    this.container.on("click", (e) => {
      e.stopPropagation()

      if (!this.container.hasClass("enabled")) return

      if (this.isToggleable.value()) this.toggled.set(!this.toggled.value())

      this.clicked.trigger(e)
    })

    this.enabled.subscribe(v => {
      this.toggleClass("enabled", v)
    }, true)

    this.toggled.subscribe(v => {
      this.toggleClass("toggled", v)
    })

    this.isToggleable.subscribe(v => {
      if (!v) this.toggled.set(false)
    })

    this.setEnabled(true)
  }

  setEnabled(value: boolean): this {
    this.enabled.set(value)

    if (!value) this.toggled.set(false)

    return this
  }

  onClick(handler: (_: JQuery.ClickEvent) => any, pool: LifetimeManager = null): this {
    let h = this.clicked.on(handler)
    pool?.bind(h)

    return this
  }

  onToggle(handler: (toggled: boolean) => any): this {
    this.toggled.subscribe(handler)

    return this
  }

  setToggleable(v: boolean): this {
    this.isToggleable.set(v)
    return this
  }

  setToggled(b: boolean): this {
    this.toggled.set(b)

    return this
  }

  click() {
    return this.raw().click()
  }
}