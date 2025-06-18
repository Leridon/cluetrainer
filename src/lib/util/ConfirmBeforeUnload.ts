import {LifetimeManaged} from "../lifetime/LifetimeManaged";
import {lazy} from "../Lazy";

export class ConfirmBeforeUnload {
  private tokens: ConfirmBeforeUnload.Token[] = [];

  private constructor() { }

  private update_state() {
    window.onbeforeunload =
      this.tokens.length > 0
        ? () => true
        : null
  }

  private unregister(token: ConfirmBeforeUnload.Token) {
    this.tokens = this.tokens.filter(t => t !== token)
    this.update_state()
  }

  register(): ConfirmBeforeUnload.Token {
    const self = this;

    const token = new class implements ConfirmBeforeUnload.Token {
      endLifetime(): void {
        this.revoke()
      }

      revoke() {
        self.unregister(this)
      }
    }

    this.tokens.push(token)

    this.update_state()

    return token
  }

  static _instance = lazy(() => new ConfirmBeforeUnload())

  static instance(): ConfirmBeforeUnload {
    return ConfirmBeforeUnload._instance.get()
  }
}

export namespace ConfirmBeforeUnload {
  export interface Token extends LifetimeManaged {
    revoke(): void;
  }
}

