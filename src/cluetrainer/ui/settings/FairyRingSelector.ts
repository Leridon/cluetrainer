import {Transportation} from "../../../lib/runescape/transportation";
import {TransportData} from "../../../data/transports";
import {SearchSelection} from "../widgets/SearchSelection";
import {C} from "../../../lib/ui/constructors";
import span = C.span;
import hboxl = C.hboxl;
import inlineimg = C.inlineimg;


export class FairyRingSelector extends SearchSelection<Transportation.TeleportSpot> {

  constructor() {
    const group = TransportData.getTeleportGroup("fairyring")

    super({
      type_class: {
        toHTML: e => {
          if (e) return c(`<span><span style="font-weight: bold">${e.code}</span> - </span>`).append(span(e.name))
          else return span("None").css("font-style", "italic")
        },
      },
      search_term: e => e ? `${e.code} - ${e.name}` : "None"
    }, [null].concat(group.spots.filter(e => e.code && e.code.length > 0)));
  }

  set(id: string) {
    if (id) {
      this.setValue(this.items.find(i => i && i.id == id))
    } else {
      this.setValue(null)
    }

    return this
  }
}

export class PotaJewellrySelector extends SearchSelection<{
  group: Transportation.TeleportGroup,
  access: Transportation.TeleportAccess & { type: "item" }
}> {
  constructor() {
    const items = TransportData.teleports.flatMap(group =>
      group.access.filter(a => a.type == "item" && a.can_be_in_pota).flatMap(access => ({
        group: group,
        access: access as Transportation.TeleportAccess & { type: "item" }
      }))
    ).sort((a, b) => a.access.name.name.localeCompare(b.access.name.name))

    items.sort()

    super({
      type_class: {
        toHTML: e => {
          if (e) return hboxl(
            inlineimg(`assets/icons/teleports/${e.access.img?.url ?? e.group.img?.url}`),
            e.access.name.name
          )
          else return c().text("Empty").css("font-style", "italic")
        }
      },
      search_term: e => e ? e.access.name.name : ""
    }, [null].concat(items));
  }

  set(id: {
    group_id: string,
    access_id: string
  }): this {

    if (id) {
      this.setValue(
        this.items.find(i => i && i.access.id == id.access_id && i.group.id == id.group_id)
      )
    } else {
      this.setValue(null)
    }

    return this
  }

}