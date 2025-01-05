import Widget from "../../../lib/ui/Widget";
import {AugmentedMethod} from "../../model/MethodPackManager";
import TheoryCrafter from "./TheoryCrafter";
import Properties from "../widgets/Properties";
import {FavouriteIcon} from "../nisl";
import {C} from "../../../lib/ui/constructors";
import ContextMenu from "../widgets/ContextMenu";
import {ClueProperties} from "./ClueProperties";
import hbox = C.hbox;

export class MethodWidget extends Widget {

  constructor(
    private parent: TheoryCrafter,
    private method: AugmentedMethod) {
    super();

    this.addClass("ctr-method-widget")

    this.render()
  }

  private render() {
    const layout = new Properties().appendTo(this)

    const isFavourite = true

    layout.header(hbox(new FavouriteIcon().set(isFavourite)
        .on("click", () => {

        }),
      this.method.method.name,
      c().setInnerHtml("&#x22EE;")
        .addClass("ctr-path-edit-overview-step-options")
        .addClass("ctr-clickable")
        .on("click", async (event) => {
          this.openContextMenu(event)
        })
    ))

    if (this.method.method.description) {

      layout.paragraph(this.method.method.description)
    }

    layout.named("Clue", this.method.method.for.clue.toString())
    layout.named("Time", this.method.method.expected_time.toFixed(1))
  }

  private async openContextMenu(event: JQuery.MouseEventBase) {
    event.preventDefault();

    new ContextMenu(await ClueProperties.methodSubMenu(this.method, () => {})).showFromEvent(event)
  }
}