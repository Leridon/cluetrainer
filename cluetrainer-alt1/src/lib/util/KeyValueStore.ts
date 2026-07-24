export class KeyValueStoreVariable<T> {
  constructor(public readonly store: KeyValueStore, public readonly key: string) { }

  get(): Promise<T> {
    return this.store.get(this.key)
  }

  set(v: T): Promise<void> {
    return this.store.set(this.key, v)
  }
}

export default class KeyValueStore {

  db: Promise<IDBDatabase>

  constructor(public readonly name: string) {
    this.db = new Promise<IDBDatabase>((resolve, reject) => {
      if (!window?.indexedDB) {
        reject("indexedDB not supported")
        return
      }

      const request = window.indexedDB.open(name, 1)

      request.onsuccess = () => resolve(request.result)

      request.onerror = () => reject("error")

      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("kv-store", {keyPath: "k",})
        store.transaction.oncomplete = () => store.transaction.db
      }
    })

  }

  private async getStore(mode: "readonly" | "readwrite"): Promise<IDBObjectStore> {
    return (await this.db).transaction("kv-store", mode).objectStore("kv-store")
  }

  get<T>(key: string): Promise<T> {
    return new Promise<T | undefined>(async (resolve, reject) => {
      const request = (await this.getStore("readonly")).get(key)
      request.onerror = reject
      request.onsuccess = () => resolve(request.result?.v as T)
    })
  }


  set(key: string, value: any): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const request = (await this.getStore("readwrite")).put({k: key, v: value})
      request.onsuccess = () => resolve()
      request.onerror = reject
    })
  }

  variable<T>(key: string): KeyValueStoreVariable<T> {
    return new KeyValueStoreVariable<T>(this, key)
  }

  async clear(): Promise<void> {
    let s = await this.getStore("readwrite");
    s.clear()
  }

  private static _instances: Record<string, KeyValueStore> = {}

  static get(name: string): KeyValueStore {
    if (!KeyValueStore._instances[name]) KeyValueStore._instances[name] = new KeyValueStore(name)
    return KeyValueStore._instances[name]
  }

  static instance(): KeyValueStore {
    return this.get("key-value-store")
  }
}