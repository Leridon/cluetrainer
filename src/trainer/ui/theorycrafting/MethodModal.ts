import {FormModal} from "../../../lib/ui/controls/FormModal";
import {AugmentedMethod, MethodPackManager, Pack} from "../../model/MethodPackManager";
import {BigNisButton} from "../widgets/BigNisButton";
import * as lodash from "lodash";
import {NewMethodPackModal} from "./MethodPackModal";
import TextField from "../../../lib/ui/controls/TextField";
import TextArea from "../../../lib/ui/controls/TextArea";
import Properties from "../widgets/Properties";
import {AssumptionProperty} from "./AssumptionProperty";
import {SolvingMethods} from "../../model/methods";
import {Clues} from "../../../lib/runescape/clues";
import {DropdownSelection} from "../widgets/DropdownSelection";
import AbstractEditWidget from "../widgets/AbstractEditWidget";
import {util} from "../../../lib/util/util";
import Method = SolvingMethods.Method;
import ClueSpot = Clues.ClueSpot;
import ClueAssumptions = SolvingMethods.ClueAssumptions;
import copyUpdate = util.copyUpdate;

export class MethodMetaEdit extends AbstractEditWidget<Method.Meta> {

  private name: TextField
  private description: TextArea

  constructor(private spot: ClueSpot, value: Method.Meta, private include_assumptions: boolean = true) {
    super();

    value.assumptions = ClueAssumptions.filterWithRelevance(value.assumptions, ClueAssumptions.Relevance.forSpot(this.spot))

    this.setValue(value)
  }

  protected render() {
    this.empty()

    const props = new Properties().appendTo(this)

    const value = this.get()

    props.named("Name", this.name = new TextField()
      .onCommit(v => {
        this.commit(copyUpdate(this.get(), meta => meta.name = v))
      })
      .setPlaceholder("Enter a method name...").setValue(value.name))

    props.header("Description")
    props.row(this.description = new TextArea()
      .setPlaceholder("Optionally enter a description.")
      .onCommit(v => {
        this.commit(copyUpdate(this.get(), meta => meta.description = v))
      })
      .css("height", "80px").setValue(value.description))

    if (this.include_assumptions) {
      props.header("Clue Assumptions")
      props.row(new AssumptionProperty()
        .setValue(value.assumptions)
        .setRelevantAssumptions(ClueAssumptions.Relevance.forSpot(this.spot))
        .onCommit(a => {
          this.commit(copyUpdate(this.get(), meta => meta.assumptions = a))
        })
      )
    }
  }
}

class PackSelector extends AbstractEditWidget<Pack> {
  private selector: DropdownSelection<{
    pack: Pack | null,
    create_new?: boolean
  }>

  constructor() {
    super();
  }

  async render() {
    this.empty()

    const val = this.get()

    this.selector = new DropdownSelection<{
      pack: Pack,
      create_new?: boolean
    }>({
      type_class: {
        toHTML: (pack) => {
          if (!pack) return c().text("None")

          if (pack.create_new) {
            return c().text("Create New")
          } else {
            return c().text(pack.pack.name)
          }
        }
      }
    }, [])
      .setItems(async () => {
        return [
          ...(await MethodPackManager.instance().all()).filter(p => Pack.isEditable(p)).map(p => ({pack: p})),
          {pack: null, create_new: true},
          null
        ]
      })
      .setValue(val ? {pack: val} : null)
      .onSelection(async s => {
        if (s?.create_new) {
          this.selector.setValue(null)

          const new_pack = await new NewMethodPackModal().do()

          if (new_pack?.created) {
            this.commit(new_pack.created)
          }

        } else {
          this.commit(s?.pack)
        }
      })
      .appendTo(this)
  }
}

export class NewMethodModal extends FormModal<{
  created: AugmentedMethod
}> {
  pack_selector: PackSelector
  edit: MethodMetaEdit

  constructor(private spot: ClueSpot, private clone_from: AugmentedMethod = null) {
    super({size: "small"});
  }

  render() {
    super.render();

    new Properties().appendTo(this.body)
      .named("Pack", this.pack_selector = new PackSelector()
        .setValue(this.clone_from && Pack.isEditable(this.clone_from.pack) ? this.clone_from.pack : null)
        .onCommit(p => {
          if (p) {
            const meta = lodash.cloneDeep(this.edit.get())

            meta.assumptions = ClueAssumptions.filterWithRelevance(p.default_assumptions, ClueAssumptions.Relevance.forSpot(this.spot))
            meta.name = p.default_method_name

            this.edit.setValue(meta)
          }
        })
      )

    if (this.clone_from) {
      this.title.set("Clone Method")
      this.edit = new MethodMetaEdit(this.spot, copyUpdate(Method.meta(this.clone_from.method), cp => {
        cp.name += " (Clone)"
      })).appendTo(this.body)

    } else {
      this.title.set("Create New Method")
      this.edit = new MethodMetaEdit(this.spot, {name: "", description: "", assumptions: {}}).appendTo(this.body)
    }
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.confirm(this.getValueForCancel())),
      new BigNisButton("Create", "confirm")
        .onClick(async () => {

          const base = this.clone_from
            ? SolvingMethods.clone(this.clone_from.method)
            : SolvingMethods.init(this.spot)

          Method.setMeta(base, this.edit.get())

          base.assumptions = ClueAssumptions.filterWithRelevance(base.assumptions, ClueAssumptions.Relevance.forSpot(this.spot))

          this.confirm({
            created: AugmentedMethod.create(base, this.pack_selector.get())
          })
        }),
    ]
  }

  protected getValueForCancel(): { created: AugmentedMethod } {
    return {created: null}
  }
}

export class EditMethodMetaModal extends FormModal<{
  result: Method.Meta
}> {
  edit: MethodMetaEdit

  constructor(private spot: ClueSpot, private start_value: Method.Meta, private include_assumptions: boolean = true) {
    super({size: "small"});
  }

  render() {
    super.render();

    this.title.set("Edit Method Metainformation")
    this.edit = new MethodMetaEdit(this.spot, this.start_value, this.include_assumptions).appendTo(this.body)
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.confirm(this.getValueForCancel())),
      new BigNisButton("Save", "confirm")
        .onClick(async () => {
          this.confirm({result: this.edit.get()})
        }),
    ]
  }

  protected getValueForCancel(): { result: Method.Meta } {
    return {result: null}
  }
}