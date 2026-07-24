import {EwentHandler} from "./EwentHandler";

export interface Ewent<T> {
  on(listener: (_: T) => any | Promise<any>): EwentHandler<T>

  filtered(predicate: (e: T) => boolean): Ewent.Filtered<T>
}

export function ewent<T>(): Ewent.Real<T> {
  return new Ewent.Real<T>()
}

export namespace Ewent {
  export abstract class AbstractEwent<T> implements Ewent<T> {

    public filtered(predicate: (e: T) => boolean): Ewent.Filtered<T> {
      return new Filtered<T>(this, predicate)
    }

    abstract on(listener: (_: T) => any): EwentHandler<T>;
  }

  export class Real<T> extends AbstractEwent<T> {
    private trigger_count: number = 0
    private handlers: EwentHandler<T>[] = []

    // TODO: Save handlers as weak references to allow garbage collection to clear them
    //      Drawback: Handlers must be saved elsewhere to guarantee their lifetime. Maybe decide on a by-handler basis?
    //      Can use a handler pool for this, without the need to kill them explicitly

    private clean_pass() {
      this.trigger_count += 1

      if (this.trigger_count > 10) {
        this.handlers = this.handlers.filter(s => s.isAlive())
      }
    }

    /**
     * Subscribes a listener to this event.
     * @return An event handler instance that can be cancelled
     * @param listener The handler function
     */
    public on(listener: (_: T) => any | Promise<any>): EwentHandler<T> {
      this.clean_pass()

      let h = new EwentHandler(listener)
      this.handlers.push(h)

      return h
    }

    public handlerCount(): number {
      return this.handlers.length
    }

    /**
     * Triggers this event.
     * @param v
     */
    public trigger(v: T): Promise<void[]> {
      this.clean_pass()

      return Promise.all(this.handlers.filter(h => h.isAlive()).map(h => h.apply(v)))
    }
  }

  export class Filtered<T> extends AbstractEwent<T> {
    constructor(private base: Ewent<T>, private predicate: (_: T) => boolean) {
      super();
    }

    on(listener: (_: T) => any): EwentHandler<T> {
      return this.base.on(e => {
        if (this.predicate(e)) listener(e)
      })
    }
  }

  export class Derived<T, U> extends AbstractEwent<U> {
    constructor(private base: Ewent<T>, private map: (_: T) => U) {
      super();
    }

    on(listener: (_: U) => any): EwentHandler<U> {
      return this.base.on(e => listener(this.map(e))) as EwentHandler<unknown>
    }
  }
}

