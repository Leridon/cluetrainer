import {Alt1Overlay} from "../Alt1Overlay";
import {ewent, Observable, observe} from "../../reactive";
import {Alt1} from "../Alt1";
import {Circle} from "../../math/Circle";
import {ScreenRectangle} from "../ScreenRectangle";
import {Vector2} from "../../math";
import * as a1lib from "alt1";
import {OverlayGeometry} from "../OverlayGeometry";
import observe_combined = Observable.observe_combined;

export abstract class InteractiveOverlay extends Alt1Overlay {
  public readonly main_hotkey_pressed = ewent<this>()
  public readonly right_clicked = ewent<this>()

  private bounds: InteractiveOverlay.Bounds = null

  private hovered = observe(false)
  private is_default_action = observe(false)
  protected render_as_hovered = observe_combined({hovered: this.hovered, is_default_action: this.is_default_action}).map(e => e.hovered || e.is_default_action)

  constructor() {
    super(true);

    this.render_as_hovered.subscribe2(() => this.refresh()).bindTo(this.lifetime_manager)
  }

  protected begin() {
    super.begin();

    Alt1.instance().main_hotkey.subscribe(10, event => {
      if (!this.visible.value()) return
      if (InteractiveOverlay.Bounds.contains(this.bounds, event.mouse)) {
        event.consume()
        this.main_hotkey_pressed.trigger(this)
      }
    }).bindTo(this.lifetime_manager)

    Alt1.instance().main_hotkey.subscribe(9, event => {
      if (!this.visible.value()) return
      if (this.is_default_action.value()) {
        event.consume()
        this.main_hotkey_pressed.trigger(this)
      }
    }).bindTo(this.lifetime_manager)

    Alt1.instance().context_menu.subscribe(area => {
      if (!this.visible.value()) return
      const pos = a1lib.getMousePosition()

      if (InteractiveOverlay.Bounds.contains(this.bounds, pos)) this.right_clicked.trigger(this)
    }).bindTo(this.lifetime_manager)

    Alt1.instance().mouse_tracking.subscribe(pos => {
      this.hovered.set(InteractiveOverlay.Bounds.contains(this.bounds, pos))
    }).bindTo(this.lifetime_manager)
  }

  private static _default_action = observe<InteractiveOverlay>(null)
    .subscribe((newValue, oldValue) => {
      if (oldValue) oldValue.is_default_action.set(false)
      if (newValue) newValue.is_default_action.set(true)
    })

  public makeDefaultAction() {
    InteractiveOverlay.setDefaultElement(this)
  }

  protected setBounds(bounds: InteractiveOverlay.Bounds): this {
    this.bounds = bounds
    return this
  }

  static setDefaultElement(overlay: InteractiveOverlay) {
    this._default_action.set(overlay)
  }

  private static setHovered(overlay: InteractiveOverlay) {

  }
}

export namespace InteractiveOverlay {
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

  export class Button extends InteractiveOverlay {
    constructor(protected area: ScreenRectangle, protected config: Button.Config) {
      super();

      this.setBounds(area ? {type: "rectangle", area: area} : null)
    }

    private text = observe<{
      text: string,
      font: OverlayGeometry.TextOptions
    }>(null).structuralEquality()

    renderSelf(overlay: OverlayGeometry) {
      if (!this.area) return

      const hovered = this.render_as_hovered.value()

      const stroke = hovered ? (this.config.active_stroke ?? this.config.stroke) : this.config.stroke

      if (this.config.constrast) {
        overlay.rect2(this.area, {
          width: stroke.width + 2 * this.config.constrast.width,
          color: this.config.constrast.color
        })
      }

      const text = this.text.value()

      const extension = this.config.constrast ? -this.config.constrast.width : 0

      overlay.rect2(ScreenRectangle.extend(this.area, {x: extension, y: extension}), stroke)

      if (text?.text && text?.font) {
        overlay.text(text.text, Vector2.add(ScreenRectangle.center(this.area), {x: 2, y: -2}), {
          ...text.font,
          centered: true
        })
      }
    }

    setPosition(area: ScreenRectangle) {
      this.area = area

      this.setBounds(area ? {type: "rectangle", area: area} : null)

      this.refresh()
    }

    setText(text: string, font?: OverlayGeometry.TextOptions) {
      this.text.set({text, font: font ?? this.text.value()?.font})
    }
  }

  export namespace Button {
    import StrokeOptions = OverlayGeometry.StrokeOptions;
    export type Config = {
      stroke: StrokeOptions,
      active_stroke: StrokeOptions,
      constrast?: StrokeOptions
    }

    export namespace Config {

    }
  }
}