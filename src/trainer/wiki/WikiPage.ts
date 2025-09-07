import Properties from "../ui/widgets/Properties";
import {List} from "../../lib/ui/List";
import {C} from "../../lib/ui/constructors";
import text_link = C.text_link;
import link = C.link;
import space = C.space;
import italic = C.italic;
import hboxc = C.hboxc;

export abstract class WikiPage extends Properties {
  constructor() {
    super();

    this.render()
  }

  abstract render(): void

  image(url: string, caption?: string) {
    this.row(hboxc(
      C.img(url).css2({"max-width": "200px", margin: "0 auto"}),
    ))

    if(caption) this.row(hboxc(italic(caption).css("font-size", "0.9em")))
  }

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
  
  protected todo() {
    this.paragraph(italic("This page is yet to be written."))
  }
}

export namespace WikiPage {
  export type SeeAlso = {
    action: (() => void) | string,
    name: string,
    comment?: string
  }

  export function placeholder(): WikiPage {
    return new class extends WikiPage {
      render(): void {
        this.todo()
      }
    }
  }
}