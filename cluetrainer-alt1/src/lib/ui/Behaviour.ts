/*
    - Does every Behaviour have a parent? YES, except roots
    - Does every Behaviour connect to the application in some way? YES, via its parents.
    - Ressources used by the behaviour must be available via its constructor OR via its parent
    - Is the parent set on construction or on start()? Construction
 */

import {ewent, Observable, observe} from "../reactive";
import {LifetimeManager} from "../lifetime/LifetimeManager";
import {LifetimeManaged} from "../lifetime/LifetimeManaged";

export default abstract class Behaviour implements LifetimeManaged {
  public lifetime_manager: LifetimeManager = new LifetimeManager()
  private _subBehaviours: Behaviour[] = []

  public started = ewent<null>()
  public stopped = ewent<null>()

  private _started = false
  private _starting = false

  withSub<T extends Behaviour>(sub: T): T {
    this._subBehaviours.push(sub)

    if (this._started) sub.start()

    return sub
  }

  start(): this {
    if (this._started) return this

    this._started = true

    this._starting = true
    this.begin()
    this._starting = false

    if (this._started) this.started.trigger(null)

    this._subBehaviours.forEach(c => c.start())

    return this
  }

  stop() {
    this._subBehaviours.forEach(c => c.stop())

    this.lifetime_manager.kill()

    if (this._started) {
      this._started = false
      this.end()
      if (!this._starting) this.stopped.trigger(null)
    }
  }

  isActive(): boolean {
    return this._started
  }

  protected abstract begin()

  protected abstract end()

  public onStop(f: () => any): this {
    this.stopped.on(f)
    return this
  }

  endLifetime(): void {
    this.stop()
  }
}

export class SingleBehaviour<T extends Behaviour = Behaviour> extends Behaviour {
  public behaviour: Observable<T> = observe(null)

  public content_stopped = ewent<T>()

  protected begin() {
    if (this.behaviour.value()) this.behaviour.value().start()
  }

  protected end() {
    if (this.behaviour.value()) this.behaviour.value().stop()
  }

  get(): T {
    return this.behaviour.value()
  }

  set(behaviour: T): this {
    if (this.behaviour.value()) {
      if (this.behaviour.value().isActive()) this.behaviour.value().stop()
      this.behaviour.set(null)
    }

    if (behaviour) {
      this.behaviour.set(behaviour)

      behaviour.stopped.on(() => {
        if (this.behaviour.value() == behaviour) this.content_stopped.trigger(behaviour)
      })

      if (this.isActive()) behaviour.start()
    }

    return this
  }
}