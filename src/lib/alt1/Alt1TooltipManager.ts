import {LifetimeManaged} from "../lifetime/LifetimeManaged";

export class Alt1TooltipManager {
  private active_instance: Alt1TooltipManager.Instance = null

  setTooltip(tooltip: string): Alt1TooltipManager.Instance {
    if (this.active_instance) this.removeTooltip(this.active_instance)

    alt1.setTooltip(tooltip)

    return this.active_instance = new Alt1TooltipManager.Instance(
      tooltip,
      this
    )
  }

  public removeTooltip(instance: Alt1TooltipManager.Instance) {
    if (this.active_instance == instance) {
      alt1.clearTooltip()

      this.active_instance = null
    }
  }
}

export namespace Alt1TooltipManager {
  export class Instance implements LifetimeManaged {
    constructor(public readonly text: string, private readonly manager: Alt1TooltipManager) {
    }

    public remove() {
      this.manager.removeTooltip(this)
    }

    endLifetime(): void {
      this.remove()
    }
  }
}