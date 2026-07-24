import lodash from "lodash";
import { ewent } from "./Ewent";
import { observe } from "./index";
import { FakeLodash } from "../coreutil/FakeLodash";
export var Observable;
(function (Observable) {
    class AbstractObservable {
        _value = null;
        equality_f = (a, b) => a == b;
        changed = ewent();
        trigger_changed(old_value) {
            return this.changed.trigger({ value: this._value, old: old_value });
        }
        observerCount() {
            return this.changed.handlerCount();
        }
        _set(v) {
            let old = this._value;
            this._value = v;
            if (!this.equality_f(old, this._value))
                this.trigger_changed(old);
        }
        equality(f) {
            this.equality_f = f;
            return this;
        }
        structuralEquality() {
            this.equality(lodash.isEqual);
            return this;
        }
        value() {
            return this._value;
        }
        set(v) {
            this._set(v);
        }
        update(f) {
            f(this._value);
            this.trigger_changed(undefined);
        }
        update2(f) {
            let old = FakeLodash.cloneDeep(this._value);
            f(this._value);
            if (!this.equality_f(old, this._value))
                this.trigger_changed(old);
        }
        subscribe2(handler, trigger_once = false) {
            let h = this.changed.on((o) => handler(o.value, o.old));
            if (trigger_once)
                handler(this._value, undefined);
            return h;
        }
        subscribe(handler, trigger_once = false, handler_f = null) {
            let h = this.subscribe2(handler, trigger_once);
            if (handler_f)
                handler_f(h);
            return this;
        }
        map(f, lifetime_manager = undefined) {
            return new Observable.Derived(this, f, lifetime_manager);
        }
        bindTo(other) {
            other.subscribe(v => this._set(v));
            this._set(other.value());
            return this;
        }
        bind(other) {
            this.bindTo(other);
            other.bindTo(this);
            return this;
        }
    }
    Observable.AbstractObservable = AbstractObservable;
    class Derived extends AbstractObservable {
        lifetime_manager;
        constructor(base, f, lifetime_manager) {
            super();
            this.lifetime_manager = lifetime_manager;
            base.subscribe((v) => this._set(f(v)), true, h => lifetime_manager?.bind(h));
        }
        set(v) {
            throw new TypeError("Set not supported on derived observable");
        }
    }
    Observable.Derived = Derived;
    class Simple extends AbstractObservable {
        constructor(v) {
            super();
            this._value = v;
        }
    }
    Observable.Simple = Simple;
    function observe_combined(o, lifetime_manager = undefined) {
        let obs = observe({});
        for (let key in o) {
            o[key].subscribe(v => obs.update(observed => observed[key] = v), true, h => lifetime_manager?.bind(h));
        }
        return obs;
    }
    Observable.observe_combined = observe_combined;
})(Observable || (Observable = {}));
