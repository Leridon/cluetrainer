import {Transportation} from "../../../../../lib/runescape/transportation";
import {TileArea} from "../../../../../lib/runescape/coordinates/TileArea";
import {Vector2} from "../../../../../lib/math";
import {direction} from "../../../../../lib/runescape/movement";
import EntityActionMovement = Transportation.EntityActionMovement;

export class MovementBuilder {

  constructor(public value: EntityActionMovement) {

  }

  time(t: number): this {
    this.value.time = t
    return this
  }

  restrict(area: TileArea): this {
    this.value.valid_from = area

    return this
  }

  fixed(target: TileArea, relative: boolean = false): this {
    this.value.fixed_target = relative ? {target: target, relative: true} : {target: target}

    this.value.offset = undefined

    return this
  }

  offset(offset: Vector2 & { level: number }): this {
    this.value.offset = offset
    this.value.fixed_target = undefined

    return this
  }

  orientation(orientation: "bymovement" | "toentitybefore" | "toentityafter" | "keep"): this {
    this.value.orientation = orientation
    this.value.forced_orientation = undefined

    return this
  }

  forcedOrientation(orientation: direction, relative: boolean = undefined): this {
    this.value.orientation = "forced"
    this.value.forced_orientation = {dir: orientation, relative: relative}

    return this
  }

  done(): EntityActionMovement {
    return this.value
  }
}

export namespace MovementBuilder {
  export function init(): MovementBuilder {
    return move({time: 1})
  }

  export function move(value: EntityActionMovement): MovementBuilder {
    return new MovementBuilder(value)
  }

  export function offset(offset: Vector2 & { level: number }): MovementBuilder {
    return init().offset(offset)
  }

  export function fixed(target: TileArea, relative: boolean = false): MovementBuilder {
    return init().fixed(target, relative)
  }
}