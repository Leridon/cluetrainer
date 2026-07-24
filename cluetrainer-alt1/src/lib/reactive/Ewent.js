import { EwentHandler } from "./EwentHandler";
export function ewent() {
    return new Ewent.Real();
}
export var Ewent;
(function (Ewent) {
    class AbstractEwent {
        filtered(predicate) {
            return new Filtered(this, predicate);
        }
    }
    Ewent.AbstractEwent = AbstractEwent;
    class Real extends AbstractEwent {
        trigger_count = 0;
        handlers = [];
        // TODO: Save handlers as weak references to allow garbage collection to clear them
        //      Drawback: Handlers must be saved elsewhere to guarantee their lifetime. Maybe decide on a by-handler basis?
        //      Can use a handler pool for this, without the need to kill them explicitly
        clean_pass() {
            this.trigger_count += 1;
            if (this.trigger_count > 10) {
                this.handlers = this.handlers.filter(s => s.isAlive());
            }
        }
        /**
         * Subscribes a listener to this event.
         * @return An event handler instance that can be cancelled
         * @param listener The handler function
         */
        on(listener) {
            this.clean_pass();
            let h = new EwentHandler(listener);
            this.handlers.push(h);
            return h;
        }
        handlerCount() {
            return this.handlers.length;
        }
        /**
         * Triggers this event.
         * @param v
         */
        trigger(v) {
            this.clean_pass();
            return Promise.all(this.handlers.filter(h => h.isAlive()).map(h => h.apply(v)));
        }
    }
    Ewent.Real = Real;
    class Filtered extends AbstractEwent {
        base;
        predicate;
        constructor(base, predicate) {
            super();
            this.base = base;
            this.predicate = predicate;
        }
        on(listener) {
            return this.base.on(e => {
                if (this.predicate(e))
                    listener(e);
            });
        }
    }
    Ewent.Filtered = Filtered;
    class Derived extends AbstractEwent {
        base;
        map;
        constructor(base, map) {
            super();
            this.base = base;
            this.map = map;
        }
        on(listener) {
            return this.base.on(e => listener(this.map(e)));
        }
    }
    Ewent.Derived = Derived;
})(Ewent || (Ewent = {}));
