import {LifetimeManaged} from "../../lifetime/LifetimeManaged";
import {StreamRenderObject} from "../alt1gllib/ts/util/alt1gltypes";
import {Log} from "../../util/Log";
import log = Log.log;

export class Alt1GLFrameStream implements LifetimeManaged {
  static _streams: Alt1GLFrameStream[] = []

  public constructor(private readonly stream: StreamRenderObject) {
    Alt1GLFrameStream._streams.push(this)

    log().log(`Alt1GLFrameStream created. ${Alt1GLFrameStream._streams.length} active streams`, "Alt1GL")
  }

  endLifetime(): void {
    this.stream.close()

    Alt1GLFrameStream._streams = Alt1GLFrameStream._streams.filter(s => s != this)

    log().log(`Alt1GLFrameStream closed. ${Alt1GLFrameStream._streams.length} active streams`, "Alt1GL")
  }
}