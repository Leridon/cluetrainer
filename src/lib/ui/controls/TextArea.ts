import AbstractEditWidget from "cluetrainer/ui/widgets/AbstractEditWidget";
import jquery from "jquery";

export default class TextArea extends AbstractEditWidget<string, HTMLTextAreaElement> {
  constructor(customization: {
    readonly?: boolean,
    placeholder?: string
  } = {}) {
    super(jquery("<textarea class='nisl-textinput'>"));

    this.raw().readOnly = !!customization.readonly
    this.raw().placeholder = customization.placeholder || ""

    this
      .on("input", () => {
        this.preview(this.container.val() as string)
      })
      .on("change", () => {
        this.commit(this.container.val() as string)
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

  protected render() {
    this.container.val(this.get())
  }
}