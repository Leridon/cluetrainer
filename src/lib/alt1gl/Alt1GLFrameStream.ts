import {LifetimeManaged} from "../lifetime/LifetimeManaged";
import {StreamRenderObject} from "./ts/util/patchrs_napi";

export class Alt1GLFrameStream implements LifetimeManaged {
  public constructor(private readonly stream: StreamRenderObject) {

  }

  endLifetime(): void {
    this.stream.close()
  }
}