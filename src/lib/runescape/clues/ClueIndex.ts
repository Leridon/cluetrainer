import {Clues} from "../clues";
import {TileCoordinates} from "../coordinates";
import {Vector2} from "../../math";
import ClueSpot = Clues.ClueSpot;

export class ClueIndex<T extends object = {}> {
  private constructor(public data: ({ clue: Clues.Step } & T)[]) {
  }

  get(id: number): ({ clue: Clues.Step } & T) {
    return this.data[id]
  }

  filtered(): ({ clue: Clues.Step } & T)[] {
    return this.data.filter(c => !!c)
  }

  static simple(base_data: Clues.Step[]): ClueIndex {
    let data: ({ clue: Clues.Step })[] = Array(Math.max(...base_data.map(c => c.id)))

    base_data.forEach(c => {
      data[c.id] = {clue: c}
    })

    return new ClueIndex(data)
  }

  with<U extends object>(init: () => U): ClueIndex<T & U> {
    return new ClueIndex<T & U>(this.data.map(v => {
      return v ? {...v, ...init()} : null
    }))
  }
}

export class ClueSpotIndex<T> {
  static BUCKETS = 64

  private constructor(private _index: {
    clue: Clues.Step,
    value: { for: ClueSpot } & T,
    spot_index?: {
      spot: TileCoordinates
      value: { for: ClueSpot } & T
    }[][]
  }[]) { }

  static simple(base: ClueIndex): ClueSpotIndex<{}> {
    return new ClueSpotIndex(base.data.map(v => {
      let c: {
        clue: Clues.Step,
        value: { for: ClueSpot },
        spot_index?: {
          spot: TileCoordinates
          value: { for: ClueSpot }
        }[][]
      } = {
        clue: v.clue,
        value: {for: {clue: v.clue}},
        spot_index:
          v.clue.type == "compass"
            ? []
            : undefined

      }

      if (v.clue.type == "compass") {
        c.spot_index = new Array(ClueSpotIndex.BUCKETS)

        for (let i = 0; i < c.spot_index.length; i++) {
          c.spot_index[i] = []
        }

        v.clue.spots.forEach(s => {
          let hash = Vector2.hash(s, ClueSpotIndex.BUCKETS)

          c.spot_index[hash].push({
            spot: s,
            value: {for: {clue: v.clue, spot: s}}
          })
        })
      }

      return c
    }))
  }

  with<U extends object>(init: () => U): ClueSpotIndex<T & U> {
    return new ClueSpotIndex<T & U>(this._index.map(v => {

      return {
        clue: v.clue,
        value: {...v.value, ...init()},
        spot_index: v.spot_index
          ? v.spot_index.map(bucket => bucket.map(v => {
            return {
              spot: v.spot,
              value: {...v.value, ...init()}
            }
          }))
          : undefined
      }
    }))
  }

  get(clue: ClueSpot.Id, fallback_if_no_spot_index: boolean = true): { for: Clues.ClueSpot } & T {
    const r = this._index[clue.clue]

    if (!r) return null

    if (!clue.spot && !r.spot_index) return r.value

    if (clue.spot && r.spot_index) {
      const bucket = r.spot_index[Vector2.hash(clue.spot, ClueSpotIndex.BUCKETS)]

      return bucket.find(v => TileCoordinates.eq2(v.spot, clue.spot))?.value ?? (fallback_if_no_spot_index ? r.value : null)
    }

    return (fallback_if_no_spot_index ? r.value : null)
  }

  flat(): ({ for: Clues.ClueSpot } & T)[] {
    let acc = []

    this.forEach(e => acc.push(e))

    return acc
  }

  forEach(f: (e: { for: Clues.ClueSpot } & T) => any) {
    this._index.forEach(e => {
      if (e) {
        if (e.spot_index) e.spot_index.forEach(bucket => {
          bucket.forEach(e => f(e.value))
        })
        else {
          f(e.value)
        }
      }
    })
  }
}