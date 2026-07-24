import Widget from "./Widget";
import {C} from "./constructors";
import spacer = C.spacer;

export default class ButtonRow extends Widget {
  constructor(private customization: {
                align?: "center" | "left" | "right",
                sizing?: string,
                max_center_spacer_width?: string
              } = {},
  ) {
    super();

    this.css2({
      "display": "flex",
      "justify-content": customization.align ?? "center"
    })
  }

  buttons(...buttons: Widget[]): this {
    buttons = buttons.filter(b => !!b)

    buttons.forEach(b => b.css("flex-basis", this.customization.sizing || "100%"))
    this.empty()
    if (buttons.length % 2 == 0 && this.customization.max_center_spacer_width) {
      this.append(...buttons.slice(0, buttons.length / 2))
      this.append(spacer().css("max-width", this.customization.max_center_spacer_width))
      this.append(...buttons.slice(buttons.length / 2))
    } else {
      this.append(...buttons)
    }

    return this
  }
}