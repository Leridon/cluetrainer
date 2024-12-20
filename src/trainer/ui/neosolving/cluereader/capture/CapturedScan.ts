import {CapturedImage} from "../../../../../lib/alt1/capture";
import {Vector2} from "../../../../../lib/math";
import {ImageDetect} from "alt1";
import {async_lazy, Lazy, lazy, LazyAsync} from "../../../../../lib/properties/Lazy";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import * as OCR from "alt1/ocr";
import {util} from "../../../../../lib/util/util";
import * as lodash from "lodash"
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import index = util.index;
import stringSimilarity = util.stringSimilarity;

export class CapturedScan {

  constructor(public readonly body: CapturedImage) {
    body.setName("scan")
  }

  private _raw_lines: Lazy<string[]> = lazy(() => {
    /**
     * This function is originally by skillbert as part of the ScanTextReader class
     */

    const font = require("alt1/fonts/aa_8px.js")

    //const font = require("alt1/fonts/aa_8px_new.js");
    const LINEHEIGHT = 12;

    let data = this.body.getData();

    let lines: string[] = [];

    for (let lineindex = 0; lineindex < 13; lineindex++) {
      const y = lineindex * LINEHEIGHT;
      const line = OCR.findReadLine(data, font, [[255, 255, 255], [239, 176, 99], [192, 192, 192], [255, 223, 0]], 70, y, 40, 1);
      lines.push(line.text);
    }

    const from = lines.findIndex(l => l != "")
    const to = lodash.findLastIndex(lines, l => l != "")

    return lines.slice(from, to + 1)
  })

  private _lines: Lazy<string[]> = lazy(() => {
    let lines: string[] = this._raw_lines.get()

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

  updated(capture: CapturedImage): CapturedScan {
    return new CapturedScan(capture.getScreenSection(this.body.screen_rectangle))
  }
}

export namespace CapturedScan {
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