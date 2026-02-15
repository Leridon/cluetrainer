import Button from "lib/ui/controls/Button";
import {Observable, observe} from "../../../lib/reactive";

export class SmallImageButton extends Button {
  constructor(container: JQuery = null) {
    super(container)

    if (!container) {
      this.container.addClass("nissmallimagebutton")
      this.append(c("<img>"))
    }
  }

  setEnabled(enabled: boolean): this {
    super.setEnabled(enabled)

    if (enabled) this.container.removeClass("disabled")
    else this.container.addClass("disabled")

    return this
  }

  setIcon(icon: string): this {
    this.container.children("img").attr("src", icon)
    return this
  }

  static new(icon: string) {
    return new SmallImageButton().setIcon(icon)
  }
}

export class SmallImageToggleButton extends SmallImageButton {
  value: Observable<boolean> = observe(false)

  constructor() {
    super();

    this.addClass("nisl-small-image-toggle")

    this.onClick(() => {
      this.value.set(!this.value.value())
    })

    this.value.subscribe((v) => {
      this.toggleClass("active", v)
    })
  }

  setState(v: boolean): this {
    this.value.set(v)

    return this
  }
}

export namespace SmallImageButton {
  export function sibut(icon: string, handler: (e: JQuery.ClickEvent) => any): SmallImageButton {
    let but = new SmallImageButton().setIcon(icon)

    if (handler) but.onClick(handler)

    return but
  }

  export function sitog(icon: string, handler: (v: boolean) => any): SmallImageToggleButton {
    let but = new SmallImageToggleButton().setIcon(icon)

    if (handler) but.value.subscribe(handler)

    return but
  }
}