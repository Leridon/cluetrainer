import * as a1lib from "alt1";
import {ImageDetect} from "alt1";
import {lazy} from "../../Lazy";
import {Vector2} from "../../math";

export class NeedleImage {
  private _encoded = lazy(() => a1lib.encodeImageString(this.underlying))

  constructor(public underlying: ImageData) {
  }

  public encoded(): string {
    return this._encoded.get()
  }

  public size(): Vector2 {
    return {x: this.underlying.width, y: this.underlying.height}
  }

  static async fromURL(url: string): Promise<NeedleImage> {
    return new NeedleImage(await ImageDetect.imageDataFromUrl(url))
  }
}