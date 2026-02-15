import Widget from "../../../lib/ui/Widget";
import {ewent} from "../../../lib/reactive";
import Properties from "../widgets/Properties";
import TextField from "../../../lib/ui/controls/TextField";
import LightButton from "../widgets/LightButton";
import {PrototypeFilter} from "./cachetools/FilteredPrototypeLayer";
import {storage} from "lib/util/storage";
import AbstractEditWidget from "../widgets/AbstractEditWidget";
import lodash from "lodash";


export class PrototypeFilterEdit extends AbstractEditWidget<PrototypeFilter.Config> {
  storage = new storage.Variable<PrototypeFilter.Config>("devutility/locfilter", () => ({}))

  constructor() {
    super();

    this.setValue(this.storage.get())

    this.onCommit(c => this.storage.set(c))
  }

  private update(f: (_: PrototypeFilter.Config) => void) {

    const copy = lodash.cloneDeep(this.get())

    f(copy)

    this.commit(copy)
  }

  protected render() {
    this.empty()

    const filter = this.get()

    const props = new Properties()

    props.named("Name",
      new TextField()
        .setValue(filter.names ? filter.names.join(";") : "")
        .onCommit(v => {

          const names = v.split(";").map(l => l.trim().toLowerCase()).filter(l => l.length > 0)

          this.update(f => f.names = names)
        })
    )

    props.named("Action",
      new TextField()
        .setValue(filter.action_names ? filter.action_names.join(";") : "")
        .onCommit(v => {
          const names = v.split(";").map(l => l.trim().toLowerCase()).filter(l => l.length > 0)

          this.update(f => f.action_names = names)
        })
    )

    /*
        props.named("Loc ID", new TextField()
          .setValue(this.filter.value().object_ids ? this.filter.value().object_ids.join(";") : "")
          .onCommit((v) => {
            const ids = v.split(";").map(l => Number(l.trim().toLowerCase())).filter(l => l != 0 && !Number.isNaN(l))

            this.filter.update(f => f.object_ids = ids)
          })
        )*/

    /*props.header("Parser")

    const group = new Checkbox.Group([
      {value: false, button: new Checkbox("No")},
      {value: true, button: new Checkbox("Yes")},
    ], true)
      .setValue(this.filter.value().parser)
      .onChange(v => {
        this.filter.update(f => f.parser = v)
      })

    props.row(hbox(...group.checkboxes()))
*/

    this.append(props)
  }
}