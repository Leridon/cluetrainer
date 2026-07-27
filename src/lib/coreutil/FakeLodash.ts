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
    if (collection.length == 0) return undefined

    let min_score = f(collection[0])
    let min_obj = collection[0]

    for (let i = 1; i < collection.length; i++) {
      const obj = collection[i]
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

  export function cloneDeep<T>(value: T): T {
    function helper<T>(value: T, seen = new Map<object, unknown>()): T {
      if (value === null || typeof value !== "object") {
        return value;
      }

      const object = value as object;
      const existing = seen.get(object);

      if (existing !== undefined) {
        return existing as T;
      }

      if (value instanceof Date) {
        return new Date(value.getTime()) as T;
      }

      if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags) as T;
      }

      if (value instanceof Map) {
        const clone = new Map();
        seen.set(object, clone);

        for (const [key, item] of value) {
          clone.set(helper(key, seen), helper(item, seen));
        }

        return clone as T;
      }

      if (value instanceof Set) {
        const clone = new Set();
        seen.set(object, clone);

        for (const item of value) {
          clone.add(helper(item, seen));
        }

        return clone as T;
      }

      if (Array.isArray(value)) {
        const clone: unknown[] = [];
        seen.set(object, clone);

        for (const item of value) {
          clone.push(helper(item, seen));
        }

        return clone as T;
      }

      // Preserve class prototype without invoking its constructor.
      const clone = Object.create(Object.getPrototypeOf(value)) as Record<
        PropertyKey,
        unknown
      >;

      seen.set(object, clone);

      for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);

        if (!descriptor) {
          continue;
        }

        if ("value" in descriptor) {
          descriptor.value = helper(descriptor.value, seen);
        }

        Object.defineProperty(clone, key, descriptor);
      }

      return clone as T;
    }

    return helper(value)
  }
}