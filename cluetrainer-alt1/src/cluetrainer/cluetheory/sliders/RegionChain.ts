import {Region} from "./Region";

export type RegionChain<ValueT> = {
  region: Region,
  value: ValueT
}[]

export namespace RegionChain {
  export class Active<ValueT> {
    constructor(private nodes: RegionChain<ValueT>) {

    }
  }
}