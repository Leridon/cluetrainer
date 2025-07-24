import {util} from "../../util/util";
import Behaviour from "../../ui/Behaviour";
import {Alt1OverlayManager} from "../Alt1OverlayManager";
import {ewent, observe} from "../../reactive";
import {Alt1TooltipManager} from "../Alt1TooltipManager";
import {Alt1} from "../Alt1";
import * as a1lib from "alt1";
import {lazy} from "../../Lazy";
import {Circle} from "../../math/Circle";
import {ScreenRectangle} from "../ScreenRectangle";
import {Vector2} from "../../math";
import {Alt1OverlayDrawCalls} from "./Alt1OverlayDrawCalls";
import {Log} from "../../util/Log";
import uuid = util.uuid;
import log = Log.log;

export class Alt1Overlay extends Behaviour {
  private parent: Alt1Overlay | null = null
  private children_bound_to_rerender: Alt1Overlay[] = []

  private group_name: string = uuid()
  private is_frozen = false
  public readonly visible = observe(true)

  private is_actually_visible = observe(true)

  private overlay: Alt1OverlayDrawCalls.Buffer = new Alt1OverlayDrawCalls.Buffer([])

  constructor(private oneshot: { alive_time: number } = undefined, private heartbeater: Alt1OverlayManager = Alt1.instance().overlays) {
    super();

    this.visible.subscribe(() => this.refreshVisibility())
    this.is_actually_visible.subscribe(() => this.refresh())

    this.heartbeater.bindToPageLifetime(this)
  }

  private readonly _interactivity = lazy(() => {
    const inter = this.withSub(
      new Alt1Overlay.Interactivity(this)
    )

    inter.hovered.subscribe2(() => this.rerender()).bindTo(this.lifetime_manager)
    inter.is_default_action.subscribe2(() => this.rerender()).bindTo(this.lifetime_manager)

    return inter
  })

  public interactivity(create_if_not_exists: boolean = true): Alt1Overlay.Interactivity {
    if (!create_if_not_exists && !this._interactivity.hasValue()) return null

    return this._interactivity.get()
  }

  public setGeometry(geometry: Alt1OverlayDrawCalls.Buffer): void {
    this.overlay = geometry
    this.refresh()
  }

  private refresh() {
    if (!Alt1.checkPermission(p => p.overlays)) return

    if (!this.isActive() && !this.oneshot) return

    if (this._interactivity.hasValue()) {
      this._interactivity.get().refreshTooltip()
    }

    this.freeze()
    alt1.overLayClearGroup(this.group_name)

    if (this.isVisible()) {
      alt1.overLaySetGroup(this.group_name)
      this.overlay.playback(this.oneshot?.alive_time ?? this.heartbeater.HEARTBEAT * 1.5)
      alt1.overLaySetGroup("")
    }

    alt1.overLayRefreshGroup(this.group_name)
  }

  public rerender() { // TODO: Rename
    if (this.render != Alt1Overlay.prototype.render
      || this.renderWithBuilder != Alt1Overlay.prototype.renderWithBuilder
    ) {
      this.setGeometry(this.render())
    }

    this.children_bound_to_rerender.forEach(c => c.rerender())
  }

  protected render(): Alt1OverlayDrawCalls.Buffer {
    const builder = new Alt1OverlayDrawCalls.GeometryBuilder()

    this.renderWithBuilder(builder)

    return builder.buffer()
  }

  protected renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) { }

  protected begin() {
    if (!this.oneshot) {
      this.heartbeater.onHeartbeat(() => this.refresh())
        .bindTo(this.lifetime_manager)
    }

    this.refresh()
  }

  protected end() {
    alt1.overLayClearGroup(this.group_name)
    alt1.overLayRefreshGroup(this.group_name)
  }

  private freeze() {
    if (this.group_name) {
      alt1.overLayFreezeGroup(this.group_name)
      this.is_frozen = true
    }
  }

  public isVisible(): boolean {
    return this.is_actually_visible.value()
  }

  setVisible(v: boolean): this {
    this.visible.set(v)

    return this
  }

  private refreshVisibility() {
    this.is_actually_visible.set(this.visible.value() && (this.parent == null || this.parent.isVisible()))
  }

  public addTo(parent: Alt1Overlay, bind_rerender: boolean = false): this {
    if (this.parent != null) {
      log().log("ERROR: Overlay already has a parent.", "Overlays")
      return this
    }

    this.parent = parent

    this.parent.is_actually_visible.subscribe(() => this.refreshVisibility())

    this.refreshVisibility()

    parent.withSub(this)

    if (bind_rerender) parent.children_bound_to_rerender.push(this)

    return this
  }

  static oneOff(geometry: Alt1OverlayDrawCalls.Buffer, time: number): Alt1Overlay {
    const overlay = new Alt1Overlay({alive_time: time})

    overlay.setGeometry(geometry)

    overlay.start()

    return overlay
  }

  static manual(time: number = 3000): Alt1Overlay {
    return new Alt1Overlay({alive_time: time}).start()
  }
}

export namespace Alt1Overlay {
  export class Interactivity extends Behaviour {
    public readonly main_hotkey_pressed = ewent<this>()
    public readonly right_clicked = ewent<this>()

    private bounds: Bounds = null
    private tooltip: string = null
    private active_tooltip: Alt1TooltipManager.Instance = null

    public readonly hovered = observe(false)
    public readonly is_default_action = observe(false)

    constructor(private parent: Alt1Overlay) {super();}

    setBounds(bounds: Bounds): this {
      this.bounds = bounds
      return this
    }

    protected begin() {
      Alt1.instance().main_hotkey.subscribe(10, event => {
        if (!this.parent.isVisible()) return
        if (Bounds.contains(this.bounds, event.mouse)) {
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

        if (Bounds.contains(this.bounds, pos)) this.right_clicked.trigger(this)
      }).bindTo(this.lifetime_manager)

      Alt1.instance().mouse_tracking.subscribe(pos => {
        const h = Bounds.contains(this.bounds, pos)

        this.hovered.set(h)

        if (h) Interactivity.setHovered(this)
        else if (Interactivity._hovered.value() == this) Interactivity.setHovered(null)
      }).bindTo(this.lifetime_manager)
    }

    protected end() {
      this.active_tooltip?.remove()
    }

    public isHovered(): boolean {
      return this.hovered.value() && this.parent.isVisible()
    }

    private static _default_main_hotkey_handler = observe<Interactivity>(null)
      .subscribe((newValue, oldValue) => {
        if (oldValue) oldValue.is_default_action.set(false)
        if (newValue) newValue.is_default_action.set(true)
      })

    protected static _hovered = observe<Interactivity>(null)

    public makeDefaultHotkeyHandler() {
      Interactivity.setDefaultMainHotkeyHandler(this)
    }

    static setDefaultMainHotkeyHandler(overlay: Interactivity) {
      this._default_main_hotkey_handler.set(overlay)
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

  export type Bounds = { type: string } & (
    { type: "circle", area: Circle }
    | { type: "rectangle", area: ScreenRectangle }
    )

  export namespace Bounds {
    export function contains(self: Bounds, position: Vector2): boolean {
      if (!self) return false

      switch (self.type) {
        case "circle":
          return Circle.contains(self.area, position)
        case "rectangle":
          return ScreenRectangle.contains(self.area, position)
      }

      return false
    }
  }
}