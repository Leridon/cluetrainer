import { DisposableArray } from "./alt1gltypes";

type GlReffable = {
    ref(): void,
    unref(): void,
    detach(): void,
    [Symbol.dispose](): void
};

export function disposableArray<T extends GlReffable>(raw: T[]): DisposableArray<T> {
    raw[Symbol.dispose] = () => {
        for (let item of raw) {
            item[Symbol.dispose]?.();
        }
    }
    return raw as DisposableArray<T>;
}

export class ReffingMap<K extends GlReffable, V> {
    private map = new Map<K, V>();
    get(key: K) {
        return this.map.get(key);
    }
    set(key: K, value: V) {
        if (!this.map.has(key)) {
            this.map.set(key, value);
            key.ref();
        }
    }
    delete(key: K) {
        if (this.map.has(key)) {
            this.map.delete(key);
            key.unref();
        }
    }
    clear() {
        this.map.forEach((v, k) => k.unref());
        this.map.clear();
    }
    [Symbol.dispose]() {
        this.clear();
    }
    [Symbol.iterator]() {
        return this.map[Symbol.iterator]();
    }
}