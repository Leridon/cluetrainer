import AbstractEditWidget from "./AbstractEditWidget";
import {EntityName} from "../../../lib/runescape/EntityName";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import {C} from "../../../lib/ui/constructors";
import {util} from "../../../lib/util/util";
import TextField from "../../../lib/ui/controls/TextField";
import lodash from "lodash";
import vbox = C.vbox;
import hbox = C.hbox;
import {FakeLodash} from "../../../lib/coreutil/FakeLodash";


export class EntityNameEdit extends AbstractEditWidget<EntityName> {
  constructor(private kinds: EntityName.Kind[] = ["npc", "static"]) {
    super(vbox().container);
  }

  protected override render() {
    this.empty()
    const specifics_container = hbox()

    let group: Checkbox.Group<EntityName.Kind> = undefined

    if (this.kinds.length > 1) {

      const buttons: {
        button: Checkbox,
        value: EntityName.Kind
      }[] =
        this.kinds.map(kind => {

          const name = {
            "npc": "NPC",
            "static": "Object",
            "item": "Item"
          }[kind]

          return {value: kind, button: new Checkbox(name, "radio")}
        });

      const group = new Checkbox.Group<EntityName.Kind>(buttons, false)
        .setValue(this.get()?.kind || "static")
        .onChange(v => {
          const copy = FakeLodash.cloneDeep(this.get())
          if (copy) {
            copy.kind = v
            this.commit(copy)
          }
        })

      specifics_container.append(
        ...group.buttons.map(b => b.button)
      )
    }

    const name = new TextField()
      .css("width", "100%")
      .setValue(this.get()?.name || "")
      .onCommit(v => {
        if (!v) this.commit(null)
        else {
          let copy = FakeLodash.cloneDeep(this.get())

          if (!copy) {
            copy = {name: "", kind: group?.get() ?? copy.kind}
          }

          copy.name = v
          this.commit(copy)
        }

      })

    this.append(
      name,
      specifics_container
    )
  }
}