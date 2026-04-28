import {Alt1GLFrameStream} from "./Alt1GLFrameStream";
import {lazy} from "../Lazy";
import {RecordRenderOptions, RenderInvocation} from "../alt1/alt1gllib/ts/util/alt1gltypes";
import {BufferCache} from "../alt1/alt1gllib/ts/programs/filteredstate";
import {getProgramMeta} from "../alt1/alt1gllib/ts/render/renderprogram";
import {Alt1} from "../alt1/Alt1";

export class Alt1GLCapturedFrame {
  public readonly frame_number: number | undefined
  public readonly renders: Alt1GLCapturedFrame.Render[]

  constructor(
    public readonly options: RecordRenderOptions,
    renders: RenderInvocation[]
  ) {
    this.frame_number = renders?.[0]?.framenr
    this.renders = renders.map(r => new Alt1GLCapturedFrame.Render(r))
  }

  static async capture(options: RecordRenderOptions = {features: ["full"]}): Promise<Alt1GLCapturedFrame> {
    const renders = await Alt1.instance().opengl.session.recordRenderCalls(options)

    return new Alt1GLCapturedFrame(options, renders)
  }

  static subscribe(options: RecordRenderOptions, handler: (_: Alt1GLCapturedFrame) => void): Alt1GLFrameStream {
    return new Alt1GLFrameStream(
      Alt1.instance().opengl.session.streamRenderCalls(options, renders => {
        handler(new Alt1GLCapturedFrame(options, renders))
      })
    )
  }
}

export namespace Alt1GLCapturedFrame {
  const buffer = lazy(() => new BufferCache(null))

  export class Render {
    public readonly mesh = lazy(() => buffer.get().getMeshData(this.raw))
    public readonly progmeta = lazy(() => getProgramMeta(this.raw.program))

    constructor(public readonly raw: RenderInvocation) {
    }
  }
}