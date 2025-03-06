import AbstractEditWidget from "../widgets/AbstractEditWidget";
import {SolvingMethods} from "../../model/methods";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import {C} from "../../../lib/ui/constructors";
import * as lodash from "lodash";
import Widget from "../../../lib/ui/Widget";
import ClueAssumptions = SolvingMethods.ClueAssumptions;
import vbox = C.vbox;

export class AssumptionProperty extends AbstractEditWidget<ClueAssumptions> {
  relevant_assumptions: ClueAssumptions.Relevance = ClueAssumptions.Relevance.all

  constructor() {
    super();
  }

  protected render() {
    this.empty()

    const relevant = this.relevant_assumptions
    const value = this.get() ?? {}

    vbox(
      !relevant.includes("meerkats_active") ? undefined :
        new Checkbox("Using Meerkats Familiar").setValue(!!value.meerkats_active)
          .onCommit(v => this.updateAssumptions(a => a.meerkats_active = v))
      ,
      !relevant.includes("full_globetrotter") ? undefined :
        new Checkbox("Full Globetrotter").setValue(!!value.full_globetrotter)
          .onCommit(v => this.updateAssumptions(a => a.full_globetrotter = v))
      ,
      !relevant.includes("way_of_the_footshaped_key") ? undefined :
        new Checkbox("Way of the foot-shaped key").setValue(!!value.way_of_the_footshaped_key)
          .onCommit(v => this.updateAssumptions(a => a.way_of_the_footshaped_key = v))
      ,
      !relevant.includes("double_surge") ? undefined :
        new Checkbox("Double Surge").setValue(!!value.double_surge)
          .onCommit(v => this.updateAssumptions(a => a.double_surge = v))
      ,
      !relevant.includes("double_escape") ? undefined :
        new Checkbox("Double Escape").setValue(!!value.double_escape)
          .onCommit(v => this.updateAssumptions(a => a.double_escape = v))
      ,
      !relevant.includes("mobile_perk") ? undefined :
        new Checkbox("Mobile Perk").setValue(!!value.mobile_perk)
          .onCommit(v => this.updateAssumptions(a => a.mobile_perk = v))
      ,
    ).appendTo(this)
  }

  setRelevantAssumptions(relevant: ClueAssumptions.Relevance = ClueAssumptions.Relevance.all): this {
    this.relevant_assumptions = relevant

    this.setValue(ClueAssumptions.filterWithRelevance(this.get(), relevant))

    this.render()

    return this
  }

  private updateAssumptions(f: (_: ClueAssumptions) => void) {
    const cp = lodash.cloneDeep(this.get())

    f(cp)

    this.commit(cp)
  }
}

export namespace AssumptionProperty {
  export function icons(assumptions: ClueAssumptions): Widget[] {
    let icons: Widget[] = []

    const icon = (src: string): Widget => C.img(src).addClass("ctr-assumption-icon")

    if (assumptions.double_escape) icons.push(icon("/assets/icons/doubleescape.png")
      .tooltip("Assumes Double Escape")
    )
    if (assumptions.double_surge) icons.push(icon("/assets/icons/doublesurge.png")
      .tooltip("Assumes Double Surge")
    )
    if (assumptions.mobile_perk) icons.push(icon("/assets/icons/mobile.png")
      .tooltip("Assumes Mobile Perk")
    )
    if (assumptions.full_globetrotter) icons.push(icon("/assets/icons/Globetrotter_jacket.png")
      .tooltip("Assumes Full Globetrotter")
    )
    if (assumptions.meerkats_active) icons.push(icon("/assets/icons/Meerkats_pouch.png")
      .tooltip("Assumes using Meerkats")
    )
    if (assumptions.way_of_the_footshaped_key) icons.push(icon("/assets/icons/Key_(Treasure_Trails).png")
      .tooltip("Assumes 'Way of the footshaped key' is unlocked")
    )

    icons.forEach(i => i.css("margin-left", "3px"))

    return icons
  }
}