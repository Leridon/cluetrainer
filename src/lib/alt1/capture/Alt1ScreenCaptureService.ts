import {CapturedImage} from "./CapturedImage";
import {Process} from "../../Process";
import {ScreenRectangle} from "../ScreenRectangle";
import {AbstractCaptureService, CaptureInterval, CaptureService} from "./CaptureService";

export class Alt1ScreenCaptureService extends AbstractCaptureService<
  Alt1ScreenCaptureService.Options,
  CapturedImage
> {
  private ticker: Process

  constructor() {
    super();

    const self = this

    this.ticker = new class extends Process.Interval {
      start_time: number = undefined

      async tick(): Promise<void> {
        if (!window.alt1?.rsLinked) return

        const now = Date.now()

        this.start_time ??= now

        const time: AbstractCaptureService.CaptureTime = {
          tick: ~~((now - this.start_time) / CaptureService.MIN_CAPTURE_INTERVAL),
          time: now
        }

        self.doIfAnyInterest(time, interested_in_this_tick => {
          const required_area = ScreenRectangle.union(
            ...interested_in_this_tick.map(t => t?.area ?? {origin: {x: 0, y: 0}, size: {x: alt1.rsWidth, y: alt1.rsHeight}})
          )

          const capture = CapturedImage.capture(required_area)

          if (!capture) return undefined

          return capture
        })
      }
    }(1000 / CaptureInterval.globalCapturingFps() / 2)

    this.ticker.run()
  }

  protected transformValueForNotification(options: { area: ScreenRectangle, interval: CaptureInterval }, raw_value: AbstractCaptureService.TimedValue<CapturedImage, {
    area: ScreenRectangle;
    interval: CaptureInterval
  }>): CapturedImage {
    return options?.area ? raw_value.value.getScreenSection(options.area) : raw_value.value
  }
}

export namespace Alt1ScreenCaptureService {
  export type Options = { area: ScreenRectangle, interval: CaptureInterval }
}