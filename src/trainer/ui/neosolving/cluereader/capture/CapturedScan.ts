import {CapturedImage} from "../../../../../lib/alt1/capture";
import {Vector2} from "../../../../../lib/math";
import {ImageDetect} from "alt1";
import {async_lazy, Lazy, lazy, LazyAsync} from "../../../../../lib/properties/Lazy";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import {util} from "../../../../../lib/util/util";
import * as lodash from "lodash"
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import {OCR} from "../../../../../lib/alt1/OCR";
import index = util.index;
import stringSimilarity = util.stringSimilarity;
import ColortTriplet = OCR.ColortTriplet;

type Line = { debugArea: { x: number; y: number; w: number; h: number }; text: string; fragments: OCR.TextFragment[] }

export class CapturedScan {
  constructor(public readonly body: CapturedImage,
              public first_line_knowledge: {
                text: string,
                position: Vector2
              } = null
  ) {
    body.setName("scan")
  }

  public _raw_lines = lazy<Line[]>(() => {
    const COLORS: ColortTriplet[] = [[255, 255, 255], [239, 176, 99], [192, 192, 192], [255, 223, 0]]

    const data = this.body.getData();

    const lines: Line[] = [];

    const start = (() => {
      if (!this.first_line_knowledge) return 0

      for (let y = 0; y < this.body.size.y; y += CapturedScan.LINE_HEIGHT / 2) {
        const line = OCR.readLine(data, CapturedScan.FONT, COLORS, this.first_line_knowledge.position.x, y, true)

        if (!line.text) continue

        if (stringSimilarity(line.text, this.first_line_knowledge.text) > 0.7) {
          lines.push(line)

          return y + CapturedScan.LINE_HEIGHT
        }
      }
    })()

    for (let lineindex = 0; lineindex < CapturedScan.MAX_LINE_COUNT; lineindex++) {
      const y = start + lineindex * CapturedScan.LINE_HEIGHT;

      const line = OCR.findReadLine(data, CapturedScan.FONT, COLORS, 70, y, 40, 1);

      lines.push(line);
    }

    const from = lines.findIndex(l => l.text != "")
    const to = lodash.findLastIndex(lines, l => l.text != "")

    return lines.slice(from, to + 1)
  })

  public _lines: Lazy<string[]> = lazy(() => {
    const lines: string[] = this._raw_lines.get().map(l => l.text)

    const cleaned_lines: string[] = []

    let text = "";

    for (let line of lines) {
      if (line == "" && text != "") {
        cleaned_lines.push(text)

        text = ""
      } else {
        if (text != "") text += " "

        text += line
      }
    }

    if (text != "") cleaned_lines.push(text)

    return cleaned_lines
  })

  private _different_level: Lazy<boolean> = lazy(() => {
    const line = this._lines.get()[1]

    const similarity = stringSimilarity(line, "Try scanning a different level.")

    return similarity > 0.7
  })

  private _meerkats_active = lazy((): boolean => {
    const last_line = index(this._lines.get(), -1)

    const similarity = stringSimilarity(last_line, "Your meerkats are increasing your scan range by")

    return similarity > 0.7
  })

  private _triple = lazy(() => {
    const line = this._lines.get()[1]

    const similarity = stringSimilarity(line, "The orb glows as you scan. You are in range of the coordinate! The coordinate is")

    return similarity > 0.7
  })

  text(): string {
    return this._lines.get().join("\n")
  }

  scanArea(): string {
    return this._lines.get()[0]
  }

  hasMeerkats(): boolean {
    return this._meerkats_active.get()
  }

  isDifferentLevel(): boolean {
    return this._different_level.get()
  }

  isTriple(): boolean {
    return this._triple.get()
  }

  screenRectangle(): ScreenRectangle {
    const lines = this._raw_lines.get().length

    return ScreenRectangle.move(this.body.screenRectangle(),
      {x: 0, y: 6 * lines - 74},
      {x: 180, y: 253}
    )
  }

  relevantTextArea(): ScreenRectangle {
    const lines = this._raw_lines.get()

    const first = lines[0].debugArea
    const last = lines[lines.length - 1].debugArea

    const current_center = {
      x: ~~(first.x + first.w / 2),
      y: (first.y + last.y + CapturedScan.LINE_HEIGHT + 6) / 2
    }

    return {
      origin: Vector2.add(this.body.screen_rectangle.origin, current_center, Vector2.scale(-0.5, CapturedScan.MAX_TEXT_AREA_SIZE)),
      size: CapturedScan.MAX_TEXT_AREA_SIZE
    }
  }

  updated(capture: CapturedImage): CapturedScan {
    const relevant_text_area = this.relevantTextArea()

    const relative_text_start = Vector2.add(this._raw_lines.get()[0].debugArea, this.body.screenRectangle().origin)

    const translated_text_start = Vector2.sub(relative_text_start, relevant_text_area.origin)

    return new CapturedScan(capture.getScreenSection(relevant_text_area), {text: this._raw_lines.get()[0].text, position: translated_text_start})
  }
}

export namespace CapturedScan {
  export const MAX_LINE_COUNT = 13
  export const LINE_HEIGHT = 12
  export const FONT = require("alt1/fonts/aa_8px.js")
  export const MAX_TEXT_AREA_SIZE: Vector2 = {
    x: 180,
    y: CapturedScan.MAX_LINE_COUNT * CapturedScan.LINE_HEIGHT
  }

  export const finder = async_lazy<Finder<CapturedScan>>(async () => {
    const anchor_images = await CapturedScan.anchors.get()

    return new class implements Finder<CapturedScan> {
      find(screen: CapturedImage): CapturedScan {
        const anchors: {
          img: ImageData,
          origin_offset: Vector2
        }[] = [{
          img: anchor_images.scanfartext,
          origin_offset: {x: -20, y: 5 - 12 * 4}
        }, {
          img: anchor_images.orbglows,
          origin_offset: {x: -21, y: 5 - 12 * 4}
        }, {
          img: anchor_images.scanleveltext,
          origin_offset: {x: -20, y: 7 - 12 * 4}
        }]

        const found_body = ((): CapturedImage => {
          for (let anchor of anchors) {
            let locs = screen.find(anchor.img)

            if (locs.length > 0) {
              return screen.getSubSection(
                ScreenRectangle.move(locs[0].screenRectangle(),
                  anchor.origin_offset,
                  {x: 180, y: 190}
                )
              )
            }
          }
        })()

        if (!found_body) return

        return new CapturedScan(found_body)
      }
    }
  })

  export const anchors = new LazyAsync(async () => {
    return {
      scanleveltext: await ImageDetect.imageDataFromUrl("alt1anchors/differentlevel.png"),
      scanfartext: await ImageDetect.imageDataFromUrl("alt1anchors/youaretofaraway.png"),
      orbglows: await ImageDetect.imageDataFromUrl("alt1anchors/orbglows.png"),
    }
  })
}