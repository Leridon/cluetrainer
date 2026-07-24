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

  export function minBy<T>(collection: T[], f: (_: T) => number): T | undefined {
    let min_score = Infinity
    let min_obj: T | undefined = undefined

    for (let obj of collection) {
      let score = f(obj)

      if (score < min_score) {
        min_score = score
        min_obj = obj
      }
    }

    return min_obj
  }

  export function maxBy<T>(collection: T[], f: (_: T) => number): T | undefined {
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

  export function random(max: number): number;
  export function random(min: number, max: number): number;
  export function random(minOrMax: number, max?: number): number {
    const min = max === undefined ? 0 : minOrMax;
    const upper = max === undefined ? minOrMax : max;
    return Math.floor(Math.random() * (upper - min + 1)) + min;
  }

  export function rangeRight(start: number, end: number, step = 1): number[] {
    const result = [];
    for (let i = end - step; i >= start; i -= step) {
      result.push(i);
    }
    return result;
  }

  export function padStart(
    value: string | number,
    length: number,
    chars = " "
  ): string {
    const str = String(value);

    if (str.length >= length || chars.length === 0) {
      return str;
    }

    const padLength = length - str.length;
    const padding = chars.repeat(Math.ceil(padLength / chars.length)).slice(0, padLength);

    return padding + str;
  }

  export function capitalize(value: string): string {
    if (value.length === 0) {
      return "";
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  export function zip<T extends readonly unknown[][]>(
    ...arrays: T
  ): {
    [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never;
  }[] {
    const length = Math.max(...arrays.map(a => a.length), 0);

    return Array.from({ length }, (_, i) =>
      arrays.map(a => a[i]) as {
        [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never;
      }
    );
  }

  export function isEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) {
      return true;
    }

    if (
      a === null || b === null ||
      typeof a !== "object" ||
      typeof b !== "object"
    ) {
      return false;
    }

    if (Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }

    if (Array.isArray(a)) {
      const aa = a as unknown[];
      const bb = b as unknown[];

      if (aa.length !== bb.length) {
        return false;
      }

      return aa.every((v, i) => isEqual(v, bb[i]));
    }

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every(
      key => Object.hasOwn(bObj, key) && isEqual(aObj[key], bObj[key])
    );
  }
}