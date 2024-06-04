import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import * as OCR from "@alt1/ocr";
import {Vector2} from "../../../../../lib/math";
import {LazyAsync} from "../../../../../lib/properties/Lazy";
import {ImageDetect} from "@alt1/base";
import {CapturedImage} from "../../../../../lib/alt1/ImageCapture";

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

        console.log(this._title)
      } else {
        const TITLE_BAR_OFFSET_FROM_BODY = {x: 0, y: -24}
        const TITLE_BAR_SIZE = {x: 250, y: 20}

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

  static async findIn(img: CapturedImage): Promise<CapturedModal> {
    // TODO: Support legacy interface mode

    for (let skin of await CapturedModal.anchors.get()) {
      const x = img.find(skin.close_x)[0]

      if (!x) continue

      const top_left = img.find(skin.top_left)[0]
      if (!top_left) {
        console.log("Couldnt find top left")
        return null;
      }

      const bot_left = img.find(skin.bot_left)[0]
      if (!bot_left) {
        console.log("Couldnt find bot left")
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

export namespace CapturedModal {
  export const title_font = require("@alt1/ocr/fonts/aa_9px_mono_allcaps.js");

  type SkinAnchors = {
    isLegacy: boolean
    close_x: ImageData
    top_left: ImageData
    bot_left: ImageData,
    BODY_TL_OFFSET_FROM_TL: Vector2
    BODY_BL_OFFSET_FROM_BL: Vector2,
    BODY_TR_OFFSET_FROM_X: Vector2,
  }

  export const anchors = new LazyAsync<SkinAnchors[]>(async () => {
    return [{
      isLegacy: false,
      close_x: await ImageDetect.imageDataFromUrl("alt1anchors/eocx.png"),
      top_left: await ImageDetect.imageDataFromUrl("alt1anchors/eoctopleft.png"),
      bot_left: await ImageDetect.imageDataFromUrl("alt1anchors/eocbotleft.png"),

      BODY_TL_OFFSET_FROM_TL: {x: 4, y: 29},
      BODY_BL_OFFSET_FROM_BL: {x: 4, y: 7},
      BODY_TR_OFFSET_FROM_X: {x: 20, y: 24},
    }, {
      isLegacy: true,
      close_x: await ImageDetect.imageDataFromUrl("alt1anchors/legacyx.png"),
      top_left: await ImageDetect.imageDataFromUrl("alt1anchors/legacytopleft.png"),
      bot_left: await ImageDetect.imageDataFromUrl("alt1anchors/legacybotleft.png"),

      BODY_TL_OFFSET_FROM_TL: {x: 4, y: 29},
      BODY_BL_OFFSET_FROM_BL: {x: 6, y: -2},
      BODY_TR_OFFSET_FROM_X: {x: 19, y: 20},
    },
    ]
  })
}