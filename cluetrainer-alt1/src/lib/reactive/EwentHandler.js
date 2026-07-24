export class EwentHandler {
    handler;
    alive = true;
    constructor(handler) {
        this.handler = handler;
    }
    remove() {
        this.alive = false;
        this.handler = null; // Remove reference to handler to immediately qualify it for garbage collection
    }
    apply(v) {
        return this.handler(v);
    }
    isAlive() {
        return this.alive;
    }
    bindTo(pool) {
        pool.bind(this);
        return this;
    }
    endLifetime() {
        this.remove();
    }
}
export var EventHandler;
(function (EventHandler) {
    class Once extends EwentHandler {
        apply(v) {
            this.remove();
            return super.apply(v);
        }
    }
    EventHandler.Once = Once;
})(EventHandler || (EventHandler = {}));
