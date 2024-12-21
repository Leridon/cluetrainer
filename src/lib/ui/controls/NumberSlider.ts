import AbstractEditWidget from "../../../trainer/ui/widgets/AbstractEditWidget";
import Widget from "../Widget";
import {observe} from "../../reactive";

export default class NumberSlider extends AbstractEditWidget<number> {
  private input: Widget
  private preview_container: Widget

  enabled = observe(true)

  preview_function: (_: number) => string = v => v.toString()

  constructor(private min: number,
              private max: number,
              private step: number = 1) {
    super();

    this.css("display", "flex").css("flex-grow", 1)

    this.append(
      this.input = c(`<input style="flex-grow: 1" type='range' min='${min}' max="${max}" step="${step}">`)
        .on("input", () => {
          this.commit(Number(this.input.container.val()))
          this.updatePreview()
        }),
      this.preview_container = c().css("min-width", "30px").css("margin-left", "3px")
    )

    this.enabled.subscribe(v => this.input.setProperty("disabled", !v))
  }

  modifyPreviewContainer(f: (_: Widget) => void): this {
    f(this.preview_container)
    return this
  }

  setEnabled(v: boolean): this {
    this.enabled.set(v)

    return this
  }

  withPreviewFunction(f: (_: number) => string): this {
    this.preview_function = f

    this.updatePreview()

    return this
  }

  private updatePreview() {
    let res: string = ""

    try {
      res = this.preview_function(this.get())
    } catch (e) { }

    if (!res) res = this.get()?.toString() || "0"

    this.preview_container.text(res)
  }

  protected render() {
    this.updatePreview()
    this.input.container.val(this.get())
  }
}