import {RegionDistanceTable} from "./RegionDistanceTable";
import {Process} from "../../../lib/Process";
import {Region} from "./Region";
import {Observable, observe} from "../../../lib/reactive";
import lodash from "lodash";
import RegionGraph = RegionDistanceTable.RegionGraph;

export class RegionChainDistanceTable {
  public tables: RegionDistanceTable[]

  constructor(public data: Uint8Array) {
    let offset = 0

    const regions: RegionDistanceTable[] = []

    while (offset < data.length) {
      const region = new RegionDistanceTable(data, offset)

      regions.push(region)

      offset += region.byte_size
    }

    this.tables = regions
  }
}

export namespace RegionChainDistanceTable {
  export type Description = {
    multitile: boolean,
    regions: Region[]
  }

  export namespace Description {
    export function bytesize(desc: Description) {
      return lodash.sumBy(desc.regions, r => RegionDistanceTable.Description.byteSize(new Region.Indexing(r)))
    }
  }

  export class Generator extends Process<RegionChainDistanceTable> {
    private progress: Observable<Generator.Progress>
    private active_generator: RegionDistanceTable.Generator = null

    private solved_nodes = 0
    public subgenerators: RegionDistanceTable.Generator[]

    constructor(private description: Description) {
      super();

      this.progress = observe<Generator.Progress>({
        generator: this,
        visited_nodes: 0,
        active_region: 0,
        sub_progress: this.description.regions.map(r => ({
          region: new Region.Indexing(r),
          depth: 0,
          nodes: 0
        }))
      })

      this.subgenerators = this.description.regions.map((region, i) => {
        return new RegionDistanceTable.Generator({
          multitile: this.description.multitile,
          region: region
        })
          .onProgress(progress => {
            this.progress.update2(c => {
              c.visited_nodes = this.solved_nodes + c.visited_nodes
              c.active_region = i
              c.sub_progress[i] = progress
            })
          })
      })

      this.withInterrupt(100, 1)
    }

    public stop() {
      super.stop();

      this.active_generator?.stop()
    }

    async implementation(): Promise<RegionChainDistanceTable> {

      const generated_regions: RegionDistanceTable[] = []

      for (let i = 0; i < this.description.regions.length; i++) {
        if (this.should_stop) return null

        const generator = this.active_generator = this.subgenerators[i]

        generated_regions.push(await generator.run())

        console.log(`Generator ${i} ended`)

        this.solved_nodes += generator.region.size
      }

      const sum = lodash.sumBy(generated_regions, r => r.byte_size)

      const total = new Uint8Array(sum)

      let offset = 0
      for (let region of generated_regions) {
        total.set(region.underlying_data, offset)
        offset += region.byte_size
      }

      const result = new RegionChainDistanceTable(total)

      this.progress.update2(c => {
        c.final_result = result
      })

      return result
    }

    onProgress(f: (_: Generator.Progress) => void): this {
      this.progress.subscribe(f)
      return this
    }
  }

  export namespace Generator {
    export type Progress = {
      generator: Generator
      visited_nodes: number,
      active_region: number,
      final_result?: RegionChainDistanceTable,
      sub_progress: RegionDistanceTable.Generator.Progress[]
    }
  }
}