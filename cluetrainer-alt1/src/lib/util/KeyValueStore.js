export class KeyValueStoreVariable {
    store;
    key;
    constructor(store, key) {
        this.store = store;
        this.key = key;
    }
    get() {
        return this.store.get(this.key);
    }
    set(v) {
        return this.store.set(this.key, v);
    }
}
export default class KeyValueStore {
    name;
    db;
    constructor(name) {
        this.name = name;
        this.db = new Promise((resolve, reject) => {
            if (!window?.indexedDB) {
                reject("indexedDB not supported");
                return;
            }
            const request = window.indexedDB.open(name, 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("error");
            request.onupgradeneeded = () => {
                const store = request.result.createObjectStore("kv-store", { keyPath: "k", });
                store.transaction.oncomplete = () => store.transaction.db;
            };
        });
    }
    async getStore(mode) {
        return (await this.db).transaction("kv-store", mode).objectStore("kv-store");
    }
    get(key) {
        return new Promise(async (resolve, reject) => {
            const request = (await this.getStore("readonly")).get(key);
            request.onerror = reject;
            request.onsuccess = () => resolve(request.result?.v);
        });
    }
    set(key, value) {
        return new Promise(async (resolve, reject) => {
            const request = (await this.getStore("readwrite")).put({ k: key, v: value });
            request.onsuccess = () => resolve();
            request.onerror = reject;
        });
    }
    variable(key) {
        return new KeyValueStoreVariable(this, key);
    }
    async clear() {
        let s = await this.getStore("readwrite");
        s.clear();
    }
    static _instances = {};
    static get(name) {
        if (!KeyValueStore._instances[name])
            KeyValueStore._instances[name] = new KeyValueStore(name);
        return KeyValueStore._instances[name];
    }
    static instance() {
        return this.get("key-value-store");
    }
}
