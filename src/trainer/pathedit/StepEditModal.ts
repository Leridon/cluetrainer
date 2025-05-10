import AbstractEditWidget from "../ui/widgets/AbstractEditWidget";
import {Path} from "../../lib/runescape/pathing";
import {FormModal} from "../../lib/ui/controls/FormModal";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import {util} from "../../lib/util/util";
import Properties from "../ui/widgets/Properties";
import TemplateStringEdit from "../ui/widgets/TemplateStringEdit";
import {deps} from "../dependencies";
import DirectionSelect from "./DirectionSelect";
import MapCoordinateEdit from "../ui/widgets/MapCoordinateEdit";
import InteractionSelect from "./InteractionSelect";
import {EntityNameEdit} from "../ui/widgets/EntityNameEdit";
import TextField from "../../lib/ui/controls/TextField";
import NumberInput from "../../lib/ui/controls/NumberInput";
import {SearchSelection} from "../ui/widgets/SearchSelection";
import {CTRIcon} from "../CTRIcon";
import {C} from "../../lib/ui/constructors";
import {Checkbox} from "../../lib/ui/controls/Checkbox";
import {ColorPicker} from "../../lib/ui/controls/ColorPicker";
import copyUpdate = util.copyUpdate;
import hboxl = C.hboxl;
import inlineimg = C.inlineimg;

class StepDetailEdit extends AbstractEditWidget<Path.Step> {

  constructor() {
    super();
  }

  protected render() {
    const value = this.get()

    if (!value) return

    const props = new Properties()

    this.append(props)

    props.header("Description")

    props.row(new TemplateStringEdit({fullsize: true, resolver: deps().app.template_resolver})
      .setValue(value.description)
      .onCommit(v => this.commit(copyUpdate(this.get(), e => e.description = v)))
    )

    switch (value.type) {
      case "orientation":
        props.named("Facing", new DirectionSelect()
          .setValue(value.direction)
          .onSelection(dir => {
            this.commit(copyUpdate(this.get() as Path.step_orientation, e => e.direction = dir))
          })
        )

        break;
      case "ability":

        props.named("From", new MapCoordinateEdit(value.from)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_ability, e => e.from = v))
          )
        )
        props.named("To", new MapCoordinateEdit(value.to)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_ability, e => e.to = v))
          )
        )

        if (value.ability == "barge") {
          props.named("Target", new EntityNameEdit(["npc"]).setValue(value.target ?? {name: "", kind: "npc"})
            .onCommit(v => {
              this.commit(copyUpdate(this.get() as Path.step_ability, e => e.target = v.name ? v : undefined))
            })
          )
        }

        if (value.ability == "dive") {
          props.named("Target Text", new TextField()
            .setPlaceholder("Text like 'on top of the flower' or 'next to the rock'.")
            .setValue(value.target_text)
            .onCommit(v => {
              this.commit(copyUpdate(this.get() as Path.step_ability, e => e.target_text = v))
            })
          )

          props.named("Is Far Dive?", new Checkbox()
            .setValue(value.is_far_dive)
            .onCommit(v => {
              this.commit(copyUpdate(this.get() as Path.step_ability, e => e.is_far_dive = v))
            })
          )
        }

        break;
      case "redclick":
        props.named("Type", new InteractionSelect()
          .setValue(value.how)
          .onSelection(v =>
            this.commit(copyUpdate(this.get() as Path.step_redclick, e => e.how = v))
          )
        )

        props.named("Where", new MapCoordinateEdit(value.where)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_redclick, e => e.where = v))
          )
        )

        props.named("Target", new EntityNameEdit(["npc", "static"]).setValue(value.target ?? {name: "", kind: "static"})
          .onCommit(v => {
            this.commit(copyUpdate(this.get() as Path.step_ability, e => e.target = v.name ? v : undefined))
          })
        )

        break;
      case "run":
        props.named("Target Text", new TextField()
          .setPlaceholder("Text like 'on top of the flower' or 'next to the rock'.")
          .setValue(value.to_text)
          .onCommit(v => {
            this.commit(copyUpdate(this.get() as Path.step_run, e => e.to_text = v))
          })
        )

        break;
      case "teleport":

        props.named("Spot", new MapCoordinateEdit(value.spot)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_teleport, e => e.spot = v))
          )
        )

        break;
      case "powerburst":

        props.named("Where", new MapCoordinateEdit(value.where)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_powerburst, e => e.where = v))
          )
        )

        break;
      case "transport":
        break;
      case "cheat":

        props.named("Target", new MapCoordinateEdit(value.target)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_cheat, e => e.target = v))
          )
        )

        props.named("Facing", new DirectionSelect()
          .setValue(value.orientation)
          .onSelection(dir => {
            this.commit(copyUpdate(this.get() as Path.step_cheat, e => e.orientation = dir))
          })
        )

        props.named("Ticks", new NumberInput(0, 100)
          .setValue(value.ticks)
          .onCommit(v => {
            this.commit(copyUpdate(this.get() as Path.step_cheat, e => e.ticks = v))

          })
        )

        break;

      case "cosmetic":
        props.named("Icon", new SearchSelection<CTRIcon>({
            type_class: {
              toHTML: (v: CTRIcon): C.Appendable => hboxl(inlineimg(CTRIcon.url(v)), C.space(), v.name)
            },
            search_term: CTRIcon.search_term
          }, CTRIcon.all)
            .setValue(CTRIcon.get(value.icon))
            .onSelection(v => {
              this.commit(copyUpdate(this.get() as Path.step_cosmetic, e => e.icon = v.id))
            })
        )

        props.row(new Checkbox("Hide when not hovered?")
          .setValue(!!value.hide_when_not_hovered)
          .onCommit(v =>
            this.commit(copyUpdate(this.get() as Path.step_cosmetic, e => e.hide_when_not_hovered = v))
          )
        )

        props.named("Area Color", new ColorPicker()
          .setValue(value.area_color ?? Path.COSMETIC_DEFAULT_COLORS.area)
          .onCommit(v => {
            this.commit(copyUpdate(this.get() as Path.step_cosmetic, e => e.area_color = v))
          })
        )

        props.named("Arrow Color", new ColorPicker()
          .setValue(value.arrow_color ?? Path.COSMETIC_DEFAULT_COLORS.arrow)
          .onCommit(v => {
            this.commit(copyUpdate(this.get() as Path.step_cosmetic, e => e.arrow_color = v))
          })
        )

        break
    }
  }
}

export class StepEditModal extends FormModal<{
  new_version: Path.Step | null
}> {
  private edit: StepDetailEdit

  constructor(private value: Path.Step) {
    super({
      size: "small"
    });

    this.title.set("Edit Step Details")
  }

  render() {
    super.render()

    this.edit = new StepDetailEdit()
      .setValue(copyUpdate(this.value, () => {}))
      .appendTo(this.body)
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.cancel())
      ,
      new BigNisButton("Save", "confirm")
        .onClick(() => this.confirm({new_version: this.edit.get()})),
    ]
  }

  protected getValueForCancel(): { new_version: Path.Step | null } {
    return {new_version: null}
  }
}