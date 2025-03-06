import {direction, MovementAbilities} from "lib/runescape/movement";
import Widget from "lib/ui/Widget";
import {Transportation} from "../../lib/runescape/transportation";
import {C} from "../../lib/ui/constructors";
import {TileCoordinates} from "../../lib/runescape/coordinates";
import {Vector2} from "../../lib/math";
import * as leaflet from "leaflet"
import {Path} from "../../lib/runescape/pathing";
import {TransportData} from "../../data/transports";
import {CursorType} from "../../lib/runescape/CursorType";

export namespace PathGraphics {

  import movement_ability = MovementAbilities.movement_ability;
  import span = C.span;
  import inlineimg = C.inlineimg;
  import resolveTeleport = TransportData.resolveTeleport;

  export namespace Teleport {
    import inlineimg = C.inlineimg;
    import cls = C.cls;

    export function asSpan(tele: Transportation.TeleportGroup.Spot): Widget {

      return c("<span style='position: relative'>")
        .tooltip(tele.hover())
        .append(
          inlineimg(`assets/icons/teleports/${tele.image().url}`),
          cls("tele-icon-code-overlay").append(tele.code() ?? "")
        )
    }
  }

  export function ability_icon(ability: movement_ability): string {
    switch (ability) {
      case "surge":
        return 'assets/icons/surge.png'
      case "escape":
        return 'assets/icons/escape.png'
      case "barge":
        return 'assets/icons/barge.png'
      case "dive":
        return 'assets/icons/dive.png'
    }
  }

  export function asSpan(step: Path.Step): Widget {
    switch (step.type) {
      case "orientation":
        return span().append(inlineimg('assets/icons/compass.png'), direction.toShortString(step.direction))
      case "ability":
        return inlineimg(ability_icon(step.ability))
      case "run":
        return span().append(inlineimg('assets/icons/run.png'), (step.waypoints.length - 1).toString())
      case "teleport":
        let tele = resolveTeleport(step.id)

        if (!tele) return inlineimg('assets/teleports/homeport.png')

        return PathGraphics.Teleport.asSpan(tele)
      case "transport":
        return inlineimg(CursorType.meta(step.internal.actions[0].cursor).icon_url)
      case "redclick":
        return inlineimg('assets/icons/redclick.png')
      case "powerburst":
        return inlineimg('assets/icons/accel.png')
      case "cheat":
        return inlineimg('assets/icons/Rotten_potato.png')
    }
  }

  export function createX(coordinate: TileCoordinates,
                          color: "red" | "yellow",
                          size: number = 16,
                          className: string = undefined,
                          opacity: number = undefined
  ): leaflet.Marker {
    const click_icons = {
      "red": "/assets/icons/redclick.png",
      "yellow": "/assets/icons/yellowclick.png",
    }

    return leaflet.marker(Vector2.toLatLong(coordinate), {
      icon: leaflet.icon({
        iconUrl: click_icons[color],
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        className:
          className ? `
      no-antialiasing ${className}`
            : "no-antialiasing"
      }),
      interactive: false,
      opacity
    })
  }

  export type ArrowHeadOptions =
    { type: "none", arm_length?: number }
    | { type: "tip", arm_length?: number }
    | { type: "bar", arm_length?: number }
    | { type: "x", arm_length?: number, ignore_rotation?: number }
    | { type: "square", side_length?: number }

  export function arrow(from: Vector2, to: Vector2, arrow_head: ArrowHeadOptions = {type: "tip", arm_length: 0.5}): leaflet.Polyline {
    let direction = Vector2.sub(from, to)

    if (Vector2.lengthSquared(direction) < 1) return leaflet.polyline([])

    const segments: Vector2[][] = []

    switch (arrow_head.type) {
      case "tip": {
        let arm1_offset = Vector2.scale(arrow_head.arm_length, Vector2.rotate(Vector2.normalize(direction), Math.PI / 4))
        let arm2_offset = Vector2.scale(arrow_head.arm_length, Vector2.rotate(Vector2.normalize(direction), -Math.PI / 4))

        segments.push(
          [from, to],
          [Vector2.add(to, arm1_offset), to, Vector2.add(to, arm2_offset)]
        )
        break;
      }
      case "bar": {
        let arm1_offset = Vector2.scale(arrow_head.arm_length, Vector2.rotate(Vector2.normalize(direction), Math.PI / 2))
        let arm2_offset = Vector2.scale(arrow_head.arm_length, Vector2.rotate(Vector2.normalize(direction), -Math.PI / 2))

        segments.push(
          [from, to],
          [Vector2.add(to, arm1_offset), Vector2.add(to, arm2_offset)]
        )

        break
      }
      case "x": {
        let arms: Vector2[] = [
          {x: -arrow_head.arm_length, y: -arrow_head.arm_length},
          {x: -arrow_head.arm_length, y: arrow_head.arm_length},
          {x: arrow_head.arm_length, y: arrow_head.arm_length},
          {x: arrow_head.arm_length, y: -arrow_head.arm_length},
        ]

        if (!arrow_head.ignore_rotation) {
          const angle = Vector2.angle(direction, {x: 0, y: 1})

          arms = arms.map(c => Vector2.rotate(c, -angle))
        }

        segments.push(
          [from, to],
          [Vector2.add(to, arms[0]), Vector2.add(to, arms[2])],
          [Vector2.add(to, arms[1]), Vector2.add(to, arms[3])],
        )

        break
      }
      case "none": {
        segments.push([from, to])
      }
    }

    return leaflet.polyline(segments.map(l => l.map(Vector2.toLatLong))).setStyle({
      interactive: true
    })

    /*
        return leaflet.polyline([
              [Vector2.toLatLong(from), Vector2.toLatLong(to)],
              [tip, Vector2.toLatLong(Vector2.add(to, arm1_offset))],
              [tip, Vector2.toLatLong(Vector2.add(to, arm2_offset))],
            ]
          )
          .setStyle({
            interactive: true
          })*/
  }

  export function arrowHead(type: "arrow" | "bar" | "x", position: Vector2, direction: Vector2) {
    switch (type) {
      case "arrow":

        let arm1_offset = Vector2.scale(0.7, Vector2.rotate(direction, Math.PI / 4))
        let arm2_offset = Vector2.scale(0.7, Vector2.rotate(direction, -Math.PI / 4))

        return leaflet.polyline([
            [Vector2.toLatLong(position), Vector2.toLatLong(Vector2.add(position, arm1_offset))],
            [Vector2.toLatLong(position), Vector2.toLatLong(Vector2.add(position, arm2_offset))],
          ]
        )
    }
  }
}

export namespace PathingGraphics {
  export function templateString(step: Path.Step): string {
    switch (step.type) {
      case "orientation":
        return `Face ${direction.toString(step.direction)}`
      case "run":
        return `{{icon run}}`
      case "ability":
        return `{{${step.ability}}}`
      case "teleport":
        return `{{teleport ${step.id.group} ${step.id.spot}}}`
      case "powerburst":
        return `{{icon accel}}`
      case "redclick":
        return `{{icon ${CursorType.meta(step.how).short_icon}}}`
      case "transport":
        return `{{icon ${CursorType.meta(step.internal.actions[0].cursor).short_icon}}}`
      case "cheat":
        return `{{icon Rotten_potato}}`
    }
  }

  export function getIcon(step: Path.Step): Widget {
    switch (step.type) {
      case "orientation":
        return c(`<img class='text-icon' src='assets/icons/compass.png'>`)
      case "run":
        return c(`<img class='text-icon' src='assets/icons/run.png'>`)
      case "ability":
        switch (step.ability) {
          case "surge":
            return c(`<img class='text-icon' src='assets/icons/surge.png'>`)
          case "escape":
            return c(`<img class='text-icon' src='assets/icons/escape.png'>`)
          case "barge":
            return c(`<img class='text-icon' src='assets/icons/barge.png'>`)
          case "dive":
            return c(`<img class='text-icon' src='assets/icons/dive.png'>`)
        }
        break;
      case "teleport":
        return c(`<img class='text-icon' src='assets/icons/teleports/homeport.png'>`)
      case "redclick":
        return c(`<img class='text-icon' src='assets/icons/redclick.png'>`)
      case "powerburst":
        return c(`<img class='text-icon' src='assets/icons/accel.png'>`)
      case "cheat":
        return c(`<img class='text-icon' src='assets/icons/Rotten_potato.png'>`)
    }
  }
}