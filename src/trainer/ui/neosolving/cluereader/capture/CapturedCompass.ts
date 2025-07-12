import {CapturedImage, NeedleImage} from "../../../../../lib/alt1/capture";
import {async_lazy, lazy} from "../../../../../lib/Lazy";
import {ImageDetect} from "alt1";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import {util} from "../../../../../lib/util/util";
import {Vector2} from "../../../../../lib/math";
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import rgbSimilarity = util.rgbSimilarity;
import sampleImage = util.sampleImage;

export class CapturedCompass {

  public readonly arc_line: CapturedImage
  public readonly compass_area: CapturedImage

  constructor(public readonly body: CapturedImage) {
    body.setName("compass")

    this.arc_line = body.getSubSection({
      origin: {x: 34, y: 235},
      size: {x: 112, y: 1},
    }).setName("arc line")

    this.compass_area = body.getSubSection(CapturedCompass.ARROW_RECT_FROM_BODY).setName("compass body")
  }

  recapture(img: CapturedImage): CapturedCompass {
    return new CapturedCompass(this.body.recapture(img))
  }

  private _is_arc_lines = lazy(() => {
    const PIXEL_REQUIRED_TO_BE_CONSIDERED_ARC_COMPASS = 5
    const buf = this.arc_line.getData()

    const text_color: [number, number, number] = [51, 25, 0]
    let n = 0;
    for (let x = 0; x < buf.width; x++) {
      if (rgbSimilarity(text_color, sampleImage(buf, {x: x, y: 0})) > 0.9) {
        n++;
      }
    }

    return n > PIXEL_REQUIRED_TO_BE_CONSIDERED_ARC_COMPASS;
  })

  isArcCompass(): boolean {
    return this._is_arc_lines.get()
  }
}

export namespace CapturedCompass {
  export const finder = async_lazy(async () => {
    const anchor = await CapturedCompass.anchor.get()

    return new class implements Finder<CapturedCompass> {
      /**
       * Looks for a compass in the given {@link CapturedImage} by looking for the north-indicator.
       * @param screen The image to search for a compass interface.
       */
      find(screen: CapturedImage): CapturedCompass {
        const position = screen.findNeedle(anchor)[0]

        if (position) {
          const section = screen.getSubSection(
            ScreenRectangle.move(position.relativeRectangle(),
              CapturedCompass.origin_offset_from_anchor,
              CapturedCompass.UI_SIZE),
          )

          return new CapturedCompass(section)
        }

        return null
      }

    }
  })

  export const anchor = async_lazy(async () => await NeedleImage.fromURL("/alt1anchors/compassnorth.png"))
  export const origin_offset_from_anchor = {x: -78, y: -20}
  export const UI_SIZE = {x: 172, y: 259}

  export const ARROW_CENTER_OFFSET_FROM_BODY_TL = {x: 89, y: 137}
  export const TOTAL_COMPASS_RADIUS: number = 85

  export const ARROW_RECT_FROM_BODY: ScreenRectangle = {
    origin: Vector2.sub(ARROW_CENTER_OFFSET_FROM_BODY_TL, {x: TOTAL_COMPASS_RADIUS, y: TOTAL_COMPASS_RADIUS}),
    size: {x: 2 * TOTAL_COMPASS_RADIUS + 1, y: 2 * TOTAL_COMPASS_RADIUS + 1}
  }

}