import AbstractEditWidget from "../../../cluetrainer/ui/widgets/AbstractEditWidget";
import jquery from "jquery";

export default class NumberInput extends AbstractEditWidget<number> {

  constructor(private min: number,
              private max: number) {
    super(jquery(`<input type='number' class='nisl-textinput' min='${min}' max="${max}">`));

    this.container
      .on("input", () => {
        this.commit(Number(this.container.val()))
      })
  }

  protected override render() {
    this.container.val(this.get())
  }
}