import {ewent} from "./reactive";
import {util} from "./util/util";
import delay = util.delay;

export abstract class Process<Result = void> {
  private finished_event = ewent<void>()

  private is_running: boolean = false
  protected should_stop: boolean = false
  private finished: boolean = false

  protected start_time: number
  private last_interrupt_time: number
  protected end_time: number

  private interrupt_settings: {
    interval?: number,
    interrupt?: {
      interval: number,
      length: number
    }
  } = {
    interrupt: {
      interval: 50,
      length: 1
    }
  }

  private timeout: number = Number.MAX_SAFE_INTEGER

  asInterval(interval: number): this {
    this.interrupt_settings = {
      interval: interval
    }

    return this
  }

  withInterrupt(interval: number, length: number): this {
    this.interrupt_settings = {
      interrupt: {
        interval: interval,
        length: length,
      }
    }

    return this
  }

  withTimeout(timeout: number): this {
    this.timeout = timeout
    return this
  }

  private interrupt_ewent = ewent<null>()

  abstract implementation(): Promise<Result> | Result

  async run(): Promise<Result> {
    if (this.is_running || this.finished) return null

    this.is_running = true
    this.should_stop = false

    this.start_time = Date.now();
    this.end_time = this.start_time + this.timeout;
    this.last_interrupt_time = this.start_time

    const result = await this.implementation()

    this.is_running = false
    this.should_stop = false
    this.finished = true

    this.finished_event.trigger(undefined)

    return result
  }

  isFinished(): boolean {
    return this.finished
  }

  onInterrupt(f: () => void): this {
    this.interrupt_ewent.on(f)
    return this
  }

  protected async interrupt(length: number) {
    this.interrupt_ewent.trigger(null)
    await delay(length)
  }

  stop() {
    if (!this.is_running) return

    this.should_stop = true
  }

  await(): Promise<this> {
    return new Promise(resolve => {
      if (this.finished) resolve(this)
      else this.finished_event.on(() => resolve(this))
    })
  }

  protected async checkTime(): Promise<void> {
    const t = Date.now()

    if (this.interrupt_settings.interval) {
      await this.interrupt(Math.max(this.interrupt_settings.interval / 2, (this.last_interrupt_time + this.interrupt_settings.interval) - t))
    } else {
      if (t >= this.end_time) this.stop()
      else if (t >= this.last_interrupt_time + this.interrupt_settings.interrupt.interval) {
        this.last_interrupt_time = t
        await this.interrupt(this.interrupt_settings.interrupt.length)
      }
    }
  }

  onFinished(f: (_: this) => void): this {
    this.finished_event.on(() => f(this))
    return this
  }
}

export namespace Process {

  export abstract class Interval extends Process<void> {
    constructor(interval: number) {
      super();

      this.asInterval(interval)
    }

    abstract tick(): void | Promise<void>

    async implementation(): Promise<void> {
      while (!this.should_stop) {
        await this.tick()

        await this.checkTime()
      }
    }
  }
}