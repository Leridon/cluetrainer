export interface LifetimeManaged {
  endLifetime(): void
}

export namespace LifetimeManaged {
  export function wrap<T>(e: T, f: (_: T) => void) {
    return new class implements LifetimeManaged {
      endLifetime(): void {
        f(e)
      }
    }
  }
}