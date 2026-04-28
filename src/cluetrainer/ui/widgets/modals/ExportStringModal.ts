import TextArea from "../../../../lib/ui/controls/TextArea";
import {BigNisButton} from "../BigNisButton";
import {NisModal} from "../../../../lib/ui/NisModal";
import {Notification} from "../../NotificationBar";
import {util} from "../../../../lib/util/util";
import notification = Notification.notification;
import download = util.downloadTextFile;

export default class ExportStringModal extends NisModal {
  textarea: TextArea

  constructor(private string: string,
              private explanation: string = "",
              private file_name: string = undefined
  ) {
    super({force_footer: true});
  }

  render() {
    super.render();

    if (this.file_name) this.title.set(`Export ${this.file_name}`)
    else this.title.set(`Export`)

    c("<p></p>").text(this.explanation).appendTo(this.body)

    this.textarea = new TextArea({readonly: true}).setValue(this.string)
      .css2({
        "resize": "none",
        "width": "100%",
        "height": "20em"
      })
      .on("click", () => this.textarea.raw().select())
      .appendTo(this.body)
  }

  getButtons(): BigNisButton[] {
    const buttons: BigNisButton[] = [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.remove()),
      new BigNisButton("Copy", "confirm")
        .onClick(async () => {
          try {
            await navigator.clipboard.writeText(this.string)

            notification("String copied to clipboard!").show()
          } catch {
            notification("Copying failed!", "error").show()
          }

        })
    ]

    if (this.file_name && this.file_name.length > 0) {
      buttons.push(new BigNisButton("Save File", "confirm")
        .onClick(async () => {
          try {
            download(this.file_name, this.string)
          } catch {
            notification("Saving failed!", "error").show()
          }
        })
      )
    }

    return buttons
  }

  static do(
    value: string,
    explanation: string = "",
    file_name: string = undefined
  ): Promise<ExportStringModal> {
    return new ExportStringModal(value, explanation, file_name).show()
  }
}