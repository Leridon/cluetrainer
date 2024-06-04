import Widget from "../../lib/ui/Widget";
import {Observable, observe} from "../../lib/reactive";

export class NislIcon extends Widget {
  private img: Widget
  protected url = observe("")

  protected constructor() {
    super();

    this.addClass("nisl-icon")

    this.img = c("<img>").appendTo(this)

    this.url.subscribe(url => {
      this.img.setAttribute("src", url)
    })
  }

  setSource(src: string): this {
    this.url.set(src)
    return this
  }

  withClick(handler: JQuery.TypeEventHandler<HTMLElement, undefined, HTMLElement, HTMLElement, "click">): this {
    this.addClass("ctr-clickable")

    this.on("click", handler)
    return this
  }

  static dropdown(): NislIcon {
    return new NislIcon().setSource("assets/nis/dropdown.png")
  }

  static arrow(direction: ArrowIcon.direction = "down"): ArrowIcon {
    return new ArrowIcon(direction)
  }

  static info(): NislIcon {
    return new NislIcon().css("cursor", "help").setSource("assets/icons/info.png")
  }

  static delete(): NislIcon {
    return new NislIcon().setSource("assets/icons/delete.png")
  }

  static from(url: string) {
    return new NislIcon().setSource(url)
  }
}

export class FavouriteIcon extends NislIcon {
  toggled = observe(false)

  constructor() {
    super();

    this.toggled.subscribe(v => {
      this.setSource(v ? "assets/nis/favourite_on.png" : "assets/nis/favourite_off.png")
    }, true)
  }

  set(value: boolean): this {
    this.toggled.set(value)
    return this
  }
}

export class ArrowIcon extends NislIcon {
  direction: Observable<ArrowIcon.direction>

  constructor(dir: ArrowIcon.direction = "down") {
    super();

    this.direction = observe(dir)

    this.direction.subscribe(dir => {
      this.setSource(`assets/nis/arrow_${dir}.png`)
    }, true)
  }

  setDirection(direction: ArrowIcon.direction): this {
    this.direction.set(direction)
    return this
  }
}

export namespace ArrowIcon {
  export type direction = "left" | "right" | "up" | "down"
}