import {Observable} from "./Observable";
import {ewent} from "./Ewent";
import {observe} from "./index";

/**
 * The observed value is considered to change when any of its elements change.
 * In addition, there are several events that allow a more detailed view on changes
 */
export class ObservableArray<T> extends Observable.AbstractObservable<ObservableArray.ObservableArrayValue<T>[]> {
  element_added = ewent<ObservableArray.ObservableArrayValue<T>>()
  element_removed = ewent<ObservableArray.ObservableArrayValue<T>>()
  element_changed = ewent<ObservableArray.ObservableArrayValue<T>>()
  array_changed = ewent<{ order: boolean, set: boolean, data: ObservableArray.ObservableArrayValue<T>[] }>()

  constructor() {
    super();

    this._value = []
  }

  override update(f: (v: ObservableArray.ObservableArrayValue<T>[]) => void) {
    throw new TypeError("Operation not supported! Use setTo or other observable mutations!")
  }

  override set(v: ObservableArray.ObservableArrayValue<T>[]) {
    throw new TypeError("Operation not supported! Use setTo or other modifiers")
  }

  add(v: T): ObservableArray.ObservableArrayValue<T> {
    let e = new ObservableArray.ObservableArrayValue<T>(this, v)

    e.index.set(this._value.length)

    this._value.push(e)

    this.element_added.trigger(e)
    this.changed.trigger({value: this._value})
    this.array_changed.trigger({order: true, set: true, data: this._value})

    return e
  }

  remove(v: ObservableArray.ObservableArrayValue<T>): void {
    let i = this.value().indexOf(v)

    if (i >= 0) {
      let [e] = this._value.splice(i, 1)

      this.element_removed.trigger(e)
      this.changed.trigger({value: this._value})
      this.array_changed.trigger({order: true, set: true, data: this._value})
      e.removed.trigger(e)
    }
  }

  get(): ObservableArray.ObservableArrayValue<T>[] {
    return this._value
  }

  setTo(data: T[]): this {
    for (let valueElement of this.value()) {
      valueElement.removed.trigger(valueElement)
      this.element_removed.trigger(valueElement)
    }

    this._value = data.map((e, i) => {
      let n = new ObservableArray.ObservableArrayValue<T>(this, e)
      n.index.set(i)
      return n
    })

    this._value.forEach(e => this.element_added.trigger(e))
    this.changed.trigger({value: this._value})

    this.array_changed.trigger({order: true, set: true, data: this._value})

    return this
  }

  move(from: number, to: number): this {
    if (from == to) return this

    let [el] = this._value.splice(from, 1)

    this._value.splice(to, 0, el)

    this.changed.trigger({value: this._value})

    this.array_changed.trigger({order: true, set: false, data: this._value})

    this.updateIndices()

    return this
  }

  private updateIndices(): void {
    this._value.forEach((e, i) => e.index.set(i))
  }
}

export namespace ObservableArray {
  /*
  export interface ObservableArrayView<T> {
      element_added: Ewent<ObservableArray.ObservableArrayValue<T>>
      element_removed: Ewent<ObservableArray.ObservableArrayValue<T>>
      element_changed: Ewent<ObservableArray.ObservableArrayValue<T>>

      get(): ObservableArrayValue<T>[]
  }

  export class ObservableArrayFilter<T> implements ObservableArrayView<T> {
      element_added = ewent<ObservableArray.ObservableArrayValue<T>>()
      element_removed = ewent<ObservableArray.ObservableArrayValue<T>>()
      element_changed = ewent<ObservableArray.ObservableArrayValue<T>>()

      private cache: ObservableArrayValue<T>[]
      private filter: Observable<(value: T) => boolean> = observe<(_: T) => boolean>(() => true).equality(() => false)
      private handler_pool = new EwentHandlerPool()

      constructor(private base: ObservableArrayView<T>) {
          this.cache = base.get()

          this.base.element_added.on(v => {
              if (this.filter.value()(v.value())) {
                  this.cache.push(v)
                  this.element_added.trigger(v)
              }
          }).bindTo(this.handler_pool)

          this.base.element_removed.on(v => {
              let i = this.cache.indexOf(v)
              if (i >= 0) {
                  this.cache.splice(i, 1)
                  this.element_removed.trigger(v)
              }
          })

          this.base.element_changed.on(v => {
              if (this.filter.value()(v.value())) {
                  this.element_changed.trigger(v)
              }
          })

          this.filter.subscribe((f) => {
              this.setAndUpdate(this.base.get().filter(v => f(v.value())))
          })
      }

      private setAndUpdate(data: ObservableArrayValue<T>[]) {
          let old = this.cache
          this.cache = data

          for (let i = 0; i < Math.max(old.length, this.cache.length); i++) {
              if (old[i] != this.cache[i]) {
                  if (i < this.cache.length && !old.includes(this.cache[i])) {
                      this.element_added.trigger(this.cache[i])
                  }

                  if (i < old.length && !this.cache.includes(old[i])) {
                      this.element_removed.trigger(this.cache[i])
                  }
              }
          }
      }

      setFilter(f: (_: T) => boolean): this {
          this.filter.set(f)

          return this
      }

      get(): ObservableArrayValue<T>[] {
          return this.cache
      }


      /**
       * Disconnects this view from the underlying observable array.
       * Removes all even hooks to make it garbage collectible.
       * No further events/changes will be received.
       *
      disconnect(): void {
          this.handler_pool.kill()
      }
  }
*/

  export class ObservableArrayValue<T> extends Observable.Simple<T> {
    removed = ewent<ObservableArrayValue<T>>()
    index = observe(0)

    constructor(public _parent: ObservableArray<T>,
                value: T,
    ) {
      super(value);

      this.changed.on(() => {
        this._parent.element_changed.trigger(this)
        this._parent.changed.trigger({value: this._parent.value()})
      })
    }

    parent(): ObservableArray<T> {
      return this._parent
    }

    remove(): void {
      this._parent?.remove(this)
    }

    moveTo(i: number): this {
      this.parent().move(this.index.value(), i)

      return this
    }

    move(delta: number): this {
      return this.moveTo(this.index.value() + delta)
    }
  }

  //TODO: Filtered view
}