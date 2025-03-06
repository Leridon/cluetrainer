import {ScreenRectangle} from "../ScreenRectangle";
import {Vector2} from "../../math";
import * as a1lib from "alt1";
import {ImgRef, ImgRefBind, ImgRefData} from "alt1";
import {LegacyOverlayGeometry} from "../LegacyOverlayGeometry";
import {NeedleImage} from "./NeedleImage";
import * as lodash from "lodash";
import {Alt1Color} from "../Alt1Color";

export class CapturedImage {
  private _name: string = undefined
  private _data: ImageData = undefined
  private readonly _fullCapturedRectangle: ScreenRectangle
  private readonly _relativeRectangle: ScreenRectangle

  public readonly size: Vector2

  constructor(public readonly capture: { timestamp: number, img_ref: ImgRef },
              public readonly screen_rectangle: ScreenRectangle,
              public readonly parent: CapturedImage = null
  ) {
    this._fullCapturedRectangle = {
      origin: {x: capture.img_ref.x, y: capture.img_ref.y},
      size: {x: capture.img_ref.width, y: capture.img_ref.height}
    }

    if (!this.screen_rectangle) {
      this.screen_rectangle = this._fullCapturedRectangle
    }

    if (parent) {
      this._relativeRectangle = {
        origin: Vector2.sub(this.screen_rectangle.origin, this.parent.screen_rectangle.origin),
        size: screen_rectangle.size
      }
    }

    this.size = this.screen_rectangle.size
  }

  private ensure_current() {
    if (this.capture.img_ref instanceof ImgRefBind && this.root() != CapturedImage.latest_capture) {
      //debugger
      throw new Error("Tried to perform an operation on an expired ImgRefBind")
    }
  }

  setName(name: string): this {
    this._name = name
    return this
  }

  name(): string {
    return this._name
  }

  raw(): ImgRef {
    return this.capture.img_ref
  }

  screenRectangle(): ScreenRectangle {
    return this.screen_rectangle
  }

  relativeRectangle(): ScreenRectangle {
    return this._relativeRectangle
  }

  find(needle: ImageData): CapturedImage[] {
    const ref = globalThis.alt1?.bindFindSubImg
      ? this.capture.img_ref
      : new ImgRefData(this.getData())

    this.ensure_current()

    return ref.findSubimage(needle,
      this.screen_rectangle.origin.x, this.screen_rectangle.origin.y,
      this.screen_rectangle.size.x, this.screen_rectangle.size.y
    ).map(position =>
      this.getSubSection({origin: position, size: {x: needle.width, y: needle.height}})
    )
  }

  findNeedle(needle: NeedleImage): CapturedImage[] {
    const find = ((): Vector2[] => {
      if (this.capture.img_ref instanceof a1lib.ImgRefBind && alt1.bindFindSubImg && false) {

        this.ensure_current()

        // Happy path: Accelerated image lookup via Alt1 is available

        const r = alt1.bindFindSubImg(this.capture.img_ref.handle, needle.encoded(), needle.underlying.width,
          this.screen_rectangle.origin.x, this.screen_rectangle.origin.y,
          this.screen_rectangle.size.x, this.screen_rectangle.size.y
        )

        if (!r) { throw new a1lib.Alt1Error(); }

        return JSON.parse(r) as Vector2[]
      } else {
        // Fallback:

        const found = a1lib.ImageDetect.findSubbuffer(this.getData(), needle.underlying)

        return found.map(p => Vector2.add(this.screen_rectangle.origin, p))
      }
    })

    return find().map(pos => {
      return this.getSubSection(ScreenRectangle.relativeTo(this.screen_rectangle, {origin: pos, size: {x: needle.underlying.width, y: needle.underlying.height}}))
    });
  }

  root(): CapturedImage {
    if (this.parent) return this.parent.root()
    else return this
  }

  isFullScreen(): boolean {
    return this.root() == this
  }

  getScreenSection(absolute_area: ScreenRectangle): CapturedImage {
    return new CapturedImage(
      this.root().capture,
      lodash.cloneDeep(absolute_area),
      this.root()
    )
  }

  getSubSection(relative_rectangle: ScreenRectangle): CapturedImage {
    return new CapturedImage(
      this.capture,
      {
        origin: Vector2.add(this.screen_rectangle.origin, relative_rectangle.origin),
        size: relative_rectangle.size
      },
      this
    )
  }

  getData(): ImageData {
    if (!this._data) {
      this.ensure_current()

      this._data = this.capture.img_ref.toData(
        this.screen_rectangle.origin.x,
        this.screen_rectangle.origin.y,
        this.screen_rectangle.size.x,
        this.screen_rectangle.size.y,
      )
    }

    return this._data
  }

  recapture(img: CapturedImage): CapturedImage {
    return img.getScreenSection(this.screenRectangle())
  }

  private static latest_capture: CapturedImage = null

  static capture(section: ScreenRectangle = null): CapturedImage | null {
    try {
      // TODO: This should respect a1.captureInterval in some way
      const timestamp = Date.now()

      // Default to the full rs game window if no specific section was specified
      const area = section ?? {origin: {x: 0, y: 0}, size: {x: alt1.rsWidth, y: alt1.rsHeight}}

      const img = a1lib.captureHold(area.origin.x, area.origin.y, area.size.x, area.size.y)

      return this.latest_capture = new CapturedImage({img_ref: img, timestamp: timestamp}, area)
        .setName(section ? "Partial Capture" : "Full Capture")
    } catch (e: any) {
      console.error(`Capture failed: ${e.message}`)
      console.error(e.stack)

      return null
    }
  }

  debugOverlay(overlay: LegacyOverlayGeometry = new LegacyOverlayGeometry()): LegacyOverlayGeometry {
    overlay.rect2(this.screenRectangle())

    if (this._name) {
      overlay.text(this._name, this.screen_rectangle.origin,
        {width: 10, centered: false, color: Alt1Color.white}
      )
    }

    return overlay
  }
}

export namespace CapturedImage {
  export function bind(img: ImageData): CapturedImage {
    return new CapturedImage(
      {timestamp: Date.now(), img_ref: new ImgRefData(img)},
      {origin: {x: 0, y: 0}, size: {x: img.width, y: img.height}},
    )
  }
}