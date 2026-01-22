import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import * as OCR from "alt1/ocr";
import {Vector2} from "../../../../../lib/math";
import {async_lazy, Lazy, lazy, LazyAsync} from "../../../../../lib/Lazy";
import {CapturedImage, NeedleImage} from "../../../../../lib/alt1/capture";
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import {Alt1OverlayDrawCalls} from "../../../../../lib/alt1/overlay/Alt1OverlayDrawCalls";
import {Alt1Overlay} from "../../../../../lib/alt1/overlay/Alt1Overlay";
import {FontDefinition} from "alt1/ocr";

export class CapturedModal {
  title_bar = this.body.parent.getSubSection(
    ScreenRectangle.move(this.body.relativeRectangle(), CapturedModal.TITLE_BAR_OFFSET_FROM_BODY, {x: this.body.size.x, y: 24})
  ).setName("Title")

  private _title: Lazy<string> = lazy(() => {
    const title_bar = this.title_bar.getData();

    return OCR.readSmallCapsBackwards(title_bar, CapturedModal.title_font, [[240, 190, 121]], title_bar.width / 2, 16, title_bar.width / 2, 1).text;
  })

  constructor(
    public readonly body: CapturedImage) {
  }

  title(): string {
    return this._title.get()
  }

  static assumeBody(image: CapturedImage): CapturedModal {
    return new CapturedModal(image)
  }
}

export namespace CapturedModal {
  export const TITLE_BAR_OFFSET_FROM_BODY = {x: 0, y: -27}

  const debug_overlay = lazy(() => new Alt1Overlay().start())
  const DEBUG_FINDER = false;

  export const finder = async_lazy(async () => {
    const anchor = await anchors.get()

    return new class implements Finder<CapturedModal> {
      find(img: CapturedImage): CapturedModal {

        const debug_geometry = new Alt1OverlayDrawCalls.GeometryBuilder()

        for (let skin of anchor) {
          const x = img.findNeedle(skin.close_x)[0]

          if (!x) continue

          x.setName("tr").debugOverlay2(debug_geometry)

          const top_left = img.findNeedle(skin.top_left)[0]

          if (!top_left) continue

          top_left.setName("tl").debugOverlay2(debug_geometry)

          const bot_left = img.findNeedle(skin.bot_left)
            .filter(bl => bl.screen_rectangle.origin.y > top_left.screen_rectangle.origin.y
              && bl.screen_rectangle.origin.x == top_left.screen_rectangle.origin.x)[0]

          if (!bot_left) continue

          bot_left.setName("bl").debugOverlay2(debug_geometry)

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

          body.setName("body").debugOverlay2(debug_geometry)

          const result = new CapturedModal(body)

          result.title_bar.setName("title").debugOverlay2(debug_geometry)

          if (DEBUG_FINDER) debug_overlay.get().setGeometry(debug_geometry.buffer())

          return result
        }

        if (DEBUG_FINDER) debug_overlay.get().setGeometry(debug_geometry.buffer())

        return null
      }
    }
  })

  export const title_font: FontDefinition = require("alt1/fonts/aa_9px_mono_allcaps.js");

  type SkinAnchors = {
    close_x: NeedleImage
    top_left: NeedleImage
    bot_left: NeedleImage,
    BODY_TL_OFFSET_FROM_TL: Vector2
    BODY_BL_OFFSET_FROM_BL: Vector2,
    BODY_TR_OFFSET_FROM_X: Vector2,
  }

  export const anchors = new LazyAsync<SkinAnchors[]>(async () => {
    return [{
      close_x: await NeedleImage.fromURL("/alt1anchors/modal/top_right.png"),
      top_left: await NeedleImage.fromURL("/alt1anchors/modal/top_left.png"),
      bot_left: await NeedleImage.fromURL("/alt1anchors/modal/bot_left.png"),

      BODY_TL_OFFSET_FROM_TL: {x: 5, y: 31},
      BODY_BL_OFFSET_FROM_BL: {x: 4, y: 2},
      BODY_TR_OFFSET_FROM_X: {x: 11, y: 31},
    }]
  })
}