import AbstractEditWidget from "trainer/ui/widgets/AbstractEditWidget";
import * as jquery from "jquery";
import {ewent, EwentHandler} from "../../reactive";

export default class TextField extends AbstractEditWidget<string> {
  private confirmed = ewent<string>()

  constructor(is_password: boolean = false) {
    super(jquery("<input class='nisl-textinput'>"));

    this.setAttribute("type", is_password ? "password" : "text")

    this.container
      .val(this.get())
      .on("input", () => {
        this.preview(this.container.val() as string)
      })
      .on("change", () => {
        this.commit(this.container.val() as string)
      })
      .on("keydown", (e) => {
        if (e.key == "Enter") {
          this.confirmed.trigger(this.get())
        }
      })
  }

  setEnabled(v: boolean): this {
    this.container.prop("disabled", !v)
    return this
  }

  setPlaceholder(placeholder: string): this {
    this.container.attr("placeholder", placeholder)

    return this
  }

  onConfirm(f: (_: string) => void, handle: (_: EwentHandler<any>) => void = () => {}): this {
    handle(this.confirmed.on(f))

    return this
  }

  protected render() {
    this.container.val(this.get())
  }
}