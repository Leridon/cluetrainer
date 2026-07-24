import {floor_t} from "../runescape/coordinates";

export class ZoomLevels<T> {

  constructor(public groups: ZoomLevels.Group<T>[]) {}

  getGroupIndex(zoom: number): number {
    if (zoom == null) return null

    for (let i = 0; i < this.groups.length - 1; i++) {
      if (zoom < this.groups[i + 1].min) return i
    }

    return this.groups.length - 1
  }

  get(index: number): ZoomLevels.Group<T> {
    return this.groups[index]
  }

  getForZoom(zoom: number): ZoomLevels.Group<T> {
    return this.groups[this.getGroupIndex(zoom)]
  }
}

export namespace ZoomLevels {
  export type Group<T> = {
    min: number,
    hidden_here?: boolean,
    value: T
  }

  export const none = new ZoomLevels<null>([
    {min: -1000, value: null}
  ])
}

export class FloorLevels<T> {
  constructor(private groups: FloorLevels.Group<T>[]) {}

  getGroupIndex(floor: floor_t): number {
    return this.groups.findIndex(g => g.floors.includes(floor))
  }

  get(index: number): FloorLevels.Group<T> {
    return this.groups[index]
  }
}

export namespace FloorLevels {
  export type Group<T> = {
    floors: floor_t[],
    hidden_here?: boolean,
    value?: T
  }

  export const none = new FloorLevels<null>([{floors: [0, 1, 2, 3], value: null}])

  export function single<T>(floor: floor_t, value: T = undefined): FloorLevels<T> {
    return new FloorLevels<T>([
      {floors: [floor], value: value},
      {floors: [0, 1, 2, 3], hidden_here: true},
    ])
  }

  export function special(floor: floor_t): FloorLevels<{ correct_level: boolean }> {
    return new FloorLevels([
      {floors: [floor], value: {correct_level: true}},
      {floors: [0, 1, 2, 3], value: {correct_level: false}},
    ])
  }
}