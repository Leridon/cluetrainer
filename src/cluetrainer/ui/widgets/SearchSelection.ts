import {AbstractDropdownSelection} from "./AbstractDropdownSelection";
import Widget from "lib/ui/Widget";
import * as fuzzysort from "fuzzysort";
import TextField from "../../../lib/ui/controls/TextField";

export class SearchSelection<T extends object | string | number> extends AbstractDropdownSelection<T> {

  private prepared_items: { item: T, term: Fuzzysort.Prepared }[]

  constructor(protected options: SearchSelection.options<T>, protected items: T[]) {
    super(options, items[0]);

    this.prepared_items = items.map(i => {
      return {item: i, term: fuzzysort.prepare(this.options.search_term(i))}
    })

    this.setItems([])
  }

  protected override onOpen(): Widget {
    let search_box = new TextField()
      .setValue("")
      .css("width", "100%")
      .onPreview(term => {
        let results = fuzzysort.go(term, this.prepared_items, {
          key: "term",
          all: true,
          threshold: -10000
        })

        this.setItems(Array.from(results).map(r => r.obj.item))
      })
      .appendTo(this.input_container.empty())

    this.setItems(this.items)

    return search_box
  }
}

export namespace SearchSelection {
  export type options<T> = AbstractDropdownSelection.options<T> & {
    search_term: (_: T) => string
  }
}