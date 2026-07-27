import Button from "../../../lib/ui/controls/Button";
import {C} from "../../../lib/ui/constructors";
import Widget from "../../../lib/ui/Widget";
import cls = C.cls;

export class BigNisButton extends Button {
  content_container: Widget


  constructor(text: string, style: BigNisButton.Kind) {
    super();

    this.content_container = c().text(text).addClass("content").appendTo(this)
    cls("background").appendTo(this)

    this.addClass("nisl-big-button")

    this.addClass(`nisl-big-button-${style}`)
  }

  setContent(content: Widget): this {
    this.content_container.empty().append(content)
    return this
  }
}

export namespace BigNisButton {
  export type Kind = "confirm" | "cancel" | "neutral"
}