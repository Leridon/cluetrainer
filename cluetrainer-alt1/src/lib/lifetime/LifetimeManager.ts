import {LifetimeManaged} from "./LifetimeManaged";

export class LifetimeManager implements LifetimeManaged {
  private managed: (() => void)[] = []

  bind(...h: (LifetimeManaged | (() => void))[]): this {
    h.forEach(h => {
      if (typeof h == "function") {
        this.managed.push(h)
      } else {
        this.managed.push(() => h.endLifetime())
      }
    })

    return this
  }

  kill(): void {
    this.managed.forEach(h => h())
    this.managed = []
  }

  endLifetime(): void {
    this.kill()
  }
}