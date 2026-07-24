import * as a1lib from "alt1";
import {Alt1EventType} from "alt1";
import {Vector2} from "../math";
import {ewent, EwentHandler} from "../reactive";
import {ScreenRectangle} from "./ScreenRectangle";
import {CapturedImage} from "./capture";
import {util} from "../util/util";
import sampleImage = util.sampleImage;
import rgbSimilarity = util.rgbSimilarity;

export class Alt1ContextMenuDetection {
  private ewent = ewent<ScreenRectangle>()

  private last_rect: ScreenRectangle = null

  constructor() {
    a1lib.on("menudetected", e => {
      const event = new Alt1ContextMenuDetection.Event(e)

      this.last_rect = {
        origin: {x: e.rectangle.x, y: e.rectangle.y},
        size: {x: e.rectangle.width, y: e.rectangle.height},
      }

      this.ewent.trigger(this.last_rect)
    })
  }

  check(rect: CapturedImage): ScreenRectangle {
    if(!this.last_rect) return null

    const PIXEL_OFFSET = {x: 22, y: 6}
    const expected_color: [number, number, number] = [28, 26, 18]

    const pos = Vector2.add(this.last_rect.origin, PIXEL_OFFSET)

    if (ScreenRectangle.contains(rect.screenRectangle(), pos)) {
      const sub = rect.getSubSection(ScreenRectangle.relativeTo(rect.screenRectangle(), {origin: pos, size: {x: 1, y: 1}}))

      const pixel = sampleImage(sub.getData(), {x: 0, y: 0})

      if (rgbSimilarity(expected_color, pixel) < 0.9) {
        this.last_rect = null
        this.ewent.trigger(this.last_rect)
      }
    }

    return this.last_rect
  }

  subscribe(handler: (e: ScreenRectangle) => void): EwentHandler<ScreenRectangle> {
    return this.ewent.on(handler)
  }
}

export namespace Alt1ContextMenuDetection {

  export class Event {
    public readonly rect: ScreenRectangle

    constructor(private raw: Alt1EventType["menudetected"]) {
      this.rect = {
        origin: {x: raw.rectangle.x, y: raw.rectangle.y},
        size: {x: raw.rectangle.width, y: raw.rectangle.height},
      }
    }
  }
}