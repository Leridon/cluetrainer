import { Observable } from "./Observable";
/**
 * The observed value is considered to change when any of its elements change.
 * In addition, there are several events that allow a more detailed view on changes
 */
export declare class ObservableArray<T> extends Observable.AbstractObservable<ObservableArray.ObservableArrayValue<T>[]> {
    element_added: import("./Ewent").Ewent.Real<ObservableArray.ObservableArrayValue<T>>;
    element_removed: import("./Ewent").Ewent.Real<ObservableArray.ObservableArrayValue<T>>;
    element_changed: import("./Ewent").Ewent.Real<ObservableArray.ObservableArrayValue<T>>;
    array_changed: import("./Ewent").Ewent.Real<{
        order: boolean;
        set: boolean;
        data: ObservableArray.ObservableArrayValue<T>[];
    }>;
    constructor();
    update(f: (v: ObservableArray.ObservableArrayValue<T>[]) => void): void;
    set(v: ObservableArray.ObservableArrayValue<T>[]): void;
    add(v: T): ObservableArray.ObservableArrayValue<T>;
    remove(v: ObservableArray.ObservableArrayValue<T>): void;
    get(): ObservableArray.ObservableArrayValue<T>[];
    setTo(data: T[]): this;
    move(from: number, to: number): this;
    private updateIndices;
}
export declare namespace ObservableArray {
    class ObservableArrayValue<T> extends Observable.Simple<T> {
        _parent: ObservableArray<T>;
        removed: import("./Ewent").Ewent.Real<ObservableArrayValue<T>>;
        index: Observable.Simple<number>;
        constructor(_parent: ObservableArray<T>, value: T);
        parent(): ObservableArray<T>;
        remove(): void;
        moveTo(i: number): this;
        move(delta: number): this;
    }
}
