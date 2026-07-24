import {TileCoordinates} from "./TileCoordinates";

export type GieliCoordinates = {
  latitude: {
    degrees: number,
    minutes: number,
    direction: "north" | "south"
  },
  longitude: {
    degrees: number,
    minutes: number,
    direction: "east" | "west"
  }
}

export namespace GieliCoordinates {
  export function toCoords(comp: GieliCoordinates): TileCoordinates {
    const sextant = {
      offsetx: 2440,
      offsetz: 3161,
      minutespertile: 1.875
    }

    return {
      x: sextant.offsetx + Math.round((60 * comp.longitude.degrees + comp.longitude.minutes) * (comp.longitude.direction == "west" ? -1 : 1) / sextant.minutespertile),
      y: sextant.offsetz + Math.round((60 * comp.latitude.degrees + comp.latitude.minutes) * (comp.latitude.direction == "south" ? -1 : 1) / sextant.minutespertile),
      level: 0
    }
  }

  export function toString(c: GieliCoordinates): string {
    return `${c.latitude.degrees}°${c.latitude.minutes}' ${c.latitude.direction == "north" ? "N" : "S"}, ${c.longitude.degrees}°${c.longitude.minutes}' ${c.longitude.direction == "east" ? "E" : "W"}`
  }
}
