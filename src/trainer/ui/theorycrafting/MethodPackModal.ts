import Properties from "../widgets/Properties";
import TextField from "../../../lib/ui/controls/TextField";
import TextArea from "../../../lib/ui/controls/TextArea";
import {MethodPackManager, Pack} from "../../model/MethodPackManager";
import {BigNisButton} from "../widgets/BigNisButton";
import {deps} from "../../dependencies";
import {AssumptionProperty} from "./AssumptionProperty";
import * as lodash from "lodash";
import {FormModal} from "../../../lib/ui/controls/FormModal";
import AbstractEditWidget from "../widgets/AbstractEditWidget";
import {util} from "../../../lib/util/util";
import copyUpdate = util.copyUpdate;
import {Notification} from "../NotificationBar";
import notification = Notification.notification;

export class MethodPackMetaEdit extends AbstractEditWidget<Pack.Meta> {

  private name: TextField
  private authors: TextField
  private description: TextArea

  constructor(value: Pack.Meta) {
    super();

    this.setValue(value)
  }

  protected render() {
    this.empty()

    const props = new Properties().appendTo(this)

    const value = this.get()

    props.named("Name",this.name =  new TextField()
      .onCommit(v => {
        this.commit(copyUpdate(this.get(), meta => meta.name = v))
      })
      .setPlaceholder("Enter a pack name...").setValue(value.name))
    props.named("Author(s)",this.authors =  new TextField()
      .onCommit(v => {
        this.commit(copyUpdate(this.get(), meta => meta.author = v))
      })
      .setPlaceholder("Enter author(s)...").setValue(value.author))

    props.header("Description")
    props.row(this.description = new TextArea()
      .setPlaceholder("Optionally enter a description.")
      .onCommit(v => {
        this.commit(copyUpdate(this.get(), meta => meta.description = v))
      })
      .css("height", "80px").setValue(value.description))

    props.header("Default Assumptions")
    props.row(new AssumptionProperty()
      .setValue(value.default_assumptions)
      .onCommit(a => {
        this.commit(copyUpdate(this.get(), meta => meta.default_assumptions = a))
      })
    )

    props.header("Default Method Name")
    props.row(new TextField()
      .onCommit(v => {
        this.commit(copyUpdate(this.get(), meta => meta.default_method_name = v))
      })
      .setPlaceholder("Enter default name...").setValue(value.default_method_name)
    )
  }
}

export class NewMethodPackModal extends FormModal<{
  created: Pack
}> {
  edit: MethodPackMetaEdit

  constructor(private clone_from: Pack = null) {
    super({size: "small"});
  }

  render() {
    super.render();

    if (this.clone_from) {
      this.title.set("Clone Method Pack")
      this.edit = new MethodPackMetaEdit({
        name: `${this.clone_from.name} (Clone)`,
        description: this.clone_from.description,
        author: this.clone_from.author,
        default_assumptions: this.clone_from.default_assumptions,
        default_method_name: this.clone_from.default_method_name
      }).appendTo(this.body)

    } else {
      this.title.set("Create Method Pack")
      this.edit = new MethodPackMetaEdit({name: "", description: "", author: "", default_assumptions: {}, default_method_name: ""}).appendTo(this.body)
    }
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.hide()),
      new BigNisButton("Save", "confirm")
        .onClick(async () => {

          const pack = await MethodPackManager.instance().create(
            this.clone_from
              ? {...lodash.cloneDeep(this.clone_from), ...this.edit.get()}
              : {
                ...this.edit.get(),
                type: "local",
                local_id: "",
                original_id: "",
                timestamp: 0,
                methods: []
              })

          notification(`Method Pack '${pack.name}' created!`).show()

          this.confirm({
            created: pack
          })
        }),
    ]
  }

  protected getValueForCancel(): { created: Pack } {
    return {created: null}
  }
}

export class EditMethodPackModal extends FormModal<{
  saved: boolean
}> {
  edit: MethodPackMetaEdit

  constructor(private pack: Pack) {
    super({size: "small"});
  }

  render() {
    super.render();

    this.title.set("Edit Method Pack")

    this.edit = new MethodPackMetaEdit(Pack.meta(this.pack)).appendTo(this.body)
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.hide()),
      new BigNisButton("Save", "confirm")
        .onClick(async () => {

          const pack = await MethodPackManager.instance().updatePack(this.pack,
            p => Pack.setMeta(p, this.edit.get()))

          notification(`Saved changes to method Pack '${pack.name}'!`).show()

          this.confirm({
            saved: true
          })
        }),
    ]
  }

  protected getValueForCancel(): { saved: boolean } {
    return {saved: false}
  }
}