import {Process} from "../../Process";
import {CapturedImage} from "./CapturedImage";
import {ScreenRectangle} from "../ScreenRectangle";
import {ewent} from "../../reactive";
import {Log} from "../../util/Log";
import * as lodash from "lodash";
import {LifetimeManager} from "../../lifetime/LifetimeManager";
import {LifetimeManaged} from "../../lifetime/LifetimeManaged";
import TimedValue = AbstractCaptureService.TimedValue;
import CaptureTime = AbstractCaptureService.CaptureTime;
import {Vector2} from "../../math";

export type InterestedToken<InterestOptionsT extends AbstractCaptureService.Options = AbstractCaptureService.Options, ValueT = any> = {
  token: AbstractCaptureService.InterestToken<InterestOptionsT, ValueT>,
  options: InterestOptionsT
}

export abstract class AbstractCaptureService<
  InterestOptionsT extends AbstractCaptureService.Options,
  ValueT
> {
  protected last_checked_tick: AbstractCaptureService.CaptureTime = undefined
  protected interests: AbstractCaptureService.InterestToken<InterestOptionsT, ValueT>[] = []
  protected raw_last_capture: TimedValue<ValueT, InterestOptionsT> = undefined

  subscribe<ActualInterestOptionsT extends InterestOptionsT>(
    token: AbstractCaptureService.InterestToken<ActualInterestOptionsT, ValueT> | AbstractCaptureService.InterestTokenExpression<InterestOptionsT, ActualInterestOptionsT, ValueT, this>
  ): AbstractCaptureService.InterestToken<InterestOptionsT, ValueT> {

    const real_token: AbstractCaptureService.InterestToken<InterestOptionsT, ValueT> = (() => {
      if (token instanceof AbstractCaptureService.InterestToken) return token

      return new class extends AbstractCaptureService.InterestToken<ActualInterestOptionsT, ValueT> {
        protected handle(value: AbstractCaptureService.TimedValue<ValueT, ActualInterestOptionsT>): void {
          token.handle?.(value)
        }

        isPaused(): boolean {
          return token.paused?.() ?? false
        }

        options(time: AbstractCaptureService.CaptureTime): ActualInterestOptionsT | null {
          return token.options(time);
        }

        isOneTime(): boolean {
          if (token.isOneTime) return token.isOneTime()
          return false
        }
      }
    })()

    this.interests.push(real_token)

    real_token.onKilled(() => {
      const i = this.interests.indexOf(real_token)
      if (i >= 0) this.interests.splice(i, 1)
    })

    real_token.lifetime_manager.bind(...real_token.setupHandlers(this))

    return real_token
  }

  protected transformValueForNotification(options: InterestOptionsT,
                                          raw_value: TimedValue<ValueT, InterestOptionsT>
  ): ValueT {
    return raw_value.value
  }

  protected doIfAnyInterest(time: AbstractCaptureService.CaptureTime, f: (interest_options: InterestOptionsT[]) => ValueT | undefined) {
    if (time.tick == this.last_checked_tick?.tick) return // Skip if the tick was already done

    this.last_checked_tick = time

    const interested_in_this_tick = this.getInterests(time)

    if (interested_in_this_tick.length > 0) {
      const raw_value = f(interested_in_this_tick.map(t => t.options))

      if (raw_value === undefined) return

      const value = this.raw_last_capture = {
        time: time,
        value: raw_value,
        options: null
      }

      interested_in_this_tick.forEach(interest => {
        interest.token.notify({
          time: time,
          value: this.transformValueForNotification(interest.options, value),
          options: interest.options
        })
      })
    }
  }

  private _currentInterest: {
    time: AbstractCaptureService.CaptureTime,
    interests: InterestedToken<InterestOptionsT, ValueT>[]
  } = null

  protected getInterests(time: AbstractCaptureService.CaptureTime): InterestedToken<InterestOptionsT, ValueT>[] {
    if (!this._currentInterest || this._currentInterest.time.tick != time.tick) {
      this._currentInterest = {
        time: time,
        interests: this.interests
          .filter(t => !t.isPaused() && t.isAlive())
          .map(t => ({options: t.options(time), token: t}))
          .filter(t => t.options && t.options.interval.matches(time))
      }
    }

    return this._currentInterest.interests
  }

  captureOnce(options: {
    newer_than?: number | CapturedImage,
    options: InterestOptionsT
  }): Promise<TimedValue<ValueT>> {
    return new Promise(resolve => {

      this.subscribe({
        options: () => ({
          ...options.options,
          interval: CaptureInterval.level(0)
        }),
        handle: (value) => resolve(value),
        isOneTime: () => true
      })
    })
  }
}

export namespace AbstractCaptureService {
  import log = Log.log;

  export abstract class InterestToken<
    OptionsT extends Options = Options,
    ValueT = any,
    ServiceT extends AbstractCaptureService<OptionsT, ValueT> = AbstractCaptureService<OptionsT, ValueT>> implements LifetimeManaged {

    public lifetime_manager: LifetimeManager = new LifetimeManager()

    private killed_event = ewent<this>()
    private alive: boolean = true
    private _last_notification: TimedValue<ValueT, OptionsT>

    constructor() {}

    isPaused(): boolean {
      return false
    }

    isAlive(): boolean {
      return this.alive
    }

    revoke() {
      if (!this.alive) return

      this.alive = false
      this.killed_event.trigger(this)

      this.lifetime_manager.kill()
    }

    onKilled(f: (_: this) => void): this {
      this.killed_event.on(f)

      return this
    }

    isOneTime(): boolean {
      return false
    }

    protected abstract handle(value: AbstractCaptureService.TimedValue<ValueT, OptionsT>): void

    abstract options(time: CaptureTime): OptionsT | null

    notify(value: TimedValue<ValueT, OptionsT>): void {
      if (!this.alive) return

      this._last_notification = value

      try {
        this.handle(value)
      } catch (e) {
        if (e instanceof Error) {
          log().log(e.toString(), "Capturing")
        }
      }

      if (this.isOneTime()) this.revoke()
    }

    lastNotification(): TimedValue<ValueT, OptionsT> {
      return this._last_notification
    }

    setupHandlers(service: ServiceT): LifetimeManaged[] {
      return []
    }

    endLifetime(): void {
      this.revoke()
    }
  }

  export type InterestTokenExpression<
    OptionsT extends AbstractCaptureService.Options,
    ActualOptionsT extends OptionsT,
    ValueT,
    ServiceT extends AbstractCaptureService<OptionsT, ValueT>
  > = {
    paused?: () => boolean,
    handle?: (value: AbstractCaptureService.TimedValue<ValueT, ActualOptionsT>) => void,
    isOneTime?: () => boolean
    options: (time: CaptureTime) => ActualOptionsT | null,
    setup_handlers?: (service: ServiceT) => LifetimeManaged[]
  }

  export type Options = {
    interval: CaptureInterval
  }

  export type CaptureTime = {
    tick: number,
    time: number
  }

  export type TimedValue<T, OptionsT extends Options = Options> = {
    time: CaptureTime,
    options: OptionsT,
    value: T
  }
}

export abstract class DerivedCaptureService<
  InterestOptionsT extends AbstractCaptureService.Options = AbstractCaptureService.Options,
  ValueT = null
> extends AbstractCaptureService<InterestOptionsT, ValueT> implements LifetimeManaged {
  private sources: {
    token: AbstractCaptureService.InterestToken,
    service: AbstractCaptureService<any, any>
  }[] = []

  protected constructor() {
    super()
  }

  protected addDataSource<SourceOptionsT extends AbstractCaptureService.Options, SourceValueT>(
    s: AbstractCaptureService<SourceOptionsT, SourceValueT>,
    options: (time: AbstractCaptureService.CaptureTime, child_options: InterestOptionsT[]) => SourceOptionsT
  ): AbstractCaptureService.InterestToken<SourceOptionsT, SourceValueT> {
    const self = this

    const token = s.subscribe(new class extends AbstractCaptureService.InterestToken<DerivedCaptureService.Options<SourceOptionsT, InterestOptionsT, ValueT>, SourceValueT> {
      protected handle(source_value: AbstractCaptureService.TimedValue<SourceValueT, DerivedCaptureService.Options<SourceOptionsT, InterestOptionsT, ValueT>>): void {

        if (self.sources.every(s => s.token.lastNotification()?.time?.tick == source_value.time.tick)) {
          const interests = self.getInterests(source_value.time) // This looks like a recalculation, but getInterests caches the results for each tick

          const value = self.raw_last_capture = {
            time: source_value.time,
            options: null,
            value: self.processNotifications(interests)
          }

          interests.forEach(token => {
            token.token.notify(
              {
                time: value.time,
                options: token.options,
                value: self.transformValueForNotification(token.options, value)
              }
            )
          })
        }
      }

      options(time: AbstractCaptureService.CaptureTime): DerivedCaptureService.Options<SourceOptionsT, InterestOptionsT, ValueT> {
        const interested_in_this_tick: InterestedToken<any, ValueT>[] = self.getInterests(time)

        if (interested_in_this_tick.length == 0) return null

        const compound_options = options(time, interested_in_this_tick.map(t => t.options))

        return {
          ...compound_options,
          interval: lodash.minBy([CaptureInterval.level(200), ...interested_in_this_tick.map(t => t.options.interval)], t => t.tick_modulo),
          original_interests: interested_in_this_tick
        }
      }


      /*options(time: AbstractCaptureService.CaptureTime): SourceOptionsT {
        const interested_in_this_tick = self.interests
          .filter(t => !t.isPaused() && (time.tick % t.tickModulo() == 0))
          .map(t => t.options(time))

        return options(interested_in_this_tick)
      }*/

      isPaused(): boolean {
        return self.interests.every(t => t.isPaused());
      }
    })

    this.sources.push({
      service: s,
      token: token
    })

    return token
  }

  abstract processNotifications(interested_tokens: InterestedToken<InterestOptionsT, ValueT>[]): ValueT

  endLifetime(): void {
    this.sources.forEach(t => t.token.revoke())
  }
}

export namespace DerivedCaptureService {
  export type Options<SourceOptionsT extends AbstractCaptureService.Options, InterestOptionsT extends AbstractCaptureService.Options, ValueT> = SourceOptionsT & {
    original_interests: InterestedToken<InterestOptionsT, ValueT>[]
  }
}

export class ScreenCaptureService extends AbstractCaptureService<
  ScreenCaptureService.Options,
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

export namespace ScreenCaptureService {
  export type Options = { area: ScreenRectangle, interval: CaptureInterval }
}

export class CaptureInterval {
  public readonly tick_modulo: number

  private constructor(private level: number) {
    this.tick_modulo = Math.pow(2, level)
  }

  interval(): number {
    return this.tick_modulo * (1000 / CaptureInterval.global_capturing_fps)
  }

  matches(time: CaptureTime): boolean {
    return (time.tick % this.tick_modulo) == 0
  }

  public static level(level: number): CaptureInterval {
    return new CaptureInterval(level)
  }

  public static fromApproximateInterval(interval: number): CaptureInterval {
    const tier = Math.max(0, Math.round(Math.log2(interval / (1000 / CaptureInterval.global_capturing_fps))))

    return new CaptureInterval(tier)
  }

  private static global_capturing_fps = 60

  static setGlobalCapturingFps(fps: number) {
    this.global_capturing_fps = fps
  }

  static globalCapturingFps(): number {
    return this.global_capturing_fps
  }
}

export namespace CaptureService {
  export const MAX_FPS = 60
  export const MIN_CAPTURE_INTERVAL = 1000 / MAX_FPS
}