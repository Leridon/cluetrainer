import Widget from "./Widget";
import {Modal2} from "./Modal2";
import {observe} from "../reactive";
import {BigNisButton} from "../../cluetrainer/ui/widgets/BigNisButton";
import ButtonRow from "./ButtonRow";
import {C} from "./constructors";
import cls = C.cls;

export class NisModal extends Modal2 {
  public header: Widget
  public body: Widget
  public footer: Widget
  private title_widget: Widget

  title = observe("")

  constructor(protected override options: NisModal.Options = {}) {
    super(options);

    this.title.subscribe(title => {
      this.title_widget?.text(title)
    })
  }

  render(): void {
    this._content.addClass("nisl-modal")

    this.header = c("<div class='nisl-modal-header'></div>").appendTo(this._content)
    this.body = c("<div class='nisl-modal-body'></div>").appendTo(this._content)

    const buttons = this.getButtons()

    if (this.options.force_footer || buttons.length > 0) {
      this.footer = c("<div class='nisl-modal-footer'></div>").appendTo(this._content)

      if (buttons.length > 0) {
        this.footer.append(new ButtonRow({align: "center", sizing: "100px", max_center_spacer_width: "100px"})
          .buttons(...buttons))
      }
    }

    this.title_widget = c("<h1 class='nisl-modal-title'></h1>").text(this.title.value()).appendTo(this.header)

    if (!this.options.disable_close_button) {
      cls('nisl-modal-exit')
        .on("click", () => this.onClose())
        .appendTo(this.header)
    }
  }

  protected onClose() {
    this.remove()
  }

  setTitle(title: string): this {
    this.title.set(title)
    return this
  }

  getButtons(): BigNisButton[] {
    return []
  }
}

export namespace NisModal {
  let active_modals = 0

  export type Options = Modal2.Options & { force_footer?: boolean }
}