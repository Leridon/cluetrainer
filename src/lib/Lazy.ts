export class Lazy<T> {
  private _value: T = null
  private _calculated: boolean = false

  constructor(private f: () => T) {
  }

  get(): T {
    if (!this._calculated) {
      this._value = this.f()
      this._calculated = true
    }

    return this._value
  }

  hasValue(): boolean {
    return this._calculated
  }
}

export class LazyAsync<T> {
  private _value_promise: Promise<T> = null
  private _calculated: boolean = false

  constructor(private f: () => Promise<T>) {
  }

  async get(): Promise<T> {
    if (!this._value_promise) {
      this._value_promise = this.f()
      await this._value_promise
      this._calculated = true
    }

    return await this._value_promise
  }

  hasValue(): boolean {
    return this._calculated
  }
}

export function lazy<T>(f: () => T) {
  return new Lazy(f)
}

export function async_lazy<T>(f: () => Promise<T>) {
  return new LazyAsync(f)
}