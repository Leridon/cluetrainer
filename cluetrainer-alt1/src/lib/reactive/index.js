import { ewent } from "./Ewent";
import { ObservableArray } from "./ObservableArray";
import { Observable } from "./Observable";
export * from "./Ewent";
export * from "./EwentHandler";
export * from "./ObservableArray";
export * from "./Observable";
export var Reactive;
(function (Reactive) {
    class CombinedEventMap {
        events = {};
        get(k) {
            return this.events[k] ?? (this.events[k] = ewent());
        }
        on(event, listener) {
            return this.get(event).on(listener);
        }
    }
    Reactive.CombinedEventMap = CombinedEventMap;
})(Reactive || (Reactive = {}));
export function observe(v) {
    return new Observable.Simple(v);
}
export function observeArray(v) {
    return new ObservableArray().setTo(v);
}
