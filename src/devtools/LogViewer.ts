import {Log} from "../lib/util/Log";
import {NisModal} from "../lib/ui/NisModal";
import {C} from "../lib/ui/constructors";
import {util} from "../lib/util/util";
import {BigNisButton} from "../trainer/ui/widgets/BigNisButton";
import ExportStringModal from "../trainer/ui/widgets/modals/ExportStringModal";
import cls = C.cls;
import formatTime = util.formatTime;
import cleanedJSON = util.cleanedJSON;
import img = C.img;
import downloadTextFile = util.downloadTextFile;

export class LogViewer extends NisModal {
  constructor(private buffer: Log.LogBuffer) {
    super({size: "fullscreen"})

    this.setTitle("Log Viewer")
  }

  private renderLog() {
    this.body.empty()

    if (this.buffer) {
      const container = cls("nisl-textinput").appendTo(this.body)
        .css("height", "unset")
        .css("max-height", "100%")

      for (const entry of this.buffer) {
        cls("ctr-log-viewer-message")
          .append(
            c().css("width", "100px").text(formatTime(entry.timestamps[0])),
            c().css("min-width", "100px").css("width", "100px").css("text-align", "center").text(entry.message.category),
            c().text(entry.message.body?.toString() ?? JSON.stringify(entry.message.body)),
          )
          .appendTo(container)

        if (entry.message.attachment) {
          const attachment = cls("ctr-log-viewer-attachment")
            .appendTo(container)

          switch (entry.message.attachment.type) {
            case "object":
              attachment.text(cleanedJSON(entry.message.attachment.value, 4))
              break;
            case "image":
              attachment.append(img(entry.message.attachment.value))
              break;
          }
        }
      }
    }
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Download file", "confirm").onClick(() => {
        const asjson = cleanedJSON(this.buffer)

        try {
          downloadTextFile(`cluetrainerlog-${Date.now()}.txt`, asjson)
        } catch (e) {
          ExportStringModal.do(asjson, "Your Alt1 version does not support downloading files. Please copy the contents below and save them to a file instead.")
        }
      })
    ]
  }

  render() {
    super.render();

    this.renderLog()
  }

  static do(log: Log.LogBuffer): Promise<LogViewer> {
    return new LogViewer(log).show()
  }
}