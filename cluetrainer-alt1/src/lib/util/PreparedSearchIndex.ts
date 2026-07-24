import * as fuzzysort from "fuzzysort";
import KeyResult = Fuzzysort.KeyResult;

export default class PreparedSearchIndex<T> {
  private index: { value: T, prepared: Fuzzysort.Prepared }[]

  constructor(items: T[], key: (_: T) => string, private default_options: Fuzzysort.Options = {}) {
    this.index = items.map(i => ({value: i, prepared: fuzzysort.prepare(key(i))}))
  }

  do(term: string, options: Fuzzysort.Options = {}): KeyResult<T>[] {
    return fuzzysort.go(term, this.index, {
      ...this.default_options,
      ...options,
      key: "prepared"
    }).map(i => ({
      ...i,
      obj: i.obj.value
    }))
  }

  search(term: string, options: Fuzzysort.Options = {}): T[] {
    return this.do(term, options).map(v => v.obj)
  }

  setDefaultOptions(options: Fuzzysort.Options): this {
    this.default_options = options
    return this
  }

  items(): T[] {
    return this.index.map(e => e.value)
  }
}