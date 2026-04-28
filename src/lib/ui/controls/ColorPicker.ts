import AbstractEditWidget from "../../../cluetrainer/ui/widgets/AbstractEditWidget";
import Widget from "../Widget";
import {C} from "../constructors";
import cls = C.cls;

export class ColorPicker extends AbstractEditWidget<string> {
  input: Widget<HTMLInputElement>

  constructor() {
    super(cls("nisl-color-input"));

    this.input = c("<input type='color'>")
      .on("change", (v) => {
        this.commit(this.input.container.val() as string)
      })
      .appendTo(this) as Widget<HTMLInputElement>
  }

  protected render() {
    this.input.raw().value = this.get()
  }
}

export namespace ColorPicker {

}