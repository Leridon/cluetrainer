import {Rectangle, Vector2} from "../math";
import {util} from "../util/util";
import * as lodash from "lodash";
import {ScreenRectangle} from "./ScreenRectangle";
import {Circle} from "../math/Circle";
import {Alt1Color} from "./Alt1Color";
import uuid = util.uuid;

export namespace Alt1OverlayDrawCalls {
  export class Buffer {
    constructor(public primitives: Primitive[],
                private alive_time: number = 30000
    ) { }

    public playback(): this {
      for (let element of this.primitives) {
        switch (element.type) {
          case "rect":
            const origin = Rectangle.screenOrigin(element.rect)

            alt1.overLayRect(
              element.options.color.for_overlay,
              Math.round(origin.x), Math.round(origin.y),
              Math.round(Rectangle.width(element.rect)), Math.round(Rectangle.height(element.rect)),
              this.alive_time,
              element.options.width ?? 3
            )

            break;
          case "line":
            alt1.overLayLine(
              element.options.color.for_overlay,
              element.options.width,
              Math.round(element.from.x), Math.round(element.from.y),
              Math.round(element.to.x), Math.round(element.to.y),
              this.alive_time ?? 2
            )
            break;
          case "text":
            alt1.overLayTextEx(element.text, element.options.color.for_overlay, element.options.width ?? 20,
              Math.round(element.position.x), Math.round(element.position.y),
              this.alive_time, undefined, element.options.centered ?? true, element.options.shadow ?? true
            )
            break
        }
      }

      return this
    }
  }

  export type StrokeOptions = {
    color: Alt1Color,
    width?: number
  }

  export namespace StrokeOptions {
    export const DEFAULT: StrokeOptions = {
      width: 2,
      color: Alt1Color.red
    }
  }

  export type TextOptions = StrokeOptions & {
    centered?: boolean,
    shadow?: boolean
  }

  export namespace TextOptions {
    export const DEFAULT: TextOptions = {
      width: 20,
      color: Alt1Color.red,
      centered: true,
      shadow: true
    }
  }

  export type Primitive = {
    type: "line",
    from: Vector2,
    to: Vector2,
    options: StrokeOptions
  } | {
    type: "rect",
    rect: Rectangle,
    options: StrokeOptions
  } | {
    type: "text",
    text: string,
    position: Vector2,
    options: TextOptions,
  }

  export class GeometryBuilder {
    private primitives: Alt1OverlayDrawCalls.Primitive[] = []

    buffer(): Buffer {
      return new Buffer([...this.primitives])
    }

    rectangle(rect: ScreenRectangle,
              options: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {
      this.primitives.push({type: "rect", rect: ScreenRectangle.toRectangle(rect), options: options})
      return this
    }

    line(from: Vector2, to: Vector2, options: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT) {
      this.primitives.push({type: "line", from: from, to: to, options: options})
      return this
    }

    polyline(points: Vector2[],
             close: boolean = false,
             stroke: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {
      for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length

        if (next == 0 && !close) break

        let from = points[i]
        let to = points[next]

        const dir = Vector2.normalize(Vector2.sub(to, from))

        from = Vector2.add(from, Vector2.scale(-(stroke.width ?? 2) / 3, dir))
        to = Vector2.add(to, Vector2.scale((stroke.width ?? 2) / 3, dir))

        this.line(from, to, stroke)
      }

      return this
    }


    circle(circle: Circle, resolution: number = 8,
           stroke: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {

      const points: Vector2[] = []

      for (let i = 0; i < resolution; i++) {
        const alpha = (i / resolution) * 2 * Math.PI;

        points.push({
          x: circle.center.x + ~~(Math.cos(alpha) * circle.radius),
          y: circle.center.y + ~~(Math.sin(alpha) * circle.radius)
        })
      }

      this.polyline(points, true, stroke)

      return this
    }

    progressbar(center: Vector2, length: number, progress: number, thickness: number = 5,
                contrast_border: number = 2,
                done_color: Alt1Color = Alt1Color.green,
                remaining_color: Alt1Color = Alt1Color.red
    ) {
      const start = Vector2.add(center, {x: -Math.floor(length / 2), y: 0},)

      const end = Vector2.add(start, {x: length, y: 0})
      const mid = Vector2.snap(Vector2.add(start, {x: lodash.clamp(progress, 0, 1) * length, y: 0}))

      this.line(Vector2.add(start, {x: -contrast_border, y: 0}), Vector2.add(end, {x: contrast_border, y: 0}),
        {color: Alt1Color.black, width: thickness + 2 * contrast_border})
      this.line(start, mid, {color: done_color, width: thickness})
      this.line(mid, end, {color: remaining_color, width: thickness})
    }


    text(text: string, position: Vector2,
         options: Alt1OverlayDrawCalls.TextOptions = Alt1OverlayDrawCalls.TextOptions.DEFAULT): this {
      this.primitives.push({
        type: "text",
        text: text,
        position: position,
        options: options
      })

      return this
    }
  }
}

export class OverlayGeometry {
  private is_frozen = false

  private group_name: string = null

  private alive_time: number = 10000

  private primitives: Alt1OverlayDrawCalls.Primitive[] = []

  setGroupName(name: string): void {
    this.group_name = name
  }

  withTime(time: number): this {
    this.alive_time = time
    return this
  }

  rect(rect: Rectangle, options: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {
    this.primitives.push({type: "rect", rect: rect, options: options})
    return this
  }

  rect2(rect: ScreenRectangle, options: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {
    this.primitives.push({type: "rect", rect: ScreenRectangle.toRectangle(rect), options: options})
    return this
  }

  line(from: Vector2, to: Vector2, options: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT) {
    this.primitives.push({type: "line", from: from, to: to, options: options})
    return this
  }

  polyline(points: Vector2[],
           close: boolean = false,
           stroke: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length

      if (next == 0 && !close) break

      let from = points[i]
      let to = points[next]

      const dir = Vector2.normalize(Vector2.sub(to, from))

      from = Vector2.add(from, Vector2.scale(-(stroke.width ?? 2) / 3, dir))
      to = Vector2.add(to, Vector2.scale((stroke.width ?? 2) / 3, dir))

      this.line(from, to, stroke)
    }

    return this
  }

  circle(circle: Circle, resolution: number = 8,
         stroke: Alt1OverlayDrawCalls.StrokeOptions = Alt1OverlayDrawCalls.StrokeOptions.DEFAULT): this {

    const points: Vector2[] = []

    for (let i = 0; i < resolution; i++) {
      const alpha = (i / resolution) * 2 * Math.PI;

      points.push({
        x: circle.center.x + ~~(Math.cos(alpha) * circle.radius),
        y: circle.center.y + ~~(Math.sin(alpha) * circle.radius)
      })
    }

    this.polyline(points, true, stroke)

    return this
  }

  progressbar(center: Vector2, length: number, progress: number, thickness: number = 5,
              contrast_border: number = 2,
              done_color: Alt1Color = Alt1Color.green,
              remaining_color: Alt1Color = Alt1Color.red
  ) {
    const start = Vector2.add(center, {x: -Math.floor(length / 2), y: 0},)

    const end = Vector2.add(start, {x: length, y: 0})
    const mid = Vector2.snap(Vector2.add(start, {x: lodash.clamp(progress, 0, 1) * length, y: 0}))

    this.line(Vector2.add(start, {x: -contrast_border, y: 0}), Vector2.add(end, {x: contrast_border, y: 0}),
      {color: Alt1Color.black, width: thickness + 2 * contrast_border})
    this.line(start, mid, {color: done_color, width: thickness})
    this.line(mid, end, {color: remaining_color, width: thickness})
  }

  text(text: string, position: Vector2,
       options: Alt1OverlayDrawCalls.TextOptions = Alt1OverlayDrawCalls.TextOptions.DEFAULT): this {
    this.primitives.push({
      type: "text",
      text: text,
      position: position,
      options: options
    })

    return this
  }

  add(...other: OverlayGeometry[]): this {
    other.forEach(other => {
      this.primitives.push(...other.primitives)
    })

    return this
  }

  private push_draw_calls(): this {
    alt1.overLaySetGroup(this.group_name)

    for (let element of this.primitives) {
      switch (element.type) {
        case "rect":
          const origin = Rectangle.screenOrigin(element.rect)

          alt1.overLayRect(
            element.options.color.for_overlay,
            Math.round(origin.x), Math.round(origin.y),
            Math.round(Rectangle.width(element.rect)), Math.round(Rectangle.height(element.rect)),
            this.alive_time,
            element.options.width ?? 3
          )

          break;
        case "line":
          alt1.overLayLine(
            element.options.color.for_overlay,
            element.options.width,
            Math.round(element.from.x), Math.round(element.from.y),
            Math.round(element.to.x), Math.round(element.to.y),
            this.alive_time ?? 2
          )
          break;
        case "text":
          alt1.overLayTextEx(element.text, element.options.color.for_overlay, element.options.width ?? 20,
            Math.round(element.position.x), Math.round(element.position.y),
            this.alive_time, undefined, element.options.centered ?? true, element.options.shadow ?? true
          )
          break
      }
    }

    // Reset group name
    alt1.overLaySetGroup("")

    return this
  }

  render(): this {
    if (!this.group_name) this.group_name = uuid()

    this.freeze()
    alt1.overLayClearGroup(this.group_name)
    this.push_draw_calls()
    alt1.overLayRefreshGroup(this.group_name)
    //this.unfreeze() // Unfreezing causes the flicker to reappear

    return this
  }

  clear(): this {
    this.primitives = []

    return this
  }

  hide(): this {
    if (this.group_name) {
      alt1.overLayClearGroup(this.group_name)
      alt1.overLayRefreshGroup(this.group_name)
    }

    return this
  }

  private freeze() {
    if (this.group_name) {
      alt1.overLayFreezeGroup(this.group_name)
      this.is_frozen = true
    }
  }

  private unfreeze() {
    if (this.is_frozen) {
      alt1.overLayContinueGroup(this.group_name)
      this.is_frozen = false
    }
  }
}

export namespace OverlayGeometry {
  export function over(): OverlayGeometry {
    return new OverlayGeometry()
  }
}