import TextArea from "../../../../lib/ui/controls/TextArea";
import {BigNisButton} from "../BigNisButton";
import {FormModal} from "../../../../lib/ui/controls/FormModal";
import {util} from "../../../../lib/util/util";
import * as lodash from "lodash";
import {ImageDetect} from "alt1";
import selectFile = util.selectFile;

export class ImportModal<T, U> extends FormModal<{
  imported: U
}> {
  textarea: TextArea

  private import_button: BigNisButton

  constructor(private acceptedFiles: string = undefined,
              private data_preprocessor: (_: File | string) => Promise<T> | T,
              private data_processor: (_: T) => U,
              private handler: (_: U) => Promise<boolean | void> | boolean | void = () => true,
              private can_be_text: boolean = true,
  ) {
    super();
  }

  private async commit(value: string | File) {
    const pre_processed = await this.data_preprocessor(value)

    if (!pre_processed) return

    const processed = this.data_processor(pre_processed)

    if ((await this.handler(processed)) ?? true) this.confirm({imported: processed})
  }

  render() {
    super.render();

    this.title.set("Import")

    const area = c()
      .css2({
        "position": "relative",
        "width": "100%",
        "height": "20em"
      })
      .appendTo(this.body)

    if (this.can_be_text) {
      this.textarea = new TextArea({placeholder: "Paste text or drop file here"})
        .css2({
          "position": "relative",
          "resize": "none",
          "width": "100%",
          "height": "100%",
          "word-break": "break-all"
        })
        .on("paste", e => {
          const event = e.originalEvent as ClipboardEvent

          e.preventDefault()
          e.stopPropagation()

          const clipboardData = event.clipboardData;

          if (clipboardData.files?.length > 0) {
            this.commit(clipboardData.files[0])
          } else {
            this.commit(clipboardData.getData('Text'))
          }
        })
        .on("drop", (e) => {
          e.preventDefault()

          if (e.originalEvent.dataTransfer.files.length > 0) {
            this.commit(e.originalEvent.dataTransfer.files[0])
          }
        })
        .appendTo(area)

      this.textarea.onChange(v => {
        this.import_button.setEnabled(!!v.value)
      })
    }

    if (this.acceptedFiles) {
      c().css2({
        "position": "absolute",
        "top": "9em",
        "left": 0,
        "right": 0,
        "text-align": "center",
        "z-index": 1,
        "cursor": "pointer"
      }).text("Click here to select file.")
        .on("click", async () => {
          const file = await selectFile(this.acceptedFiles)

          if (file) this.commit(file)
        })
        .appendTo(area)
    }
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel").onClick(() => this.confirm(null)),
      this.import_button = new BigNisButton("Import", "confirm")
        .setEnabled(false)
        .onClick(() => {
          this.commit(this.textarea.get())
        })
    ]
  }

  static textFile<U>(parser: (_: string) => U, handler: (_: U) => Promise<boolean | void> | boolean | void = () => true, accept: string = "text/*"): Promise<ImportModal<string, U>> {
    return new ImportModal<string, U>(accept,
      ImportModal.preprocess_to_string,
      parser,
      handler
    ).show()
  }

  static json<U>(parser: (_: any) => U = lodash.identity, handler: (_: U) => Promise<boolean | void> | boolean | void = () => true): Promise<ImportModal<string, U>> {
    return new ImportModal<any, U>("application/json,.txt",

      async data => {
        const s = await ImportModal.preprocess_to_string(data)
        return JSON.parse(s)
      },
      parser,
      handler
    ).show()
  }

  static img(handler: (_: ImageData) => void): Promise<ImportModal<any, ImageData>> {
    return new ImportModal<ImageData, ImageData>("image/png",
      async (data: File) => await ImageDetect.imageDataFromUrl(URL.createObjectURL(data)),
      x => x,
      handler,
      false
    ).show()
  }

}

export namespace ImportModal {
  export async function preprocess_to_string(data: string | File): Promise<string> {
    if (data instanceof File) {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.readAsText(data)
        reader.addEventListener("load", (e) => {
          resolve(reader.result as string)
        })
      })
    } else return data
  }
}