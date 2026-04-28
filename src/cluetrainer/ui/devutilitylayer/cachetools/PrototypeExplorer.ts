import Widget from "../../../../lib/ui/Widget";
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";
import * as fuzzysort from "fuzzysort";
import TextField from "../../../../lib/ui/controls/TextField";
import Properties from "../../widgets/Properties";
import {C} from "../../../../lib/ui/constructors";
import {CursorType} from "../../../../lib/runescape/CursorType";
import ContextMenu, {MenuEntry} from "../../widgets/ContextMenu";
import {PrototypeFilter} from "./FilteredPrototypeLayer";
import {TileCoordinates} from "../../../../lib/runescape/coordinates";
import Prototype = ProcessedCacheTypes.Prototype;
import vbox = C.vbox;
import hboxl = C.hboxl;
import inlineimg = C.inlineimg;
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;

class PreparedSearch<T> {

  private prepared_items: { item: T, term: Fuzzysort.Prepared }[]

  constructor(items: T[], search_term: (_: T) => string) {

    this.prepared_items = items.map(i => {
      return {item: i, term: fuzzysort.prepare(search_term(i))}
    })
  }

  do(term: string,
     limit: number = undefined
  ): T[] {
    let results = fuzzysort.go(term, this.prepared_items, {
      key: "term",
      all: true,
      threshold: -10000,
      limit: limit
    })

    return results.map(i => i.obj.item)
  }
}

export class PrototypeProperties extends Properties {

  constructor(prototype: Prototype) {
    super()

    this.header(PrototypeProperties.renderName(prototype))
    this.named("Id", prototype.id[1].toString())
    this.named("Size", `${prototype.size.x}x${prototype.size.y}`)

    this.named("Actions", vbox(
      ...prototype.actions.map(action =>
        hboxl(inlineimg(CursorType.meta(action[1]).icon_url), C.space(), action[0], C.space(), `(${action[2]})`)
      )
    ))

  }
}

export namespace PrototypeProperties {
  import staticentity = C.staticentity;
  import npc = C.npc;

  export function renderName(prototype: Prototype): Widget {
    if (Prototype.isLoc(prototype)) {
      return staticentity(prototype.name)
    } else {
      return npc(prototype.name)
    }
  }
}

export class PrototypeInstanceProperties extends PrototypeProperties {
  constructor(instance: PrototypeInstance) {
    super(instance.prototype);

    this.named("Origin", TileCoordinates.toString(instance.instance.position))
    this.named("Rotation", instance.instance.rotation.toString())
  }

}

export class PrototypeExplorer extends Widget {

  private index: PreparedSearch<Prototype>
  private result_area: Widget
  private search_field: TextField

  constructor(prototypes: Prototype[],
              private filter: PrototypeFilter,
              private click_options: (_: Prototype) => MenuEntry[]
  ) {
    super();

    this.search_field = new TextField().setPlaceholder("Search...")
      .onPreview(term =>
        this.update(term)
      ).appendTo(this)

    this.result_area = c().appendTo(this)
      .css("max-height", "600px")
      .css("overflow-y", "scroll")

    this.setPrototypes(prototypes)
  }

  setPrototypes(prototypes: Prototype[]) {
    this.index = new PreparedSearch(prototypes, p => p.name + p.actions.map(a => a[0]).join())

    this.update(this.search_field.get())
  }

  private update(term: string) {
    const results = this.index.do(term, 200)

    this.result_area.empty()

    results.forEach(prototype => {
      new PrototypeExplorer.PrototypeSearchResult(prototype)
        .on("click", e => {
          new ContextMenu({
            type: "submenu",
            children: this.click_options(prototype),
            text: () => PrototypeProperties.renderName(prototype)
          }).showFromEvent(e)
        })
        .appendTo(this.result_area)
    })
  }
}

export namespace PrototypeExplorer {

  import hboxl = C.hboxl;

  export class PrototypeSearchResult extends Widget {
    constructor(prototype: Prototype) {
      super();

      this.addClass("ctr-clickable")

      this.append(hboxl(PrototypeProperties.renderName(prototype), C.space(), `(${prototype.size.x}x${prototype.size.y})`))

      this.addTippy(new PrototypeProperties(prototype), {
        placement: "bottom",
      })
    }
  }
}