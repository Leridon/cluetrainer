export interface LifetimeManaged {
    endLifetime(): void;
}
export declare namespace LifetimeManaged {
    function wrap<T>(e: T, f: (_: T) => void): {
        endLifetime(): void;
    };
}
