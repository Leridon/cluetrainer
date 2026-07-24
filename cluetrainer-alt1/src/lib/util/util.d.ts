import { Vector2 } from "cluetrainer-core/math/Vector2";
export declare namespace util {
    function natural_join(a: any[], connector?: string): string;
    function plural(n: number, word: string, postfix?: string): string;
    function capitalize(s: string): string;
    /**
     * Helper function to easily allow negative indexing to access elements at the back of array
     */
    function index<T>(array: T[], index: number): T;
    type nArray<T> = T | nArray<T>[];
    function multiIndex<T>(nArray: nArray<T>, ...indices: number[]): T;
    function minIndexBy<T>(arr: T[], selector: (item: T) => number): number;
    function minIndex(array: number[]): number;
    function shorten_integer_list(l: number[], f?: ((_: number) => string)): string[];
    function compose<T>(fn1: (a: T) => T, ...fns: Array<(a: T) => T>): (a: T) => T;
    function swap<A, B>(a: A, b: B): [B, A];
    function count<A>(a: A[], p: (_: A) => boolean): number;
    /**
     * This generic type can be used to ensure a defined type is a subtype of another type statically.
     * I'm 99% percent sure this already exists in some way, but could not find it.
     */
    type ensure_subtype<Supertype, T extends Supertype> = T;
    function signedToString(n: number): string;
    function tap<T>(v: T, ...fs: ((_: T) => void)[]): T;
    function profile<T>(f: () => T, name?: string): T;
    function profileAsync<T>(f: () => Promise<T>, name?: string, start_message?: boolean): Promise<T>;
    function avg(...ns: number[]): number;
    function positiveMod(a: number, b: number): number;
    function uuid(): string;
    /**
     * @return The current utc time as a unix timestamp (in seconds)
     */
    function timestamp(): number;
    function asyncFilter<T>(collection: T[], predicate: (_: T) => Promise<boolean>): Promise<T[]>;
    function todo(): never;
    function copyUpdate<T>(value: T, updater: (_: T) => void): T;
    function copyUpdate2<T>(value: T, updater: (_: T) => void): T;
    function cleanedJSON(value: any, space?: number): string;
    function eqWithNull<T>(f: (a: T, b: T) => boolean): (a: T, b: T) => boolean;
    function downloadTextFile(filename: string, text: string): void;
    function download(filename: string, url: string): void;
    function downloadBinaryFile(filename: string, data: Uint8Array): void;
    /**
     * Opens a file selection dialog and allows the user to select a file. Optionally, restricts the type of files selectable.
     *
     * @param {string} [accept] - A string specifying the accepted file types, for example "image/png"
     * @return {Promise<File>} A promise that resolves to the selected file. If no file is selected, resolves to undefined.
     */
    function selectFile(accept?: string): Promise<File>;
    function stringSimilarity(string: string, reference: string): number;
    function scoreAll<T>(collection: T[], score_f: (_: T) => number): {
        value: T;
        score: number;
    }[];
    function findBestMatch<T>(collection: T[], score_f: (_: T) => number, min_score?: number, inverted?: boolean): {
        value: T;
        score: number;
    } | null;
    function hslSimilarity(a: [number, number, number], b: [number, number, number]): number;
    function rgbSimilarity(a: [number, number, number], b: [number, number, number]): number;
    function rgbContrast(a: [number, number, number], b: [number, number, number]): number;
    function greatestCommonDivisor(a: number, b: number): number;
    function sampleImage(img: ImageData, pos: Vector2): [number, number, number];
    function positive_mod(x: number, mod: number): number;
    function factorial(n: number, lower?: number): number;
    function numberWithCommas(x: number): string;
    function padInteger(n: number, length: number): string;
    function chooseRandom<T>(items: T[]): T;
    function formatTime(timestamp: number): string;
    function formatTimeWithoutMilliseconds(timestamp: number): string;
    class AsyncInitialization<T = any> {
        private _is_initialized;
        private _value;
        private promise;
        constructor(f: () => Promise<T>);
        isInitialized(): boolean;
        wait(): Promise<any>;
        get(): T;
    }
    function async_init<T>(f: () => Promise<T>): AsyncInitialization<T>;
    function delay(t: number): Promise<void>;
    function renderTimespan(milliseconds: number): string;
    function findAsync<T>(arr: T[], asyncCallback: (e: T) => Promise<boolean>): Promise<T>;
    function median(list: number[]): number;
    function makeCSV<T>(data: T[], separator?: string): (...columns: {
        name: string;
        f: (_: T) => any;
    }[]) => string;
    /**
     * Removes elements from both ends of an array as long as they satisfy the given predicate.
     *
     * @param {T[]} arr - The array to process.
     * @param {(item: T) => boolean} predicate - A function that tests each element of the array.
     * @return {T[]} A new array with elements removed from the beginning and end that satisfy the predicate.
     */
    function dropWhileBidirectional<T>(arr: T[], predicate: (_: T) => boolean): T[];
}
