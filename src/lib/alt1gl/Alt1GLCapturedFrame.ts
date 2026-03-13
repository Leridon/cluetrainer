import {RecordRenderOptions, RenderInvocation} from "./ts/util/patchrs_napi";
import {Alt1GL} from "./Alt1GL";
import {Alt1GLFrameStream} from "./Alt1GLFrameStream";
import {lazy} from "../Lazy";
import {BufferCache} from "./ts/programs/filteredstate";
import {getProgramMeta} from "./ts/render/renderprogram";

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
    const renders = await Alt1GL.instance().native.recordRenderCalls(options)

    return new Alt1GLCapturedFrame(options, renders)
  }

  static subscribe(options: RecordRenderOptions, handler: (_: Alt1GLCapturedFrame) => void): Alt1GLFrameStream {
    return new Alt1GLFrameStream(
      Alt1GL.instance().native.streamRenderCalls(options, renders => {
        handler(new Alt1GLCapturedFrame(options, renders))
      })
    )
  }
}

export namespace Alt1GLCapturedFrame {
  const buffer = lazy(() => new BufferCache())

  export class Render {
    public readonly mesh = lazy(() => buffer.get().getMeshData(this.raw))
    public readonly progmeta = lazy(() => getProgramMeta(this.raw.program))

    constructor(public readonly raw: RenderInvocation) {
    }
  }
}