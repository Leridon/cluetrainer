import {TileCoordinates} from "../coordinates";
import {util} from "../../util/util";
import {Vector2} from "../../math";
import * as assert from "assert";
import {Clues} from "../clues";

export namespace Scans {
  export function range(clue: Clues.Scan, meerkats: boolean) {
    return clue.range + (meerkats ? 5 : 0)
  }

  export function get_pulse(spot: TileCoordinates, tile: TileCoordinates, range: number): Pulse {
    let d = distance(spot, tile)

    let p = 3 - Math.min(2, Math.floor(Math.max(0, (d - 1)) / range)) as 1 | 2 | 3

    assert(p >= 1 && p <= 3)

    let different_level = spot.level != tile.level || distance(complementSpot(spot), tile) <= range + 15

    return {
      pulse: p,
      different_level: different_level
    }
  }

  export function distance(player_tile: Vector2, dig_tile: Vector2): number {
    return Vector2.max_axis(Vector2.sub(player_tile, dig_tile))
  }

  export type Pulse = {
    pulse: 1 | 2 | 3,
    different_level?: boolean
  }

  export namespace Pulse {
    import natural_order = util.Order.natural_order;
    import Order = util.Order;
    export type hash_t = 0 | 1 | 2 | 3 | 4 | 5

    export function hash(pulse: Pulse): hash_t {
      return (pulse.pulse - 1) + (pulse.different_level ? 3 : 0) as hash_t
    }

    export function unhash(hash: hash_t): Pulse {
      return {
        pulse: (hash % 3) + 1 as 1 | 2 | 3,
        different_level: hash >= 3
      }
    }

    export function equals(a: Pulse, b: Pulse): boolean {
      return a.pulse == b.pulse && a.different_level == b.different_level
    }

    export let all: Pulse[] = [
      // CAREFUL: This is sorted by the hash of the pulse (0 to 5), and MUST stay this way to not break some optimized code!
      {pulse: 1, different_level: false},
      {pulse: 2, different_level: false},
      {pulse: 3, different_level: false},
      {pulse: 1, different_level: true},
      {pulse: 2, different_level: true},
      {pulse: 3, different_level: true},
    ]

    type meta = {
      pretty: string,
      short: string,
      shorted: string
    }

    export function meta(type: Pulse): meta {
      let pretty = ["Single", "Double", "Triple"][type.pulse - 1]

      // TODO: Clean this pos up

      if (type.different_level) {
        return {
          pretty: type.pulse == 1 ? "Different Level" : pretty + " (DL)",
          short: type.pulse == 1 ? "DL" : "DL" + type.pulse,
          shorted: type.pulse == 1 ? "\"DL\"" : "\"DL\"" + type.pulse
        }
      } else {
        return {
          pretty: pretty,
          short: type.pulse.toString(),
          shorted: type.pulse.toString()
        }
      }
    }

    export type SimplifiedPulseForContext = {
      type: 1 | 2 | 3 | null,
      text: "DL" | "TF" | null
    }

    export function simplify_with_context(pulse: Pulse, context: Pulse[]): SimplifiedPulseForContext {
      // Use the full word when it's not "different level"
      if (!pulse.different_level) {
        if (util.count(context, (p => p.different_level)) == context.length - 1) return {type: null, text: "TF"} // Is the only non-different level
        else return {type: pulse.pulse, text: null}
      } else {
        let counterpart_exists = context.some(p => p.pulse == pulse.pulse && !p.different_level)

        if (!counterpart_exists) return {type: pulse.pulse, text: null} // If the non-different level counterpart does not exist, just use the pretty string

        if (util.count(context, (p => p.different_level)) == 1) return {type: null, text: "DL"} // Is the only different level
        else return {type: pulse.pulse, text: "DL"}
      }
    }

    export function pretty_with_context(pulse: Pulse, context: Pulse[]): string {
      let {type, text} = simplify_with_context(pulse, context)

      if (type == null) {
        switch (text) {
          case "DL":
            return "Different level";
          case "TF":
            return "Too far";
          case null:
            return "NULL"
        }
      } else {
        let pretty = ["Single", "Double", "Triple"][type - 1]

        switch (text) {
          case "DL":
            return `Different Level (${pretty})`
          case "TF":
            return "NULL"
          case null:
            return pretty

        }
      }
    }

    export function compare(a: Pulse, b: Pulse): number {
      return natural_order(hash(a), hash(b))
    }

    export const comp = Order.comap(natural_order, hash)
  }

  export function complementSpot(spot: TileCoordinates) {
    return {
      x: spot.x,
      y: (spot.y + 6400) % 12800,
      level: spot.level
    }
  }
}