import lodash from "lodash";
import {OptimizedSliderState} from "./OptimizedSliderState";
import {Sliders} from "../Sliders";
import {util} from "../../../lib/util/util";
import factorial = util.factorial;
import {FakeLodash} from "../../../lib/coreutil/FakeLodash";

const n_choose_k_table: number[][] = (() => {
  function choose(n: number, k: number): number {
    if (k > n) return 0

    return factorial(n, n - k) / factorial(k)
  }

  const res: number[][] = new Array(26).fill(null).map(_ => {
    return new Array(26).fill(null)
  })

  for (let n = 0; n <= 25; n++) {
    for (let k = 0; k <= 25; k++) {
      res[n][k] = choose(n, k)
    }
  }

  return res
})()

const factorial_table: number[] = (() => {
  return new Array(12).fill(null)
    .map((_, i) => factorial(i))
})()

export type Region = Region.Tile[]

type bintree = {
  value?: number,
  size: number,
  left?: bintree,
  right?: bintree
}

namespace bintree {
  export function insert(tree: bintree, value: number): number {
    tree.size++

    if (tree.value == null) {
      tree.value = value
      tree.left = {size: 0}
      tree.right = {size: 0}

      return 0
    } else if (value < tree.value) {
      tree.size++

      return tree.right.size + 1 + insert(tree.left, value)
    } else {
      return insert(tree.right, value)
    }
  }
}

export namespace Region {

  export function empty(): Region {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
  }

  export function reflect(region: Region): Region {
    return OptimizedSliderState.tile_reflection_table.map(i => region[i])
  }

  export function equals(a: Region, b: Region): boolean {
    return lodash.isEqual(a, b)
  }

  import count = util.count;
  import factorial = util.factorial;
  import SliderState = Sliders.SliderState;

  export class Indexing {
    public number_of_permutations: number
    public current: number
    public freedom: number
    public size: number
    private solution_relevant_indices: number[]

    private combination_relevant_indices: number[]
    private relevant_tile_numbers: boolean[]

    public readonly solves_puzzle: boolean

    private permutation_array: number[]

    constructor(private region: Region) {
      this.solves_puzzle = region.every((t, i) => t != Tile.FREE || [23, 19].includes(i))
      this.current = count(region, t => t == Tile.CURRENT) + (this.solves_puzzle ? 0 : 1) // +1 because the blank tile is always part of this
      this.freedom = count(region, t => t != Tile.FIXED)
      this.permutation_array = new Array(this.current).fill(null)

      this.number_of_permutations = factorial(this.current)
      this.size = factorial(this.freedom, Math.max(2, this.freedom - this.current))

      {
        this.combination_relevant_indices = FakeLodash.sortBy(region.map((tile, i) => [tile, i]).filter(e => e[0] != Tile.FIXED), e => -e[0]).map(e => e[1])

        this.relevant_tile_numbers = region.map((tile, index) => tile == Tile.CURRENT || index == SliderState.BLANK_TILE)
      }

      this.solution_relevant_indices = region.flatMap((tile, position) => tile == Tile.CURRENT || tile == Tile.FIXED ? [position] : [])

    }

    stateIndex(state: OptimizedSliderState): number {

      // TODO: This is O(n²), but there is an O(n log n) algorithm. Also, inline this so ideally no array needs to be created.
      //       For the regions we use, in the worst case these are 6+5+4+3+2+1 = 21 comparisons, so this might not be as relevant
      //       The n log n algorithm involves maintaining something that can be binary searched, so either a binary tree or a sorted array, which for the sizes we are working with is more overhead than the saved comparison
      function permutationIndex(pm: number[]): number {
        let t = 0;
        for (let i = 1; i < pm.length; i++) {
          const value = factorial_table[i]

          for(let j = 0; j < i; j++) if(pm[j] > pm[i]) t += value
        }
        return t
      }

      let combination_index = 0

      {
        // https://en.wikipedia.org/wiki/Combinatorial_number_system
        // https://www.jaapsch.net/puzzles/compindx.htm

        let counter = 1

        for (let i = 0; i < this.combination_relevant_indices.length && counter <= this.current; i++) {
          const index = this.combination_relevant_indices[i]
          const tile = state[index]

          if (this.relevant_tile_numbers[tile]) {
            // There's a relevant tile in this position
            this.permutation_array[counter - 1] = tile

            combination_index += n_choose_k_table[i][counter]
            counter += 1
          }
        }
      }

      //return combination_index * this.number_of_permutations + permutation_part
      return combination_index * this.number_of_permutations + permutationIndex(this.permutation_array)
    }

    satisfied(state: OptimizedSliderState): boolean {
      return this.solution_relevant_indices.every(i => state[i] == i)
    }
  }

  export type Tile = typeof Tile.FIXED | typeof Tile.CURRENT | typeof Tile.FREE

  export namespace Tile {
    export const FREE = 0
    export const CURRENT = 1
    export const FIXED = 2
  }

  export function isFirst(region: Region): boolean {
    return region.every(tile => tile != Tile.FIXED)
  }

  export function isChild(parent: Region, child: Region): boolean {
    return child.every((child_tile, index) => {
      const parent_tile = parent[index]

      switch (child_tile) {
        case Tile.FREE:
        case Tile.CURRENT:
          return parent_tile == Tile.FREE
        case Tile.FIXED:
          return parent_tile == Tile.FIXED || parent_tile == Tile.CURRENT
      }
    })
  }

  export function child(parent: Region): Region {
    return parent.map(tile => {
      if (tile == Tile.FREE) return Tile.FREE
      else return Tile.FIXED
    })
  }

  export function solvesPuzzle(region: Region): boolean {
    return region.every(tile => tile != Tile.FREE)
  }

  export function lookupTableSize(region: Region): number {
    const current_tiles = count(region, tile => tile == Tile.CURRENT)
    const free_tiles = count(region, tile => tile == Tile.FREE)

    const usable_spots = current_tiles + free_tiles

    let result = 1

    for (let i = 0; i <= current_tiles; i++) result *= (usable_spots - i)

    return result
  }

  export function check(region: Region): string[] {
    // TODO:
    //   - Connected
    //   - Blank is free or everything is solved
    //   - Every free

    return []
  }
}