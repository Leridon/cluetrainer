import * as leaflet from "leaflet";
import {floor_t, TileCoordinates} from "../../../lib/runescape/coordinates";
import {Raster} from "../../../lib/util/raster";
import {Scans} from "../../model/clues/Scans";

export type ScanProfile = number[]

export namespace ScanProfile {
  export function compute(tile: TileCoordinates, candidates: TileCoordinates[], range: number): ScanProfile {
    return candidates.map((s) => Scans.Pulse.hash(Scans.get_pulse(tile, s, range)))
  }

  export function equals(a: ScanProfile, b: ScanProfile): boolean {
    if (a.length != b.length) return false

    for (let i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false
    }

    return true
  }

  export function information_gain(profile: ScanProfile): number {
    let n = profile.length

    let counts: number[] = [0, 0, 0, 0, 0, 0, 0, 0]

    profile.forEach((s) => counts[s]++)

    let gain = 0

    // TODO: Somehow get rid of those branches
    if (counts[0] > 0) gain += counts[0] * Math.log2(n / counts[0])
    if (counts[1] > 0) gain += counts[1] * Math.log2(n / counts[1])
    if (counts[2] > 0) gain += counts[2] * Math.log2(n)
    if (counts[3] > 0) gain += counts[3] * Math.log2(n / counts[3])
    if (counts[4] > 0) gain += counts[4] * Math.log2(n / counts[4])
    if (counts[5] > 0) gain += counts[5] * Math.log2(n)

    gain /= n

    return gain
  }

  export class ScanProfileEquivalenceClass {
    public information_gain: number

    constructor(
      public id: number,
      public profile: ScanProfile,
      public area: number[]
    ) {
      this.information_gain = ScanProfile.information_gain(profile)
    }
  }

  export type ScanEquivalenceClassOptions = {
    candidates: TileCoordinates[],
    range: number,
    complement: boolean,
    floor: floor_t
  }

  export class ScanEquivalenceClasses {
    raster: Raster<ScanProfileEquivalenceClass> = null
    equivalence_classes: ScanProfileEquivalenceClass[] = null
    max_information: number

    constructor(private readonly options: ScanEquivalenceClassOptions) {
      if (this.options.candidates.length == 0) {
        this.max_information = 0
        this.equivalence_classes = []
        return
      }

      let bounds = leaflet.bounds(this.options.candidates.map((c) => leaflet.point(c.x, c.y)))

      this.raster = new Raster<ScanProfileEquivalenceClass>(this.options.complement ?
        {
          topleft: {
            x: bounds.getTopLeft().x - (this.options.range + 15),
            y: ((bounds.getBottomLeft().y + (this.options.range + 15) + 1) + 6400) % 12800,    // the Y axis in leaflet.bounds is exactly opposite to what the map uses.
          },
          botright: {
            x: bounds.getTopRight().x + (this.options.range + 15) + 1,
            y: ((bounds.getTopLeft().y - (this.options.range + 15)) + 6400) % 12800
          }
        }
        : {
          topleft: {
            x: bounds.getTopLeft().x - 2 * this.options.range,
            y: bounds.getBottomLeft().y + 2 * this.options.range + 1,    // the Y axis in leaflet.bounds is exactly opposite to what the map uses.
          },
          botright: {
            x: bounds.getTopRight().x + 2 * this.options.range,
            y: bounds.getTopLeft().y - 2 * this.options.range
          },
        })

      this.equivalence_classes = []

      let next_id = 0
      for (let row = 0; row < this.raster.size.y; row++) {
        for (let col = 0; col < this.raster.size.x; col++) {
          let index = row * this.raster.size.x + col

          let tile: TileCoordinates = {
            x: this.raster.bounds.topleft.x + col,
            y: this.raster.bounds.botright.y + row,
            level: this.options.floor
          }

          let profile = ScanProfile.compute(tile, this.options.candidates, this.options.range)

          if (col > 0) {
            let left_neighbour = this.raster.data[index - 1]

            if (ScanProfile.equals(profile, left_neighbour.profile)) {
              this.raster.data[index] = left_neighbour

              left_neighbour.area.push(index)
              continue
            }
          }
          if (row > 0) {
            let down_neighour = this.raster.data[index - this.raster.size.x]

            if (ScanProfile.equals(profile, down_neighour.profile)) {
              this.raster.data[index] = down_neighour

              down_neighour.area.push(index)
              continue
            }
          }

          // Create new equivalence class
          this.raster.data[index] = new ScanProfileEquivalenceClass(next_id++, profile, [index])

          this.equivalence_classes.push(this.raster.data[index])
        }
      }

      this.max_information = Math.max(...this.equivalence_classes.map((c) => c.information_gain))
    }
  }
}