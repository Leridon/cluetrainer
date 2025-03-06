import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import * as OCR from "alt1/ocr";
import {Vector2} from "../../../../../lib/math";
import {async_lazy, LazyAsync} from "../../../../../lib/Lazy";
import {ImageDetect} from "alt1";
import {CapturedImage, NeedleImage} from "../../../../../lib/alt1/capture";
import {Finder} from "../../../../../lib/alt1/capture/Finder";

export class CapturedModal {
  private _title: string = null

  constructor(
    public readonly body: CapturedImage,
    public readonly isLegacy: boolean) {
  }

  title(): string {
    if (!this._title && this.body.parent) {
      if(this.isLegacy) {
        const TITLE_BAR_OFFSET_FROM_BODY = {x: 0, y: -24}
        const TITLE_BAR_SIZE = {x: 500, y: 20}

        const title_bar = this.body.parent.getSubSection(
          ScreenRectangle.move(this.body.relativeRectangle(),
            TITLE_BAR_OFFSET_FROM_BODY,
            TITLE_BAR_SIZE
          )
        ).getData()

        this._title = OCR.readSmallCapsBackwards(title_bar, CapturedModal.title_font, [[255, 152, 31]], 0, 13, title_bar.width, 1).text
      } else {
        const TITLE_BAR_OFFSET_FROM_BODY = {x: 0, y: -24}
        const TITLE_BAR_SIZE = {x: 150, y: 20}

        const title_bar = this.body.parent.getSubSection(
          ScreenRectangle.move(this.body.relativeRectangle(), TITLE_BAR_OFFSET_FROM_BODY, TITLE_BAR_SIZE)
        ).getData()

        this._title = OCR.readSmallCapsBackwards(title_bar, CapturedModal.title_font, [[255, 203, 5]], 0, 13, title_bar.width, 1).text;
      }
    }

    return this._title.toString()
  }

  static assumeBody(image: CapturedImage): CapturedModal {
    return new CapturedModal(image, false)
  }
}

export namespace CapturedModal {
  export const finder = async_lazy(async () => {
    const anchor = await anchors.get()

    return new class implements Finder<CapturedModal> {
      find(img: CapturedImage): CapturedModal {
        for (let skin of anchor) {
          const x = img.findNeedle(skin.close_x)[0]

          if (!x) continue

          const top_left = img.findNeedle(skin.top_left)[0]
          if (!top_left) {
            return null;
          }

          const bot_left = img.findNeedle(skin.bot_left)[0]
          if (!bot_left) {
            return null;
          }

          const body_tl = Vector2.add(top_left.relativeRectangle().origin, skin.BODY_TL_OFFSET_FROM_TL)
          const body_bl = Vector2.add(bot_left.relativeRectangle().origin, skin.BODY_BL_OFFSET_FROM_BL)
          const body_tr = Vector2.add(x.relativeRectangle().origin, skin.BODY_TR_OFFSET_FROM_X)

          const body_height = body_bl.y - body_tl.y + 1
          const body_width = body_tr.x - body_tl.x + 1

          const BODY_SIZE: Vector2 = {x: body_width, y: body_height}

          const body = img.getSubSection(
            ScreenRectangle.move(top_left.relativeRectangle(),
              skin.BODY_TL_OFFSET_FROM_TL,
              BODY_SIZE))

          return new CapturedModal(body, skin.isLegacy)
        }

        return null
      }
    }
  })

  export const title_font = require("alt1/fonts/aa_9px_mono_allcaps.js");

  type SkinAnchors = {
    isLegacy: boolean
    close_x: NeedleImage
    top_left: NeedleImage
    bot_left: NeedleImage,
    BODY_TL_OFFSET_FROM_TL: Vector2
    BODY_BL_OFFSET_FROM_BL: Vector2,
    BODY_TR_OFFSET_FROM_X: Vector2,
  }

  export const anchors = new LazyAsync<SkinAnchors[]>(async () => {
    return [{
      isLegacy: false,
      close_x: await NeedleImage.fromURL("/alt1anchors/eocx.png"),
      top_left: await NeedleImage.fromURL("/alt1anchors/eoctopleft.png"),
      bot_left: await NeedleImage.fromURL("/alt1anchors/eocbotleft.png"),

      BODY_TL_OFFSET_FROM_TL: {x: 4, y: 29},
      BODY_BL_OFFSET_FROM_BL: {x: 3, y: 7},
      BODY_TR_OFFSET_FROM_X: {x: 10, y: 24},
    }, {
      isLegacy: true,
      close_x: await NeedleImage.fromURL("/alt1anchors/legacyx.png"),
      top_left: await NeedleImage.fromURL("/alt1anchors/legacytopleft.png"),
      bot_left: await NeedleImage.fromURL("/alt1anchors/legacybotleft.png"),

      BODY_TL_OFFSET_FROM_TL: {x: 4, y: 29},
      BODY_BL_OFFSET_FROM_BL: {x: 6, y: -2},
      BODY_TR_OFFSET_FROM_X: {x: 19, y: 20},
    },
    ]
  })
}