/**
 * Contains common utilities from lodash without actually depending on lodash.
 */
export namespace FakeLodash {
  export function sum(arr: number[]) {
    return arr.reduce((a, b) => a + b, 0)
  }

  export function clamp(n: number, min: number, max: number) {
    return Math.min(Math.max(n, min), max)
  }

  export function minBy<T>(collection: T[], f: (_: T) => number): T {
    let min_score = Infinity
    let min_obj = undefined

    for (let obj of collection) {
      let score = f(obj)

      if (score < min_score) {
        min_score = score
        min_obj = obj
      }
    }

    return min_obj
  }

  export function maxBy<T>(collection: T[], f: (_: T) => number): T {
    return minBy(collection, e => -f(e))
  }

  export function sortBy<T>(collection: T[], f: (_: T) => number): T[] {
    return [...collection].sort((a, b) => f(a) - f(b))
  }

  export function sortByComparator<T>(collection: T[], f: (a: T, b: T) => number): T[] {
    return [...collection].sort(f)
  }

  export function sort(collection: number[]): number[] {
    return sortBy(collection, identity)
  }

  export function identity<T>(x: T): T {
    return x
  }

  export function sumBy<T>(elements: T[], f: (_: T, i: number) => number) {
    return sum(elements.map(f))
  }

  export function cloneDeep<T>(value: T): any {
    if (Array.isArray(value)) {
      return value.map(cloneDeep) as T;
    }

    if (value && typeof value === "object") {
      const result: Record<PropertyKey, unknown> = {};

      for (const key of Reflect.ownKeys(value)) {
        result[key] = cloneDeep((value as any)[key]);
      }

      return result as T;
    }

    return value;
  }
}