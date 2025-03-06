import * as a1lib from "alt1";
import {ImageDetect} from "alt1";
import {lazy} from "../../Lazy";

export class NeedleImage {
  private _encoded = lazy(() => a1lib.encodeImageString(this.underlying))

  constructor(public underlying: ImageData) {
  }

  public encoded(): string {
    return this._encoded.get()
  }

  static async fromURL(url: string): Promise<NeedleImage> {
    return new NeedleImage(await ImageDetect.imageDataFromUrl(url))
  }
}