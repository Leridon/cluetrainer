import * as lodash from "lodash";
import {ewent, Ewent} from "./Ewent";
import {EwentHandler, observe} from "./index";

export interface Observable<T> {
  changed: Ewent<{ value: T, old?: T }>

  value(): T

  set(v: T): void

  update(f: (v: T) => void): void

  update2(f: (v: T) => void): void

  subscribe(handler: (new_value: T, old: T) => any, trigger_once?: boolean, handler_f?: (_: EwentHandler<any>) => void): this

  map<U>(f: (_: T) => U): Observable.Derived<U, T>

  bindTo(other: Observable<T>): this

  bind(other: Observable<T>): this
}

export namespace Observable {

  export class AbstractObservable<T> implements Observable<T> {
    protected _value: T = null
    private equality_f: (a: T, b: T) => boolean = (a, b) => a == b

    changed = ewent<{ value: T; old?: T }>()

    protected trigger_changed(old_value: T): Promise<any> {
      return this.changed.trigger({value: this._value, old: old_value})
    }

    protected _set(v: T) {
      let old = this._value
      this._value = v
      if (!this.equality_f(old, this._value)) this.trigger_changed(old)
    }

    equality(f: (a: T, b: T) => boolean): this {
      this.equality_f = f
      return this
    }

    structuralEquality(): this {
      this.equality(lodash.isEqual)
      return this
    }

    value(): T {
      return this._value;
    }

    set(v: T): void {
      this._set(v)
    }

    update(f: (v: T) => void): void {
      f(this._value)
      this.trigger_changed(undefined)
    }

    update2(f: (v: T) => void): void {
      let old = lodash.cloneDeep(this._value)

      f(this._value)

      if (!this.equality_f(old, this._value)) this.trigger_changed(old)
    }

    subscribe2(handler: (new_value: T, old: T) => any, trigger_once: boolean = false): EwentHandler<any> {
      let h = this.changed.on((o) => handler(o.value, o.old))

      if (trigger_once) handler(this._value, undefined)

      return h
    }

    subscribe(handler: (new_value: T, old: T) => any, trigger_once: boolean = false, handler_f: (_: EwentHandler<any>) => void = null): this {
      let h = this.subscribe2(handler, trigger_once)

      if (handler_f) handler_f(h)

      return this
    }

    map<U>(f: (_: T) => U): Observable.Derived<U, T> {
      return new Observable.Derived<U, T>(this, f)
    }

    bindTo(other: Observable<T>): this {
      other.subscribe(v => this._set(v))

      this._set(other.value())

      return this
    }

    bind(other: Observable<T>): this {
      this.bindTo(other)
      other.bindTo(this)

      return this
    }
  }

  export class Derived<T, U> extends AbstractObservable<T> {
    constructor(base: Observable<U>, f: (_: U) => T) {
      super();

      base.subscribe((v) => this._set(f(v)), true)
    }

    set(v: T): void {
      throw new TypeError("Set not supported on derived observable")
    }
  }

  export class Simple<T> extends AbstractObservable<T> {
    constructor(v: T) {
      super();

      this._value = v
    }
  }

  type ex<T> = T extends Observable<infer U> ? U : never

  export function observe_combined<T extends Record<string, Observable<any>>>(o: T): Observable<{ [key in keyof T]?: ex<T[key]> }> {
    let obs: Simple<{ [key in keyof T]?: ex<T[key]> }> = observe({})

    for (let key in o) {
      o[key].subscribe(v => obs.update(observed => observed[key] = v), true)
    }

    return obs
  }
}

