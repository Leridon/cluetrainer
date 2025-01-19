import Properties from "../ui/widgets/Properties";
import {List} from "../../lib/ui/List";
import {C} from "../../lib/ui/constructors";
import text_link = C.text_link;
import link = C.link;
import space = C.space;

export abstract class WikiPage extends Properties {
  constructor() {
    super();

    this.render()
  }

  abstract render(): void

  seeAlso(entries: WikiPage.SeeAlso[]) {
    this.header("See Also")

    const list = new List()

    this.row(list)

    for (const entry of entries) {
      list.item(
        typeof entry.action == "function" ? text_link(entry.name, entry.action) : link(entry.action).text(entry.name), space(), entry.comment ? `(${entry.comment})` : undefined
      )
    }

    return []
  }
}

export namespace WikiPage {
  export type SeeAlso = {
    action: (() => void) | string,
    name: string,
    comment?: string
  }
}