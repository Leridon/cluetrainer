import {SearchSelection} from "../ui/widgets/SearchSelection";
import {Transportation} from "../../lib/runescape/transportation";
import {TransportData} from "../../data/transports";
import Dependencies from "../dependencies";

export default class TeleportSelect extends SearchSelection<Transportation.TeleportGroup.Spot> {
  constructor() {
    super({
      type_class: {
        toHTML: (v: Transportation.TeleportGroup.Spot) => {
          return c(`<div>${v.hover()}</div>`)
        }
      },
      search_term: (t: Transportation.TeleportGroup.Spot) => t.hover()
    }, TransportData.getAllTeleportSpots());
  }
}