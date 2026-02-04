import * as jquery from 'jquery';
import * as tippy from 'tippy.js';
import {C} from "./constructors";
import type * as CSS from 'csstype';
import Appendable = C.Appendable;

export default class Widget<T extends HTMLElement = HTMLElement> {
  protected _raw: T
  public container: JQuery

  constructor(init: JQuery | Widget = jquery("<div>")) {
    this.init(init)
  }

  protected init(init: JQuery | Widget = jquery("<div>")): this {
    if (init instanceof Widget) this.container = init.container
    else if (!init) this.container = jquery("<div>")
    else this.container = init

    this._raw = this.container.get()[0] as T

    return this
  }

  raw(): T {
    return this._raw
  }

  empty(): this {
    this.container.empty()
    return this
  }

  appendTo(widget: Widget | JQuery): this {
    if (widget instanceof Widget) widget = widget.container

    widget.append(this.container)

    return this
  }

  prependTo(widget: Widget | JQuery): this {
    if (widget instanceof Widget) widget = widget.container

    widget.prepend(this.container)

    return this
  }

  append(...widget: Appendable[]): this {
    widget.forEach(w => {
      if (!w) return
      if (w instanceof Widget) w = w.container

      this.container.append(w)
    })

    return this
  }

  prepend(widget: Widget | JQuery): this {
    if (widget instanceof Widget) widget = widget.container

    this.container.prepend(widget)

    return this
  }

  css<prop extends keyof CSS.PropertiesHyphen>(key: prop, value: CSS.PropertiesHyphen[prop]): this {
    this._raw.style[key as string] = value

    return this
  }

  css2(properties: CSS.PropertiesHyphen): this {
    Object.assign(this._raw.style, properties)

    return this
  }

  tooltip(title: string): this {
    this._raw.setAttribute("title", title)

    return this
  }

  remove(): this {
    this._raw.remove()

    return this
  }

  detach(): this {
    this.container.detach()
    return this
  }

  addClass(cls: string): this {
    if (cls) this._raw.classList.add(cls)
    return this
  }

  static wrap(jq: JQuery | string | HTMLElement): Widget {
    if (typeof jq == "string") jq = jquery(jq)
    if (jq instanceof HTMLElement) jq = jquery(jq)

    return new Widget(jq)
  }

  text(text: string | number): this {
    this.raw().textContent = text?.toString() ?? ""

    return this
  }

  setVisible(visible: boolean): this {
    if (visible) this.container.show()
    else this.container.hide()

    return this
  }

  show(): this {
    return this.setVisible(true)
  }

  hide(): this {
    return this.setVisible(false)
  }

  toggleClass(cls: string, value: boolean = null): this {
    this._raw.classList.toggle(cls, value)

    return this
  }

  tapRaw(f: (j: JQuery) => any): this {
    f(this.container)

    return this
  }

  addTippy(tooltip: Appendable | (() => Appendable), options: Partial<tippy.Props> = {}): this {
    tippy.default(this.raw(), {
      content: () => {
        if (typeof tooltip == "function") {
          return c("<div class='ctr-entity-tooltip'></div>").append(tooltip()).raw()
        } else {
          return c("<div class='ctr-entity-tooltip'></div>").append(tooltip).raw()
        }
      },
      arrow: true,
      animation: false,
      delay: 0,
      zIndex: 1000001,
      ...options,
    })

    return this
  }

  html(): string {
    return this.raw().outerHTML
  }

  setInnerHtml(html: string): this {
    this.raw().innerHTML = html

    return this
  }

  on<TType extends string>(
    events: TType,
    handler:
      JQuery.TypeEventHandler<HTMLElement, undefined, HTMLElement, HTMLElement, TType>
      | false,
  ): this {
    this.container.on(events, handler)
    return this
  }

  setAttribute(name: string, value: string = ""): this {
    this._raw.setAttribute(name, value)

    return this
  }

  setProperty(name: string, value: boolean): this {
    if (value) this._raw.setAttribute(name, "")
    else this._raw.removeAttribute(name)
    return this
  }
}

declare global {
  function c(s?: string): Widget
}

globalThis.c = (s: string = "<div>") => Widget.wrap(s)
