import {ewent, Ewent} from "./Ewent";
import {EwentHandler} from "./EwentHandler";
import {ObservableArray} from "./ObservableArray";
import {Observable} from "./Observable";

export * from "./Ewent";
export * from "./EwentHandler"
export * from "./ObservableArray"
export * from "./Observable"

export namespace Reactive {
  export class CombinedEventMap<T extends Record<string, any>> {
    private events: { [key in keyof T]?: Ewent<T[key]> } = {};

    get<K extends keyof T>(k: K): Ewent<T[K]> {
      return this.events[k] ?? (this.events[k] = ewent<T[K]>());
    }

    on<K extends keyof T>(event: K, listener: (v: T[K]) => void): EwentHandler<T[K]> {
      return this.get(event).on(listener)
    }
  }

  export type EventMapKey<T extends CombinedEventMap<Record<string, any>>> = T extends CombinedEventMap<infer Q> ? keyof Q : never
}


export function observe<T>(v: T): Observable.Simple<T> {
  return new Observable.Simple(v)
}

export function observeArray<T>(v: T[]): ObservableArray<T> {
  return new ObservableArray<T>().setTo(v)
}