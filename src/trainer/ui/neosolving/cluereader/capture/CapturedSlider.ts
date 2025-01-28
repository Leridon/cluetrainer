import {async_lazy, LazyAsync} from "../../../../../lib/Lazy";
import {ImageDetect} from "alt1";
import {CapturedImage} from "../../../../../lib/alt1/capture";
import {Vector2} from "../../../../../lib/math";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import {util} from "../../../../../lib/util/util";
import * as lodash from "lodash";
import {SliderReader} from "../SliderReader";
import {Sliders} from "../../../../../lib/cluetheory/Sliders";
import rgbSimilarity = util.rgbSimilarity;
import SliderPuzzle = Sliders.SliderPuzzle;

export class CapturedSliderInterface {
  public readonly body: CapturedImage
  private _puzzle: SliderPuzzle = null

  constructor(
    public readonly image: CapturedImage,
    private readonly image_includes_checkbox: boolean,
    public readonly isLegacy: boolean,
    private readonly reader: SliderReader
  ) {

    if (image_includes_checkbox) {
      this.body = image.getSubSection({
        origin: {x: -CapturedSliderInterface.INVERTED_CHECKBOX_OFFSET_FROM_TL.x, y: 0},
        size: {...CapturedSliderInterface.PUZZLE_SIZE}
      })
    } else {
      this.body = image
    }
  }

  isInvertedArrowKeyCheckboxEnabled(): boolean {
    if (!this.image_includes_checkbox) return false

    const pixel = this.image.getSubSection({
      origin: {x: 0, y: CapturedSliderInterface.INVERTED_CHECKBOX_OFFSET_FROM_TL.y},
      size: {x: 1, y: 1}
    }).getData()

    return rgbSimilarity(CapturedSliderInterface.CHECKMARK_COLOR,
      pixel.getPixel(0, 0) as any
    ) > 0.8
  }

  screenRectangle(include_checkbox: boolean): ScreenRectangle {
    if (include_checkbox == this.image_includes_checkbox) {
      return this.image.screenRectangle()
    } else if (include_checkbox) {
      const body_rect: ScreenRectangle = lodash.cloneDeep(this.body.screenRectangle())

      body_rect.origin.x += CapturedSliderInterface.INVERTED_CHECKBOX_OFFSET_FROM_TL.x
      body_rect.size.x += -CapturedSliderInterface.INVERTED_CHECKBOX_OFFSET_FROM_TL.x

      return body_rect
    } else {
      return this.body.screenRectangle()
    }
  }

  recapture(include_checkbox: boolean, image: CapturedImage): CapturedSliderInterface {
    return new CapturedSliderInterface(
      image.getScreenSection(this.screenRectangle(include_checkbox)),
      include_checkbox,
      this.isLegacy,
      this.reader
    )
  }

  public getPuzzle(known_theme: string = undefined): SliderPuzzle {

    if (!this._puzzle && this.reader) {
      this._puzzle = this.reader.identify(this.body.getData(), known_theme)
    }

    return this._puzzle
  }
}

export namespace CapturedSliderInterface {
  export interface Finder {
    find(img: CapturedImage, include_inverted_arrow_checkmark: boolean, reader: SliderReader): CapturedSliderInterface
  }

  export namespace Finder {
    export const instance = async_lazy(async () => {
      const anchors: {
        isLegacy: boolean,
        anchor: ImageData
      }[] = [
        {isLegacy: false, anchor: (await CapturedSliderInterface.anchors.get()).eoc_x},
        {isLegacy: true, anchor: (await CapturedSliderInterface.anchors.get()).legacy_x},
      ]

      return new class implements Finder {
        find(img: CapturedImage, include_inverted_arrow_checkmark: boolean, reader: SliderReader): CapturedSliderInterface {
          for (const anchor of anchors) {
            const positions = img.find(anchor.anchor)

            if (positions.length > 0) {
              const body_rect: ScreenRectangle = {
                origin: Vector2.add(positions[0].relativeRectangle().origin, CapturedSliderInterface.TL_TILE_FROM_X_OFFSET),
                size: {...CapturedSliderInterface.PUZZLE_SIZE}
              }

              if (include_inverted_arrow_checkmark) {
                body_rect.origin.x += CapturedSliderInterface.INVERTED_CHECKBOX_OFFSET_FROM_TL.x
                body_rect.size.x += -CapturedSliderInterface.INVERTED_CHECKBOX_OFFSET_FROM_TL.x
              }

              return new CapturedSliderInterface(
                positions[0].parent.getSubSection(body_rect),
                include_inverted_arrow_checkmark,
                anchor.isLegacy,
                reader
              )
            }
          }

          return null
        }

      }
    })
  }

  export const TL_TILE_FROM_X_OFFSET = {x: -297, y: 15}
  export const INVERTED_CHECKBOX_OFFSET_FROM_TL = {x: -169, y: 222}
  export const PUZZLE_SIZE = {x: 273, y: 273}

  export const CHECKMARK_COLOR: [number, number, number] = [239, 175, 63]

  export const anchors = new LazyAsync(async () => {
    return {
      eoc_x: await ImageDetect.imageDataFromUrl("alt1anchors/slide.png"),
      legacy_x: await ImageDetect.imageDataFromUrl("alt1anchors/slidelegacy.png"),
    }
  })
}