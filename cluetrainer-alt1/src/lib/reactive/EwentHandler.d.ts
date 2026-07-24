import { LifetimeManaged } from "../lifetime/LifetimeManaged";
import { LifetimeManager } from "../lifetime/LifetimeManager";
export declare class EwentHandler<T> implements LifetimeManaged {
    private handler;
    private alive;
    constructor(handler: (_: T) => void | Promise<void>);
    remove(): void;
    apply(v: T): void | Promise<void>;
    isAlive(): boolean;
    bindTo(pool: LifetimeManager): this;
    endLifetime(): void;
}
export declare namespace EventHandler {
    class Once<T> extends EwentHandler<T> {
        apply(v: T): void | Promise<void>;
    }
}
