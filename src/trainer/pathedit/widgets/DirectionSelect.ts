import {DropdownSelection} from "../../ui/widgets/DropdownSelection";
import {direction} from "../../../lib/runescape/movement";
import {capitalize} from "lodash";

export default class DirectionSelect extends DropdownSelection<direction> {
  constructor() {
    super({
        type_class: {
          toHTML: (v: direction) => {
            if (v != null)
              return c().text(capitalize(direction.toString(v)))
            else
              return c().text("none")
          }
        },
      },
      direction.all.concat(null)
    )
  }
}