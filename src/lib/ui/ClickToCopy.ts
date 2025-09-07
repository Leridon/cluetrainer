import Widget from "./Widget";
import * as jquery from "jquery";

export class ClickToCopy extends Widget {
  constructor(text: string, displayed_text_override: string = null) {
    super(jquery("<span>"));

    this.text(displayed_text_override ?? text).addClass("nisl-click-to-copy")

    this.tooltip("Click to copy")

    this.on("click", async () => {
      await navigator.clipboard.writeText(text)

      this.css("min-width", this._raw.offsetWidth + "px")

      this.toggleClass("copied-recently", true)

      this.text("Copied!")

      setTimeout(() => {
        this.text(displayed_text_override ?? text)
        this.css("width", null)
        this.toggleClass("copied-recently", false)
      }, 3000)
    })
  }
}