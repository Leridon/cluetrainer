import { Ewent } from "./Ewent";
import { EwentHandler } from "./index";
import { LifetimeManager } from "../lifetime/LifetimeManager";
export interface Observable<T> {
    changed: Ewent<{
        value: T;
        old?: T;
    }>;
    value(): T;
    set(v: T): void;
    update(f: (v: T) => void): void;
    update2(f: (v: T) => void): void;
    subscribe(handler: (new_value: T, old: T) => any, trigger_once?: boolean, handler_f?: (_: EwentHandler<any>) => void): this;
    map<U>(f: (_: T) => U, lifetime_manager?: LifetimeManager): Observable.Derived<U, T>;
    bindTo(other: Observable<T>): this;
    bind(other: Observable<T>): this;
}
export declare namespace Observable {
    export class AbstractObservable<T> implements Observable<T> {
        protected _value: T;
        private equality_f;
        changed: Ewent.Real<{
            value: T;
            old?: T;
        }>;
        protected trigger_changed(old_value: T): Promise<any>;
        observerCount(): number;
        protected _set(v: T): void;
        equality(f: (a: T, b: T) => boolean): this;
        structuralEquality(): this;
        value(): T;
        set(v: T): void;
        update(f: (v: T) => void): void;
        update2(f: (v: T) => void): void;
        subscribe2(handler: (new_value: T, old: T) => any, trigger_once?: boolean): EwentHandler<any>;
        subscribe(handler: (new_value: T, old: T) => any, trigger_once?: boolean, handler_f?: (_: EwentHandler<any>) => void): this;
        map<U>(f: (_: T) => U, lifetime_manager?: LifetimeManager): Observable.Derived<U, T>;
        bindTo(other: Observable<T>): this;
        bind(other: Observable<T>): this;
    }
    export class Derived<T, U> extends AbstractObservable<T> {
        private lifetime_manager;
        constructor(base: Observable<U>, f: (_: U) => T, lifetime_manager: LifetimeManager);
        set(v: T): void;
    }
    export class Simple<T> extends AbstractObservable<T> {
        constructor(v: T);
    }
    type ex<T> = T extends Observable<infer U> ? U : never;
    export function observe_combined<T extends Record<string, Observable<any>>>(o: T, lifetime_manager?: LifetimeManager): Observable<{
        [key in keyof T]?: ex<T[key]>;
    }>;
    export {};
}
