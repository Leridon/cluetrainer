import TextArea from "../../../../lib/ui/controls/TextArea";
import {BigNisButton} from "../BigNisButton";
import {FormModal} from "../../../../lib/ui/controls/FormModal";
import {Notification} from "../../NotificationBar";
import {ExportImport} from "../../../../lib/util/exportString";
import notification = Notification.notification;
import ImportError = ExportImport.ImportError;

export default class ImportStringModal<T> extends FormModal<{
  imported: T
}> {
  textarea: TextArea

  private import_button: BigNisButton

  constructor(private parser: (_: string) => T) {
    super();
  }

  render() {
    super.render();

    this.title.set("Import")

    this.textarea = new TextArea({placeholder: "Paste the shareable string here."})
      .css2({
        "resize": "none",
        "width": "100%",
        "height": "20em"
      })
      .appendTo(this.body)

    this.textarea.onChange(v => {
      this.import_button.setEnabled(!!v.value)
    })
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel").onClick(() => this.confirm(null)),
      this.import_button = new BigNisButton("Import", "confirm")
        .setEnabled(false)
        .onClick(() => {
          try {
            let imported = this.parser(this.textarea.get())

            if (imported == null) {
              notification("Invalid input").setType("error").show()

              return
            }

            this.confirm({imported: imported})
          } catch (e) {
            if (e instanceof ImportError) {
              notification(e.user_facing_message ?? `Import Error: ${e.reason}`).setType("error").show()
            } else {
              notification(`Unknown Import Error`).setType("error").show()
            }
          }
        })
    ]
  }
}