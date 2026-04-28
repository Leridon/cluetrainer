import Widget from "../../lib/ui/Widget";
import {Observable, observe} from "../../lib/reactive";

export class NislIcon extends Widget {
  public img: Widget
  protected url = observe("")

  protected constructor() {
    super();

    this.addClass("nisl-icon")

    this.img = c("<img>").appendTo(this)

    this.url.subscribe(url => {
      this.img.setAttribute("src", url)
    })
  }

  inline(): this {
    this.img.addClass("text-icon")
    return this
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
    return new NislIcon().setSource("/assets/nis/dropdown.png")
  }

  static arrow(direction: ArrowIcon.direction = "down"): ArrowIcon {
    return new ArrowIcon(direction)
  }

  static sectionArrow(direction: "right" | "left"): NislIcon {
    const icon = new NislIcon().setSource("/assets/nis/sectionarrowright.png")

    if (direction == "left") icon.img.css("transform", "scaleX(-1)")

    return icon
  }

  static info(): NislIcon {
    return new NislIcon().css("cursor", "help").setSource("/assets/icons/info_nis.png")
  }

  static delete(): NislIcon {
    return new NislIcon().setSource("/assets/icons/delete.png")
  }

  static plus(): NislIcon {
    return new NislIcon().setSource("/assets/nis/plus.png")
  }

  static from(url: string) {
    return new NislIcon().setSource(url)
  }

  static reset(): NislIcon {
    return new NislIcon().setSource("/assets/icons/reset_nis.png")
  }

  static reset2(): NislIcon {
    return new NislIcon().setSource("/assets/icons/reset.png").css("scale", 0.8)
  }
}

export class FavouriteIcon extends NislIcon {
  toggled = observe(false)

  constructor() {
    super();

    this.toggled.subscribe(v => {
      this.setSource(v ? "/assets/nis/favourite_on.png" : "/assets/nis/favourite_off.png")
    }, true)

    this.img.css("margin-bottom", "2px")
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

export class ExpandIcon extends NislIcon {
  expanded: Observable<boolean>

  constructor() {
    super();

    this.img.css("width", "15px")

    this.expanded = observe(false)

    this.expanded.subscribe(expanded => {

      if (expanded) this.setSource(`assets/nis/minus.png`)
      else this.setSource(`assets/nis/plus.png`)
    }, true)
  }

  setExpanded(value: boolean): this {
    this.expanded.set(value)
    return this
  }
}

export namespace ArrowIcon {
  export type direction = "left" | "right" | "up" | "down"
}