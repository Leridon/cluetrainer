import * as a1lib from "alt1";
import {ImageDetect} from "alt1";
import {lazy} from "../../Lazy";
import {Vector2} from "../../math";
import {Log} from "../../util/Log";

export class NeedleImage {
  private _encoded = lazy(() => a1lib.encodeImageString(this.underlying))

  constructor(
    public readonly url: string,
    public readonly underlying: ImageData) {
  }

  public encoded(): string {
    return this._encoded.get()
  }

  public size(): Vector2 {
    return {x: this.underlying.width, y: this.underlying.height}
  }

  static async fromURL(url: string): Promise<NeedleImage> {
    return new NeedleImage(url, await ImageDetect.imageDataFromUrl(url))
  }
}

export namespace NeedleImage {
  import log = Log.log;

  export class AlternativeSet {
    public needles: NeedleImage[]

    constructor(needles: NeedleImage[]) {
      this.needles = needles.filter(n => Vector2.eq(needles[0].size(), n.size()))

      if (this.needles.length != needles.length) {
        log().log("ERROR: Needle image set has inconsistent size!", "Initialization", needles.map(n => ({size: n.size(), url: n.url})))
      }
    }

    public static async fromURLs(...urls: string[]): Promise<AlternativeSet> {
      return new AlternativeSet(await Promise.all(
        urls.map(url => NeedleImage.fromURL(url))
      ))
    }
  }
}