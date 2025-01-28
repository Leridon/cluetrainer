import * as L from "leaflet"
import * as leaflet from "leaflet"
import {v4 as uuidv4} from 'uuid';
import * as lodash from "lodash";
import {levenshteinEditDistance} from "levenshtein-edit-distance";
import {mixColor, unmixColor} from "alt1";
import {Vector2} from "../math";


export namespace util {

  export function natural_join(a: any[], connector: string = "and"): string {
    if (a.length == 0) return ""
    if (a.length == 1) return a.toString()
    if (a.length == 2) return `${a[0]} ${connector} ${a[1]}`

    return a.slice(0, -1).join(", ") + `, ${connector} ` + a[a.length - 1]
  }

  export function plural(n: number, word: string, postfix: string = "s"): string {
    let s = `${n} ${word}`

    if (n != 1) s += postfix

    return s
  }

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


  export function capitalize(s: string): string {
    return s ? s[0].toUpperCase() + s.slice(1) : ""
  }

  /**
   * Helper function to easily allow negative indexing to access elements at the back of array
   */
  export function index<T>(array: T[], index: number): T {
    return array[(array.length + index) % array.length]
  }

  export type nArray<T> = T | nArray<T>[]

  export function multiIndex<T>(nArray: nArray<T>, ...indices: number[]): T {
    let x = nArray

    indices.forEach(i => {
      x = index((x as nArray<T>[]), i)
    })

    return x as T
  }


  export function minIndex(array: number[]): number {
    return array.indexOf(Math.min(...array))
  }

  export function shorten_integer_list(l: number[], f: ((_: number) => string) = (n => n.toString())): string[] {
    l.sort(Order.natural_order)

    let res: string[] = []

    let start_range = l[0]
    let last = start_range

    for (let i = 1; i < l.length; i++) {
      let n = l[i]

      if (n <= last + 1) last = n
      else {
        if (last == start_range) res.push(f(last))
        else if (last == start_range + 1) res.push(f(start_range), f(last))
        else res.push(`${f(start_range)} - ${f(last)}`)

        start_range = n
        last = n
      }
    }

    if (last == start_range) res.push(f(last))
    else if (last == start_range + 1) res.push(f(start_range), f(last))
    else res.push(`${f(start_range)} - ${f(last)}`)

    return res
  }

  export function convert_bounds(bounds: L.Bounds): L.LatLngBounds {
    return leaflet.latLngBounds([
      [bounds.getTopLeft().y, bounds.getTopLeft().x],
      [bounds.getBottomRight().y, bounds.getBottomRight().x],
    ])
  }

  export function compose<T>(fn1: (a: T) => T, ...fns: Array<(a: T) => T>) {
    return fns.reduce((prevFn, nextFn) => value => nextFn(prevFn(value)), fn1);
  }

  export function swap<A, B>(a: A, b: B): [B, A] {
    return [b, a]
  }

  export function count<A>(a: A[], p: (_: A) => boolean): number {
    return a.reduce((x, y) => x + (p(y) ? 1 : 0), 0)
  }

  /**
   * This generic type can be used to ensure a defined type is a subtype of another type statically.
   * I'm 99% percent sure this already exists in some way, but could not find it.
   */
  export type ensure_subtype<Supertype, T extends Supertype> = T

  export function signedToString(n: number): string {
    return `${Math.sign(n) < 0 ? "" : "+"}${n}`
  }

  export function tap<T>(v: T, ...fs: ((_: T) => void)[]): T {
    fs.forEach(f => f(v))

    return v
  }

  export function profile<T>(f: () => T, name: string = null): T {
    console.time(name || f.name)
    let res = f()
    console.timeEnd(name || f.name)

    return res
  }

  export async function profileAsync<T>(f: () => Promise<T>, name: string = null): Promise<T> {
    console.time(name || f.name)
    let res = await f()
    console.timeEnd(name || f.name)

    return res
  }

  export function avg(...ns: number[]): number {
    return ns.reduce((a, b) => a + b, 0) / ns.length
  }

  export function positiveMod(a: number, b: number): number {
    a += Math.ceil(Math.abs(a / b)) * b

    return a % b
  }

  export function uuid(): string {
    return uuidv4()
  }

  /**
   * @return The current utc time as a unix timestamp (in seconds)
   */
  export function timestamp(): number {
    return Math.floor((new Date()).getTime() / 1000)
  }

  export async function asyncFilter<T>(collection: T[], predicate: (_: T) => Promise<boolean>): Promise<T[]> {
    let filters = await Promise.all(collection.map(predicate))

    return collection.filter((e, i) => filters[i])
  }

  export function todo(): never {
    throw new Error("Not implemented.")
  }

  export function copyUpdate<T>(value: T, updater: (_: T) => void): T {
    const copy = lodash.cloneDeep(value)

    updater(copy)

    return copy
  }

  export function copyUpdate2<T>(value: T, updater: (_: T) => void): T {
    const copy = lodash.clone(value)

    updater(copy)

    return copy
  }

  export function cleanedJSON(value: any, space: number = undefined) {
    return JSON.stringify(value, (key, value) => {
      if (key.startsWith("_")) return undefined
      return value
    }, space)
  }

  export function eqWithNull<T>(f: (a: T, b: T) => boolean): (a: T, b: T) => boolean {
    return (a, b) => (a == b) || (a != null && b != null && f(a, b))
  }

  export function downloadTextFile(filename: string, text: string) {
    download(filename, 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
  }

  export function download(filename: string, url: string) {
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  export function downloadBinaryFile(filename: string, data: Uint8Array) {
    download(filename, window.URL.createObjectURL(new Blob([data])))
  }

  export function selectFile(accept: string = undefined): Promise<File> {
    return new Promise(resolve => {
      // creating input on-the-fly
      const input = document.createElement("input");
      input.setAttribute("type", "file");

      if (accept) {
        input.setAttribute("accept", accept)
      }

      input.addEventListener("change", (e) => {
        resolve((e.currentTarget as HTMLInputElement).files?.[0])
      })

      // add onchange handler if you wish to get the file :)
      input.click(); // opening dialog
    })
  }

  export function stringSimilarity(string: string, reference: string): number {
    return 1 - levenshteinEditDistance(string, reference, true) / reference.length
  }

  export function scoreAll<T>(collection: T[], score_f: (_: T) => number): {
    value: T,
    score: number
  }[] {
    return collection.map(e => ({value: e, score: score_f(e)}))
  }

  export function findBestMatch<T>(collection: T[], score_f: (_: T) => number, min_score: number = undefined, inverted: boolean = false): {
    value: T,
    score: number
  } | null {
    const elements = collection.map(e => ({value: e, score: score_f(e)}))

    if (inverted) {
      const e = lodash.minBy(elements, e => e.score)
      if (min_score != undefined && e.score > min_score) return null
      else return e
    } else {
      const e = lodash.maxBy(elements, e => e.score)
      if (min_score != undefined && e.score < min_score) return null
      else return e
    }
  }

  export function hslSimilarity(a: [number, number, number], b: [number, number, number]): number {
    function hue_delta(a: number, b: number) {
      let c = Math.abs(a - b);

      if (c > 128) c = 255 - c

      return c / 128
    }

    // All components are normalized to the interval [0, 1]
    return (1 - (hue_delta(a[0], b[0]))
      * (1 - (Math.abs(a[1] - b[1]) / 255))
      * (1 - (Math.abs(a[2] - b[2]) / 255)))
  }


  export namespace A1Color {
    export function fromHex(hex: string): number {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

      const r = parseInt(result[1], 16)
      const g = parseInt(result[2], 16)
      const b = parseInt(result[3], 16)

      return mixColor(r, g, b)
    }

    export function toHex(value: number): string {
      const [r, g, b] = unmixColor(value)

      function componentToHex(c: number) {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }

      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }
  }

  export function rgbSimilarity(a: [number, number, number], b: [number, number, number]): number {
    function channelSimilarity(x: number, y: number): number {
      return Math.max(0, 1 - Math.abs(x - y) / 128)
    }

    return (channelSimilarity(a[0], b[0])
      + channelSimilarity(a[1], b[1])
      + channelSimilarity(a[2], b[2])) / 3
  }


  export function rgbContrast(a: [number, number, number], b: [number, number, number]): number {
    return 1 - rgbSimilarity(a, b)
  }

  export function greatestCommonDivisor(a: number, b: number): number {
    if (b == 0) return Math.abs(a)
    else return greatestCommonDivisor(b, a % b)
  }

  export function sampleImage(img: ImageData, pos: Vector2): [number, number, number] {
    return img.getPixel(pos.x, pos.y) as any
  }

  export function positive_mod(x: number, mod: number) {
    return ((x % mod) + mod) % mod;
  }

  export function factorial(n: number, lower: number = 1): number {
    if (n <= lower) return 1
    else return n * factorial(n - 1, lower)
  }

  export function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  export function padInteger(n: number, length: number): string {
    return lodash.padStart(n.toString(), length, "0")
  }

  export function chooseRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  export function formatTime(timestamp: number): string {
    const date = new Date(timestamp)

    return `${padInteger(date.getHours(), 2)}:${padInteger(date.getMinutes(), 2)}:${padInteger(date.getSeconds(), 2)}.${padInteger(date.getMilliseconds(), 4)}`
  }

  export function formatTimeWithoutMilliseconds(timestamp: number): string {
    const date = new Date(timestamp)

    return `${padInteger(date.getHours(), 2)}:${padInteger(date.getMinutes(), 2)}:${padInteger(date.getSeconds(), 2)}`
  }

  export class AsyncInitialization<T = any> {
    private _is_initialized: boolean = false
    private _value: T = undefined
    private promise: Promise<T>

    constructor(f: () => Promise<T>) {
      this.promise = f().then(v => {
        this._is_initialized = true
        this._value = v
        return v
      })
    }

    isInitialized(): boolean {
      return this._is_initialized
    }

    wait(): Promise<any> {
      return this.promise
    }

    get(): T {
      return this._value
    }
  }

  export function async_init<T>(f: () => Promise<T>) {
    return new AsyncInitialization(f)
  }

  export async function delay(t: number): Promise<void> {
    return new Promise(done => setTimeout(done, t));
  }

  export function renderTimespan(milliseconds: number): string {
    const SECOND =  1000
    const MINUTE = 60 * SECOND
    const HOUR = 60 * MINUTE
    const DAY = 24 * HOUR

    if (milliseconds > 2 * DAY) return plural(Math.floor(milliseconds / DAY), "day")
    if (milliseconds > 3 * HOUR) return plural(Math.floor(milliseconds / HOUR), "hour")
    if (milliseconds > 2 * MINUTE) return plural(Math.floor(milliseconds / MINUTE), "minute")
    return plural(Math.floor(milliseconds / SECOND), "second")
  }
}