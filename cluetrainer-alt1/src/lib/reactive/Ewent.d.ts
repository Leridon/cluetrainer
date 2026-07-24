import { EwentHandler } from "./EwentHandler";
export interface Ewent<T> {
    on(listener: (_: T) => any | Promise<any>): EwentHandler<T>;
    filtered(predicate: (e: T) => boolean): Ewent.Filtered<T>;
}
export declare function ewent<T>(): Ewent.Real<T>;
export declare namespace Ewent {
    abstract class AbstractEwent<T> implements Ewent<T> {
        filtered(predicate: (e: T) => boolean): Ewent.Filtered<T>;
        abstract on(listener: (_: T) => any): EwentHandler<T>;
    }
    class Real<T> extends AbstractEwent<T> {
        private trigger_count;
        private handlers;
        private clean_pass;
        /**
         * Subscribes a listener to this event.
         * @return An event handler instance that can be cancelled
         * @param listener The handler function
         */
        on(listener: (_: T) => any | Promise<any>): EwentHandler<T>;
        handlerCount(): number;
        /**
         * Triggers this event.
         * @param v
         */
        trigger(v: T): Promise<void[]>;
    }
    class Filtered<T> extends AbstractEwent<T> {
        private base;
        private predicate;
        constructor(base: Ewent<T>, predicate: (_: T) => boolean);
        on(listener: (_: T) => any): EwentHandler<T>;
    }
    class Derived<T, U> extends AbstractEwent<U> {
        private base;
        private map;
        constructor(base: Ewent<T>, map: (_: T) => U);
        on(listener: (_: U) => any): EwentHandler<U>;
    }
}
