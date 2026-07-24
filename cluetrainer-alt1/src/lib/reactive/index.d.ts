import { Ewent } from "./Ewent";
import { EwentHandler } from "./EwentHandler";
import { ObservableArray } from "./ObservableArray";
import { Observable } from "./Observable";
export * from "./Ewent";
export * from "./EwentHandler";
export * from "./ObservableArray";
export * from "./Observable";
export declare namespace Reactive {
    class CombinedEventMap<T extends Record<string, any>> {
        private events;
        get<K extends keyof T>(k: K): Ewent<T[K]>;
        on<K extends keyof T>(event: K, listener: (v: T[K]) => void): EwentHandler<T[K]>;
    }
    type EventMapKey<T extends CombinedEventMap<Record<string, any>>> = T extends CombinedEventMap<infer Q> ? keyof Q : never;
}
export declare function observe<T>(v: T): Observable.Simple<T>;
export declare function observeArray<T>(v: T[]): ObservableArray<T>;
