import {TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import {util} from "../../../lib/util/util";
import {Rectangle, Vector2} from "../../../lib/math";
import * as assert from "assert";
import {Clues} from "../Clues";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {rangeRight} from "lodash";
import {ScanTree} from "../../cluetheory/scans/ScanTree";

export namespace Scans {
  import activate = TileArea.activate;
  import ScanInformation = ScanTree.ScanInformation;

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

  export type PulseInformation = Scans.Pulse & ({
    pulse: 3
    spot?: TileCoordinates
  } | { pulse: 1 | 2 })

  export namespace PulseInformation {

    export function equals(a: PulseInformation, b: PulseInformation): boolean {
      return Pulse.equals(a, b) && !(a.pulse == 3 && (b.pulse == 3) && !TileCoordinates.eq2(a?.spot, b.spot))
    }

    export function toString(self: PulseInformation): string {
      return self.pulse.toString()
        + (self.different_level ? "l" : "")
        + (self.pulse == 3 && self.spot ? TileCoordinates.toShortString(self.spot) : "")
    }
  }

  export function spot_narrowing(candidates: TileCoordinates[], area: TileArea, range: number): {
    pulse: PulseInformation,
    narrowed_candidates: TileCoordinates[]
  }[] {
    return Pulse.all.flatMap((p) => {
      let remaining = narrow_down(candidates, {area: area, pulse: p.pulse, different_level: p.different_level}, range)

      if (p.pulse == 3) {
        return remaining.map(r => {
          return {
            pulse: {
              pulse: 3,
              different_level: p.different_level,
              spot: r
            },
            narrowed_candidates: [r]
          }
        })
      } else {
        return [{
          pulse: p,
          narrowed_candidates: remaining
        }]
      }
    })
  }

  export function area_pulse(spot: TileCoordinates, area: TileArea, range: number): Pulse[] {

    if (!area.data) {
      // Optimized branch for rectangular areas.
      const rectArea = TileArea.toRect(area)

      let pulses: Pulse[]

      let max = get_pulse(spot, TileRectangle.clampInto(spot, rectArea), range).pulse

      // This breaks if areas are so large they cover both cases. But in that case: Wtf are you doing?
      if (max == 1) {
        pulses = []

        let complement_spot = complementSpot(spot)

        if (spot.level != rectArea.level || distance(complement_spot, Rectangle.clampInto(complement_spot, rectArea)) <= (range + 15)) {
          // Any tile in area triggers different level
          pulses.push({
            pulse: 1,
            different_level: true
          })
        }

        if ((distance(complement_spot, rectArea.topleft) > (range + 15)
            || distance(complement_spot, rectArea.botright) > (range + 15))
          && spot.level == rectArea.level
        ) { // Any tile in area does not trigger different level
          pulses.push({
            pulse: 1,
            different_level: false
          })
        }
      } else {
        let min = Math.min(
          get_pulse(spot, TileRectangle.tl(rectArea), range).pulse,
          get_pulse(spot, TileRectangle.br(rectArea), range).pulse,
        )

        pulses = rangeRight(min, max + 1, 1).map((p: 1 | 2 | 3) => {
          return {
            pulse: p,
            different_level: spot.level != rectArea.level
          }
        })
      }

      return pulses
    }

    const pulse_hashes: Pulse.hash_t[] = []

    activate(area).getTiles().forEach(t => {
      pulse_hashes.push(Pulse.hash(get_pulse(spot, t, range)))
    })

    return [...new Set(pulse_hashes).values()].map(Pulse.unhash)
  }

  export function narrow_down(candidates: TileCoordinates[], information: ScanInformation, range: number): TileCoordinates[] {
    return candidates.filter((s) => area_pulse(s, information.area, range).some((p2) => Pulse.equals(information, p2)))
  }
}