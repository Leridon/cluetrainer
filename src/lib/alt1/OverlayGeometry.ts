import {Rectangle, Transform, Vector2} from "../math";
import {util} from "../util/util";
import {mixColor} from "alt1";
import * as lodash from "lodash";
import {ScreenRectangle} from "./ScreenRectangle";
import todo = util.todo;
import uuid = util.uuid;

export class OverlayGeometry {
  private is_frozen = false

  private group_name: string = null

  private alive_time: number = 10000

  private geometry: OverlayGeometry.Geometry[] = []

  withTime(time: number): this {
    this.alive_time = time
    return this
  }

  rect(rect: Rectangle, options: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT): this {
    this.geometry.push({type: "rect", rect: rect, options: options})
    return this
  }

  rect2(rect: ScreenRectangle, options: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT): this {
    this.geometry.push({type: "rect", rect: ScreenRectangle.toRectangle(rect), options: options})
    return this
  }

  line(from: Vector2, to: Vector2, options: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT) {
    this.geometry.push({type: "line", from: from, to: to, options: options})
    return this
  }

  polyline(points: Vector2[],
           close: boolean = false,
           stroke: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT): this {
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

  circle(center: Vector2, radius: number, resolution: number = 8,
         stroke: OverlayGeometry.StrokeOptions = OverlayGeometry.StrokeOptions.DEFAULT): this {

    const points: Vector2[] = []

    for (let i = 0; i < resolution; i++) {
      const alpha = (i / resolution) * 2 * Math.PI;

      points.push({
        x: center.x + ~~(Math.cos(alpha) * radius),
        y: center.y + ~~(Math.sin(alpha) * radius)
      })
    }

    this.polyline(points, true, stroke)

    return this
  }

  progressbar(center: Vector2, length: number, progress: number, width: number = 5,
              contrast_border: number = 2,
              done_color: number = mixColor(0, 255, 0),
              remaining_color: number = mixColor(255, 0, 0)
  ) {
    const start = Vector2.add(center, {x: -Math.floor(length / 2), y: 0},)

    const end = Vector2.add(start, {x: length, y: 0})
    const mid = Vector2.snap(Vector2.add(start, {x: lodash.clamp(progress, 0, 1) * length, y: 0}))

    this.line(Vector2.add(start, {x: -contrast_border, y: 0}), Vector2.add(end, {x: contrast_border, y: 0}),
      {color: mixColor(1, 1, 1), width: width + 2 * contrast_border})
    this.line(start, mid, {color: done_color, width: width})
    this.line(mid, end, {color: remaining_color, width: width})
  }

  text(text: string, position: Vector2,
       options: OverlayGeometry.TextOptions = OverlayGeometry.TextOptions.DEFAULT): this {
    this.geometry.push({
      type: "text",
      text: text,
      position: position,
      options: options
    })

    return this
  }

  add(...other: OverlayGeometry[]): this {
    other.forEach(other => {
      this.geometry.push(...other.geometry)
    })

    return this
  }

  transform(transform: Transform): this {
    todo()

    return this
  }

  private push_draw_calls(): this {
    alt1.overLaySetGroup(this.group_name)

    for (let element of this.geometry) {
      switch (element.type) {
        case "rect":
          const origin = Rectangle.screenOrigin(element.rect)

          alt1.overLayRect(
            element.options.color,
            Math.round(origin.x), Math.round(origin.y),
            Math.round(Rectangle.width(element.rect)), Math.round(Rectangle.height(element.rect)),
            this.alive_time,
            element.options.width ?? 3
          )

          break;
        case "line":
          alt1.overLayLine(
            element.options.color,
            element.options.width,
            Math.round(element.from.x), Math.round(element.from.y),
            Math.round(element.to.x), Math.round(element.to.y),
            this.alive_time ?? 2
          )
          break;
        case "text":
          alt1.overLayTextEx(element.text, element.options.color, element.options.width ?? 20,
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
    this.geometry = []

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
  export type Geometry = {
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

  export namespace Geometry {
    export function transform(geometry: Geometry, trans: Transform): Geometry {
      switch (geometry.type) {
        case "rect":
          return {
            type: "rect",
            rect: Rectangle.transform(geometry.rect, trans),
            options: geometry.options
          }
        case "line":
          break;
      }
    }
  }

  export type StrokeOptions = {
    color: number,
    width?: number
  }

  export namespace StrokeOptions {
    export const DEFAULT: StrokeOptions = {
      width: 2,
      color: mixColor(255, 0, 0)
    }
  }

  export type TextOptions = StrokeOptions & {
    centered?: boolean,
    shadow?: boolean
  }

  export namespace TextOptions {
    export const DEFAULT: TextOptions = {
      width: 20,
      color: mixColor(255, 0, 0),
      centered: true,
      shadow: true
    }
  }

  export function over(): OverlayGeometry {
    return new OverlayGeometry()
  }
}