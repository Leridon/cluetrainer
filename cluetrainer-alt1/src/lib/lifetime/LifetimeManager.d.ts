import { LifetimeManaged } from "./LifetimeManaged";
export declare class LifetimeManager implements LifetimeManaged {
    private managed;
    bind(...h: (LifetimeManaged | (() => void))[]): this;
    kill(): void;
    endLifetime(): void;
}
