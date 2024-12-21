import {Scans} from "../../runescape/clues/scans";
import {ScanTree} from "./ScanTree";
import {TileCoordinates, TileRectangle} from "../../runescape/coordinates";
import {TileArea} from "../../runescape/coordinates/TileArea";
import {Rectangle} from "../../math";
import {rangeRight} from "lodash";

export namespace ScanTheory {

  import Pulse = Scans.Pulse;
  import ScanInformation = ScanTree.ScanInformation;
  import get_pulse = Scans.get_pulse;
  import activate = TileArea.activate;
  import complementSpot = Scans.complementSpot;
  import distance = Scans.distance;

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