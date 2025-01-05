import Widget from "../../../lib/ui/Widget";
import {AugmentedMethod} from "../../model/MethodPackManager";
import TheoryCrafter from "./TheoryCrafter";
import Properties from "../widgets/Properties";
import {FavouriteIcon} from "../nisl";
import {C} from "../../../lib/ui/constructors";
import ContextMenu from "../widgets/ContextMenu";
import {ClueProperties} from "./ClueProperties";
import {Clues} from "../../../lib/runescape/clues";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import {ClueOverviewMarker} from "./OverviewMarker";
import hbox = C.hbox;
import spacer = C.spacer;
import space = C.space;
import ClueSpot = Clues.ClueSpot;

export class MethodWidget extends Widget {

  constructor(
    private parent: TheoryCrafter,
    private method: AugmentedMethod) {
    super();

    this.addClass("ctr-method-widget")

    this.render()

    this.on("click", (event) => {
      this.openContextMenu(event)
    })
  }

  private async render() {
    const layout = new Properties().appendTo(this)

    const isFavourite = true

    layout.header(hbox(new FavouriteIcon().set(isFavourite)
        .on("click", () => {

        }),
      space(),
      this.method.method.name,
      spacer(),
      c().setInnerHtml("&#x22EE;")
        .addClass("ctr-path-edit-overview-step-options")
        .addClass("ctr-clickable")
        .on("click", async (event) => {
          this.openContextMenu(event)
        })
    ), "left", 1)

    if (this.method.method.description) {
      layout.paragraph(this.method.method.description)
    }

    layout.named("Clue", c().text(ClueSpot.shortString(this.method.clue)).addClass("ctr-filtered-clue-result-summary")
      .addTippy((await new ClueProperties(
        this.method.clue,
        null,
        true
      ).rendered()).row(c().text("Click to see on map.").css("font-style", "italic")))
      .on("click", (e) => {
        e.stopPropagation()
        e.preventDefault()

        this.parent.layer.getMap().fitView(TileRectangle.from(ClueOverviewMarker.position(this.method.clue)), {
          maxZoom: 4
        })
      })
    )

    layout.named("Time", this.method.method.expected_time.toFixed(1))
  }

  private async openContextMenu(event: JQuery.MouseEventBase) {
    event.preventDefault();

    new ContextMenu(await ClueProperties.methodSubMenu(this.method, (m) => {
      this.parent.editMethod(m)
    })).showFromEvent(event)
  }
}