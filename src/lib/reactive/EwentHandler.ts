import {LifetimeManaged} from "../lifetime/LifetimeManaged";
import {LifetimeManager} from "../lifetime/LifetimeManager";

export class EwentHandler<T> implements LifetimeManaged {
  private alive: boolean = true

  constructor(private handler: (_: T) => void | Promise<void>) { }

  remove() {
    this.alive = false
    this.handler = null // Remove reference to handler to immediately qualify it for garbage collection
  }

  apply(v: T): void | Promise<void> {
    return this.handler(v)
  }

  isAlive(): boolean {
    return this.alive
  }

  bindTo(pool: LifetimeManager): this {
    pool.bind(this)

    return this
  }

  endLifetime(): void {
    this.remove()
  }
}

export namespace EventHandler {
  export class Once<T> extends EwentHandler<T> {
    override apply(v: T): void | Promise<void> {
      this.remove()
      return super.apply(v)
    }
  }
}