import * as a1lib from "alt1";
import * as lodash from "lodash";
import {Vector2} from "../math";
import {EwentHandler} from "../reactive";

export class Alt1MainHotkeyEvent {
  private handlers: Alt1MainHotkeyEvent.Handler[] = []

  private trigger_count: number = 0

  constructor() {
    a1lib.on("alt1pressed", e => {
      this.clean_pass()

      const event = new Alt1MainHotkeyEvent.Event(e)

      const sorted = lodash.sortBy(this.handlers.filter(h => h.isAlive()), h => -h.priority)

      for (const handler of sorted) {
        handler.apply(event)
        if (event.isConsumed()) break
      }
    })
  }

  private clean_pass() {
    this.trigger_count += 1

    if (this.trigger_count > 10) {
      this.handlers = this.handlers.filter(s => s.isAlive())
    }
  }

  /**
   * Subscribe to the main hotkey event
   * @param priority The priority of this handler. Handlers with higher priorities see the event first and can stop propagation.
   * @param handler The handler function.
   */
  subscribe(priority: number, handler: (e: Alt1MainHotkeyEvent.Event) => void): Alt1MainHotkeyEvent.Handler {
    this.clean_pass()

    let h = new Alt1MainHotkeyEvent.Handler(priority, handler)

    this.handlers.push(h)

    return h
  }
}

export namespace Alt1MainHotkeyEvent {
  export class Handler extends EwentHandler<Event> {
    constructor(public readonly priority: number, handler: (_: Event) => void | Promise<void>) {
      super(handler)
    }
  }

  export class Event {
    private consumed = false

    public readonly mouse: Vector2
    public readonly mouseScreen: Vector2
    public readonly text: string

    constructor(private raw: a1lib.Alt1EventType["alt1pressed"]) {
      this.mouse = raw.mouseRs
      this.mouseScreen = raw.mouseAbs
      this.text = raw.text.length > 0 ? raw.text : null
    }

    consume(): this {
      this.consumed = true

      return this
    }

    isConsumed(): boolean {
      return this.consumed
    }
  }
}