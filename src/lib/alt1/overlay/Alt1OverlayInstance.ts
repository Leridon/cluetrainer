import {Alt1OverlayDrawCalls} from "../OverlayGeometry";
import {util} from "../../util/util";
import Behaviour from "../../ui/Behaviour";
import {Alt1OverlayManager} from "../Alt1OverlayManager";
import {ewent, observe} from "../../reactive";
import {InteractiveOverlay} from "./InteractiveOverlay";
import {Alt1TooltipManager} from "../Alt1TooltipManager";
import {Alt1} from "../Alt1";
import * as a1lib from "alt1";
import {lazy} from "../../Lazy";
import uuid = util.uuid;

export class Alt1OverlayInstance extends Behaviour {
  private group_name: string = uuid()
  private is_frozen = false
  private visible = observe(true)

  private overlay: Alt1OverlayDrawCalls.Buffer = new Alt1OverlayDrawCalls.Buffer([])

  constructor(private heartbeater: Alt1OverlayManager = Alt1.instance().overlays) {
    super();

    this.visible.subscribe(() => this.refresh())
  }

  private readonly _interactivity = lazy(() => {
    const inter = this.withSub(
      new Alt1OverlayInstance.Interactivity(this)
    )

    inter.hovered.subscribe2(() => this.maybeRender()).bindTo(this.lifetime_manager)
    inter.is_default_action.subscribe2(() => this.maybeRender()).bindTo(this.lifetime_manager)

    return inter
  })

  public interactivity(create_if_not_exists: boolean) {
    if (!create_if_not_exists && !this._interactivity.hasValue()) return null

    return this._interactivity.get()
  }

  public setGeometry(geometry: Alt1OverlayDrawCalls.Buffer): void {
    this.overlay = geometry
    this.refresh()
  }

  private refresh() {
    if (!this.isActive()) return

    if (this._interactivity.hasValue()) {
      this._interactivity.get().refreshTooltip()
    }

    const visible = this.visible.value()

    this.freeze()
    alt1.overLayClearGroup(this.group_name)
    if (visible) this.overlay.playback()
    alt1.overLayRefreshGroup(this.group_name)
  }

  private maybeRender() {
    if (this.render != Alt1OverlayInstance.prototype.render
      || this.renderWithBuilder != Alt1OverlayInstance.prototype.renderWithBuilder
    ) {
      this.setGeometry(this.render())
    }
  }

  protected render(): Alt1OverlayDrawCalls.Buffer {
    const builder = new Alt1OverlayDrawCalls.GeometryBuilder()

    this.renderWithBuilder(builder)

    return builder.buffer()
  }

  protected renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) { }

  protected begin() {
    this.heartbeater.onHeartbeat(() => this.refresh())
      .bindTo(this.lifetime_manager)

    this.refresh()
  }

  protected end() {
  }

  private freeze() {
    if (this.group_name) {
      alt1.overLayFreezeGroup(this.group_name)
      this.is_frozen = true
    }
  }

  public isVisible(): boolean {
    return this.visible.value()
  }
}

export namespace Alt1OverlayInstance {
  export class Interactivity extends Behaviour {
    public readonly main_hotkey_pressed = ewent<this>()
    public readonly right_clicked = ewent<this>()

    private bounds: InteractiveOverlay.Bounds = null
    private tooltip: string = null
    private active_tooltip: Alt1TooltipManager.Instance = null

    public readonly hovered = observe(false)
    public readonly is_default_action = observe(false)

    constructor(private parent: Alt1OverlayInstance) {super();}

    setBounds(bounds: InteractiveOverlay.Bounds): this {
      this.bounds = bounds
      return this
    }

    protected begin() {
      Alt1.instance().main_hotkey.subscribe(10, event => {
        if (!this.parent.isVisible()) return
        if (InteractiveOverlay.Bounds.contains(this.bounds, event.mouse)) {
          event.consume()
          this.main_hotkey_pressed.trigger(this)
        }
      }).bindTo(this.lifetime_manager)

      Alt1.instance().main_hotkey.subscribe(9, event => {
        if (!this.parent.isVisible()) return
        if (this.is_default_action.value()) {
          event.consume()
          this.main_hotkey_pressed.trigger(this)
        }
      }).bindTo(this.lifetime_manager)

      Alt1.instance().context_menu.subscribe(area => {
        if (!this.parent.isVisible()) return
        const pos = a1lib.getMousePosition()

        if (InteractiveOverlay.Bounds.contains(this.bounds, pos)) this.right_clicked.trigger(this)
      }).bindTo(this.lifetime_manager)

      Alt1.instance().mouse_tracking.subscribe(pos => {
        const h = InteractiveOverlay.Bounds.contains(this.bounds, pos)

        this.hovered.set(h)

        if (h) Interactivity.setHovered(this)
        else if (Interactivity._hovered.value() == this) Interactivity.setHovered(null)
      }).bindTo(this.lifetime_manager)
    }

    protected end() {
    }

    public isHovered(): boolean {
      return this.hovered.value() && this.parent.isVisible()
    }

    private static _default_action = observe<Interactivity>(null)
      .subscribe((newValue, oldValue) => {
        if (oldValue) oldValue.is_default_action.set(false)
        if (newValue) newValue.is_default_action.set(true)
      })

    protected static _hovered = observe<Interactivity>(null)

    public makeDefaultAction() {
      Interactivity.setDefaultElement(this)
    }

    static setDefaultElement(overlay: Interactivity) {
      this._default_action.set(overlay)
    }

    private static setHovered(overlay: Interactivity) {
      this._hovered.set(overlay)
    }

    public setTooltip(tooltip: string): this {
      this.tooltip = tooltip

      return this
    }

    refreshTooltip() {
      if (this.isHovered() && this.tooltip && !this.active_tooltip && alt1.rsActive) {
        this.active_tooltip = Alt1.instance().tooltips.setTooltip(this.tooltip)
      } else if (!this.isHovered() && this.active_tooltip) {
        this.active_tooltip.remove()
        this.active_tooltip = null
      }
    }
  }
}