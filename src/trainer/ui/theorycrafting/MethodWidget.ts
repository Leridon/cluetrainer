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
import {deps} from "../../dependencies";
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

    this.on("contextmenu", (event) => {
      this.openContextMenu(event)
    })
  }

  private favourite_icon: FavouriteIcon

  private async render() {
    const layout = new Properties().appendTo(this)

    const isFavourite = (await deps().app.favourites.getMethod(this.method.method.for, false))?.method?.id == this.method.method.id

    layout.header(hbox(this.favourite_icon = new FavouriteIcon().set(isFavourite)
        .addClass("ctr-clickable")
        .on("click", async () => {
          const isFavourite = (await deps().app.favourites.getMethod(this.method.method.for, false))?.method?.id == this.method.method.id
          if (isFavourite) this.parent.app.favourites.setMethod(this.method.method.for, undefined)
          else this.parent.app.favourites.setMethod(this.method.method.for, this.method)
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

    layout.named("Time", (Math.round(this.method.method.expected_time * 10) / 10).toString() + " ticks")
  }

  public notifyFavouriteChange(change: { clue: Clues.ClueSpot.Id; new: AugmentedMethod }) {
    if (Clues.ClueSpot.Id.equals(change.clue, this.method.method.for)) {
      this.favourite_icon.set(change.new?.method?.id == this.method.method.id)
    }
  }

  private async openContextMenu(event: JQuery.MouseEventBase) {
    event.preventDefault();

    new ContextMenu(await ClueProperties.methodSubMenu(this.method, (m) => {
      this.parent.editMethod(m)
    })).showFromEvent(event)
  }
}