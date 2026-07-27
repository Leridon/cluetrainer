import {OptimizedSliderState} from "./OptimizedSliderState";
import {Region} from "./Region";
import {Process} from "../../../lib/Process";
import {Observable, observe} from "../../../lib/reactive";
import {MoveTable} from "./MoveTable";
import {util} from "../../../lib/util/util";

export class RegionDistanceTable {
  public description: RegionDistanceTable.Description

  public readonly byte_size: number

  indexing: Region.Indexing
  move_table: MoveTable

  private real_data_offset: number

  constructor(public underlying_data: Uint8Array, public data_offset: number) {
    this.description = RegionDistanceTable.Description.deserialize(underlying_data, data_offset)

    this.indexing = new Region.Indexing(this.description.region)
    this.move_table = new MoveTable(this.description.region, this.description.multitile)

    this.byte_size = RegionDistanceTable.Description.SERIALIZED_SIZE + this.indexing.size / 4
    this.real_data_offset = data_offset + RegionDistanceTable.Description.SERIALIZED_SIZE
  }

  /**
   * Returns the number of moves required to solve this region from the current state MOD 4
   * @param state
   */
  getDistance(state: OptimizedSliderState): number {
    return this.getDistanceByIndex(this.indexing.stateIndex(state))
  }

  getDistanceByIndex(index: number): number {
    return (this.underlying_data[this.real_data_offset + ~~(index / 4)] >> 2 * (index % 4)) & 0x03
  }
}

export namespace RegionDistanceTable {

  import numberWithCommas = util.numberWithCommas;
  export type Description = {
    region: Region,
    multitile: boolean
  }

  export namespace Description {
    export const SERIALIZED_SIZE = 26

    export function serialize(description: Description): Uint8Array {
      return new Uint8Array([description.multitile ? 1 : 0, ...description.region])
    }

    export function deserialize(data: Uint8Array, offset: number): Description {
      const multitile = data[offset] == 1
      const tiles = data.slice(offset + 1, offset + 26)
      return {
        multitile: multitile,
        region: [...tiles] as Region.Tile[],
      }
    }

    export function byteSize(region: Region.Indexing): number {
      return RegionDistanceTable.Description.SERIALIZED_SIZE + region.size / 4
    }
  }

  export class RegionGraph {
    private nodes: RegionGraph.Node[]
    private entry_nodes: RegionGraph.Node[]

    constructor(private databases: RegionDistanceTable[], include_reflected_nodes: boolean) {
      const nodes: RegionGraph.Node[] = []

      databases.forEach((table, i) => {
        nodes.push({effective_region: table.description.region, table: table, reflected: false, children: [], name: i.toString()})

        if (include_reflected_nodes) {
          const reflected = Region.reflect(table.description.region)

          if (!(nodes.some(n => Region.equals(n.effective_region, reflected)))) nodes.push({effective_region: reflected, table: table, reflected: true, children: [], name: i.toString() + "R"})
        }
      })

      this.nodes = nodes

      nodes.forEach(parent => nodes.forEach(child => {
        if (parent != child && Region.isChild(parent.effective_region, child.effective_region)) {
          parent.children.push(child)
        }
      }))

      this.entry_nodes = this.nodes.filter(n => Region.isFirst(n.effective_region))
    }

    getEntryPoints(): RegionGraph.Node[] {
      return this.entry_nodes
    }
  }

  export namespace RegionGraph {
    export type Node = {
      reflected: boolean,
      name: string,
      effective_region: Region,
      table: RegionDistanceTable,
      children: Node[]
    }
  }


  class Queue {
    private buffer: ArrayBuffer
    private view: Uint8Array
    private next_free: number
    private next_element: number

    public length = 0

    constructor(private size: number) {
      this.buffer = new ArrayBuffer(size * OptimizedSliderState.SIZE)
      this.view = new Uint8Array(this.buffer)
      this.next_free = 0
      this.next_element = 0
    }

    enqueue(state: OptimizedSliderState) {
      this.view.set(state, this.next_free)

      this.next_free = (this.next_free + OptimizedSliderState.SIZE) % this.view.length
      this.length++
    }

    poll(): OptimizedSliderState {
      const s = new Uint8Array(this.buffer, this.next_element, OptimizedSliderState.SIZE)
      this.next_element = (this.next_element + OptimizedSliderState.SIZE) % this.view.length
      this.length--
      return s
    }

    isEmpty(): boolean {
      return this.next_free == this.next_element
    }
  }

  export class Generator extends Process<RegionDistanceTable> {
    private progress: Observable<Generator.Progress>

    public region: Region.Indexing
    private visited_nodes: number = 0
    private current_depth: number = 0

    constructor(private description: Description) {
      super();

      this.region = new Region.Indexing(this.description.region)

      this.progress = observe<Generator.Progress>({region: this.region, nodes: 0, depth: 0})

      this.withInterrupt(100, 10)

      this.onInterrupt(() => {
        this.progress.set({region: this.region, nodes: this.visited_nodes, depth: this.current_depth})
      })
    }

    async implementation(): Promise<RegionDistanceTable> {

      const r = this.region
      const move_table = new MoveTable(this.description.region, this.description.multitile)

      const visited = new Uint8Array(Math.ceil(r.size / 8)).fill(0)
      const compressed = new Uint8Array(Description.SERIALIZED_SIZE + r.size / 4).fill(0)

      let depth = 0
      const queue = new Queue(75_000_000)

      const push = (state: OptimizedSliderState, depth: number) => {
        const index = r.stateIndex(state)

        const h = ~~(index / 8)
        const l = index % 8

        if (((visited[h] >> l) & 1) != 0) return

        visited[h] |= 1 << l
        compressed[Description.SERIALIZED_SIZE + ~~(index / 4)] |= (depth % 4) << 2 * (index % 4)

        this.visited_nodes++
        queue.enqueue(state)
      }

      // Determine all solved states
      if (r.solves_puzzle) {
        push(OptimizedSliderState.SOLVED, 0)
      } else {
        for (let i = 0; i < 25; i++) {
          if (this.description.region[i] == Region.Tile.FREE) {
            const state = OptimizedSliderState.copy(OptimizedSliderState.SOLVED)

            state[24] = i
            state[i] = 24
            state[OptimizedSliderState.BLANK_INDEX] = i

            push(state, 0)
          }
        }
      }

      let previous_node_count = 0

      while (!queue.isEmpty()) {
        const n = this.visited_nodes - previous_node_count

        console.log(`Depth ${depth}, total ${numberWithCommas(this.visited_nodes)}/${numberWithCommas(r.size)}, queue: ${numberWithCommas(n)}/${numberWithCommas(queue.length)}`)

        previous_node_count = this.visited_nodes

        this.current_depth = depth++

        for (let i = 0; i < n; i++) {
          const node = queue.poll()

          if (this.visited_nodes % 100000 == 0) await this.checkTime()

          if (this.should_stop) return null

          for (const move of move_table.get(node)) {
            const child = OptimizedSliderState.copy(node)
            OptimizedSliderState.doMove(child, move)

            push(child, depth)
          }
        }
      }

      console.log(`Depth ${depth}, total ${this.visited_nodes}/${r.size}`)

      compressed.set(Description.serialize(this.description), 0)

      this.progress.set({region: this.region, nodes: this.visited_nodes, depth: this.current_depth})

      return new RegionDistanceTable(compressed, 0)
    }

    onProgress(f: (_: Generator.Progress) => void): this {
      this.progress.subscribe(f)
      return this
    }
  }


  export namespace Generator {
    export type Progress = {
      region: Region.Indexing,
      nodes: number,
      depth: number
    }
  }
}

