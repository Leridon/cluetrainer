import Button from "lib/ui/controls/Button";
import {C} from "../../../lib/ui/constructors";
import Appendable = C.Appendable;

export default class LightButton extends Button {
  constructor(text: Appendable = "Button", type: "default" | "round" | "rectangle" = "default") {
    super()

    if (type == "default") this.addClass("ctr-lightbutton-default")
    if (type == "round") this.addClass("ctr-lightbutton-round")

    this.addClass("ctr-lightbutton").append(text)
  }

  slim(): this {
    this.addClass("ctr-lightbutton-slim")

    return this
  }

  setText(text: string): this {
    this.text(text)
    return this
  }
}