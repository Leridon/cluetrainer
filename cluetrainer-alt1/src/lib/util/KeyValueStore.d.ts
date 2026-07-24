export declare class KeyValueStoreVariable<T> {
    readonly store: KeyValueStore;
    readonly key: string;
    constructor(store: KeyValueStore, key: string);
    get(): Promise<T>;
    set(v: T): Promise<void>;
}
export default class KeyValueStore {
    readonly name: string;
    db: Promise<IDBDatabase>;
    constructor(name: string);
    private getStore;
    get<T>(key: string): Promise<T>;
    set(key: string, value: any): Promise<void>;
    variable<T>(key: string): KeyValueStoreVariable<T>;
    clear(): Promise<void>;
    private static _instances;
    static get(name: string): KeyValueStore;
    static instance(): KeyValueStore;
}
