import {LifetimeManaged} from "../lifetime/LifetimeManaged";
import {StreamRenderObject} from "../alt1/alt1gllib/ts/util/alt1gltypes";

export class Alt1GLFrameStream implements LifetimeManaged {
  public constructor(private readonly stream: StreamRenderObject) {

  }

  endLifetime(): void {
    this.stream.close()
  }
}