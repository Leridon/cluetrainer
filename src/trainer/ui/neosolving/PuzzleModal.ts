import {NisModal} from "../../../lib/ui/NisModal";
import Widget from "../../../lib/ui/Widget";
import {BigNisButton} from "../widgets/BigNisButton";
import {AbstractPuzzleSolving} from "./subbehaviours/AbstractPuzzleSolving";
import {C} from "../../../lib/ui/constructors";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {SettingsModal} from "../settings/SettingsEdit";
import hbox = C.hbox;
import inlineimg = C.inlineimg;
import Appendable = C.Appendable;

export class PuzzleModal extends NisModal {
  private image_container: Widget
  private status_row: Widget
  private button_row: ButtonRow

  constructor(public readonly parent: AbstractPuzzleSolving<any, any>) {
    super({size: "medium", fixed: true});
  }

  setStatus(a: Appendable): this {
    this.status_row.empty().append(a)

    return this
  }

  render() {
    super.render();

    this.body.empty().append(
      this.image_container = c()
        .css2({
          "max-width": "100%",
          "text-align": "center"
        }),
      this.status_row = c(),
      hbox(
        this.button_row = new ButtonRow({align: "center"}).css("flex-grow", 1),
        inlineimg("/assets/icons/settings.png").addClass("ctr-clickable")
          .on("click", async () => {
            const result = await SettingsModal.openOnPage(this.parent.settings_id)

            if (result.saved && this.parent.process) this.parent.resetProcess(true)
          })
      )
        .css2({
          "max-width": "250px",
          "margin-left": "auto",
          "margin-right": "auto",
        })
    )

    this.update()
  }

  update() {
    if (this.parent.process) {
      this.button_row.buttons(
        new BigNisButton("Reset", "neutral")
          .onClick(() => {
            this.parent.resetProcess(true)
          }),
        new BigNisButton("Stop", "cancel")
          .onClick(() => {
            this.parent.resetProcess(false)
          })
      )
    } else {
      this.button_row.buttons(
        new BigNisButton("Start", "confirm")
          .onClick(() => {
            this.parent.resetProcess(true)
          }),
      )
    }
  }

  setImage(img: ImageData) {
    this.image_container.empty().append(Widget.wrap(img.toImage()).css("max-width", "100%"))
  }
}