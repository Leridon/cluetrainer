import AbstractEditWidget from "../widgets/AbstractEditWidget";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import {DropdownSelection} from "../widgets/DropdownSelection";
import {MethodPackManager} from "../../MethodPackManager";
import Widget from "../../../lib/ui/Widget";
import lodash from "lodash";
import {C} from "../../../lib/ui/constructors";
import {util} from "../../../lib/util/util";
import span = C.span;
import copyUpdate = util.copyUpdate;
import {MethodPack} from "../../model/MethodPack";

export type DisplayedRouteFilter = {
  type: "favourites" | "pack" | "none",
  local_pack_id?: string
}

export class DisplayedRouteFilterEdit extends AbstractEditWidget<DisplayedRouteFilter> {
  method_dropdown: DropdownSelection<MethodPack>

  constructor() {
    super();
  }

  setValue(v: DisplayedRouteFilter): this {
    if (!v) v = {type: "none"}

    return super.setValue(v)
  }

  protected async render() {
    this.empty()

    const filter = this.get()

    const group = new Checkbox.Group<DisplayedRouteFilter["type"]>([
      {value: "none", button: new Checkbox("None")},
      {value: "favourites", button: new Checkbox("Preferred")},
      {value: "pack", button: new Checkbox("Method Pack")},
    ])
      .setValue(filter.type)
      .onChange(async kind => {
        this.method_dropdown.setEnabled(kind == "pack")

        const default_pack = (await MethodPackManager.instance().all())[0]

        this.commit(copyUpdate(this.get(), filter => {
          filter.type = kind

          if (kind == "pack") {
            filter.local_pack_id ??= default_pack.local_id
          }
        }))
      })

    this.append(...group.checkboxes())

    this.method_dropdown = new DropdownSelection({
        type_class: {
          toHTML(v: MethodPack): Widget {
            if (v) return span(`${lodash.capitalize(v.type)}: ${v.name}`)
            else return span("None")
          }
        },
      },
      await MethodPackManager.instance().all()
    )
      .setValue(await MethodPackManager.instance().getPack(filter.local_pack_id))
      .setItems(async () => await MethodPackManager.instance().all())
      .setEnabled(filter.type == "pack")
      .onSelection(pack => {
        this.commit(copyUpdate(this.get(), filter => {
          filter.local_pack_id = pack.local_id
        }))
      })
      .appendTo(this)
  }

}