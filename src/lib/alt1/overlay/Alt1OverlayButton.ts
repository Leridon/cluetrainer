import {Observable, observe} from "../../reactive";
import {ScreenRectangle} from "../ScreenRectangle";
import {Vector2} from "../../math";
import {Alt1Overlay} from "./Alt1Overlay";
import {Alt1OverlayDrawCalls} from "./Alt1OverlayDrawCalls";
import {Alt1Color} from "../Alt1Color";

export class Alt1OverlayButton  extends Alt1Overlay {
  protected config: Observable<Alt1OverlayButton.Config>

  constructor(protected area: ScreenRectangle, config: Alt1OverlayButton.Config) {
    super();

    this.config = observe(config)
      .structuralEquality()
      .subscribe(() => this.rerender())

    this.interactivity().setBounds(area ? {type: "rectangle", area: area} : null)
  }

  override renderWithBuilder(overlay: Alt1OverlayDrawCalls.GeometryBuilder) {
    if (!this.area) return

    const render_as_hovered = this.interactivity().isHovered() // || this.isDefaultHovered()

    const config = this.config.value()

    const style_a = render_as_hovered ? config.active_style : {}
    const style_b = config.style

    const style: Alt1OverlayButton.Style = {...style_b, ...style_a}

    const stroke = style.stroke

    if (style.stroke) {
      if (style.constrast) {
        overlay.rectangle(this.area, {
          width: stroke.width + 2 * style.constrast.width,
          color: style.constrast.color
        })
      }

      const extension = style.constrast ? -style.constrast.width : 0

      overlay.rectangle(ScreenRectangle.extend(this.area, {x: extension, y: extension}), stroke)
    }

    if (config.text && style.font) {
      overlay.text(config.text, Vector2.add(ScreenRectangle.center(this.area), {x: 2, y: -2}), {
        ...style.font,
        centered: true
      })
    }
  }

  position(): ScreenRectangle {
    return this.area
  }

  setPosition(area: ScreenRectangle) {
    this.area = area

    this.interactivity().setBounds(area ? {type: "rectangle", area: area} : null)

    this.rerender()
  }

  updateConfig(f: (_: Alt1OverlayButton.Config) => void): this {
    this.config.update2(f)

    return this
  }
}

export namespace Alt1OverlayButton {
  import StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions;

  export type Style = {
    stroke?: StrokeOptions,
    font?: Alt1OverlayDrawCalls.TextOptions
    constrast?: StrokeOptions
  }

  export type Config = {
    text?: string,
    style: Style,
    active_style?: Style
  }

  export function white(text: string = undefined): Config {
    return {
      text: text,
      style: {
        stroke: {width: 1, color: Alt1Color.white},
        constrast: {width: 1, color: Alt1Color.black},
        font: {
          width: 14,
          color: Alt1Color.white,
          centered: true
        }
      },
      active_style: {
        stroke: {width: 2, color: Alt1Color.white},
        font: {
          width: 16,
          color: Alt1Color.white,
          centered: true
        }
      }
    }
  }
}