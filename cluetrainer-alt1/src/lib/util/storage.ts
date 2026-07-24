export namespace storage {
  export function get(key: string, def: () => any = () => null): any {
    let r = localStorage.getItem(key)

    if (r == null) return def()
    return JSON.parse(r)
  }

  export function set(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value))
  }

  export class Variable<type> {
    value: type = null

    constructor(public key: string, initial: () => type) {
      this.value = get(key, initial)
    }

    get() {
      return this.value
    }

    set(value: type) {
      this.value = value
      set(this.key, value)
    }

    map(f: (_: type) => (type | void)) {
      let old = this.get()
      let n = f(this.get())

      if (n == undefined) n = old // Assume f changed the value in place instead of constructing a new one

      this.set(n as type)
    }

    save() {
      set(this.key, this.value)
    }
  }
}