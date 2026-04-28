import {GameLayer} from "../GameLayer";
import {GameMap} from "../GameMap";

import InteractionTopControl from "../../../cluetrainer/ui/map/InteractionTopControl";
import {ewent} from "../../reactive";

export class InteractionGuard {
  private interaction: InteractionLayer = null
  private default_layer: GameLayer = null

  setDefaultLayer(def: GameLayer): this {
    this.default_layer = def

    return this
  }

  set<T extends InteractionLayer>(interaction: T, target: GameLayer = null): T {
    this.reset()

    if (interaction) {
      if (interaction._guard) interaction._guard.reset()

      this.interaction = interaction
      interaction._guard = this

      interaction.addTo(target || this.default_layer)
    }

    return interaction
  }

  reset() {
    if (this.interaction) {
      this.interaction._guard = null
      this.interaction.cancel()
    }

    this.interaction = null

    return this
  }
}

export default class InteractionLayer extends GameLayer {
  protected top_control: InteractionTopControl = null

  _guard: InteractionGuard = null

  started = ewent<InteractionLayer>()
  ended = ewent<InteractionLayer>()

  onAdd(map: GameMap): this {
    super.onAdd(map)

    this.started.trigger(this)

    this.getMap().container.focus()

    return this
  }

  attachTopControl(tc: InteractionTopControl): this {
    if (this.top_control) {
      this.top_control.remove()
      this.top_control = null
    }

    if (tc) {
      tc.setCancelHandler(() => this.cancel()).addTo(this)
      this.top_control = tc
    }

    return this
  }

  cancel() {
    if (this._guard) this._guard.reset()
    this.remove()

    this.ended.trigger(this)
  }

  onEnd(handler: () => any): this {
    this.ended.on(handler)
    return this
  }

  onStart(handler: () => void): this {
    this.started.on(handler)

    return this
  }
}