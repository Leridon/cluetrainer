import Widget from "../../../lib/ui/Widget";
import {C} from "../../../lib/ui/constructors";
import cls = C.cls;

export class ProgressBar extends Widget {
  private text_widget: Widget
  private fill: Widget

  constructor() {
    super();

    this.addClass("ctr-progress-bar")

    this.append(this.fill = cls("ctr-progress-bar-fill"))
    this.append(this.text_widget = cls("ctr-progress-bar-text"))
  }

  setProgress(progress: number): this {
    this.fill.css("width", `${(progress * 100).toFixed(0)}%`)

    return this
  }

  setText(text: string): this {
    this.text_widget.text(text)
    return this
  }
}