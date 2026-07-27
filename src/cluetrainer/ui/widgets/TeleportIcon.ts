import Widget from "../../../lib/ui/Widget";
import {C} from "../../../lib/ui/constructors";
import {Transportation} from "../../../lib/runescape/transportation";
import div = C.div;
import img = C.img;

export default class TeleportIcon extends Widget {

  constructor(spot: Transportation.TeleportGroup.Spot) {
    super();

    this.tooltip(spot.hover())
    this.addClass("ctr-teleport-icon")

    this.append(
      img(`assets/icons/teleports/${spot.image().url}`),
      div().text(spot.code())
    )
  }
}