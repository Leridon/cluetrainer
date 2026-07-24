export namespace Order {

  export function natural_order(a: number, b: number): number {
    return a - b
  }

  export function comap<T, U>(cmp: (a: U, b: U) => number, f: (_: T) => U): (a: T, b: T) => number {
    return (a, b) => cmp(f(a), f(b))
  }

  export function reverse<T>(cmp: (a: T, b: T) => number): (a: T, b: T) => number {
    return (a, b) => -cmp(a, b)
  }

  export function chain<T>(...fs: ((a: T, b: T) => number)[]): (a: T, b: T) => number {
    return (a, b) => {
      for (let f of fs) {
        let r = f(a, b)
        if (r != 0) return r
      }

      return 0
    }
  }
}