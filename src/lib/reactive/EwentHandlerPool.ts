import {EwentHandler} from "./EwentHandler";

export class EwentHandlerPool {
  private handlers: EwentHandler<any>[] = []

  bind(h: EwentHandler<any>): this {
    this.handlers.push(h)

    return this
  }

  kill(): void {
    this.handlers.forEach(h => h.remove())
  }
}