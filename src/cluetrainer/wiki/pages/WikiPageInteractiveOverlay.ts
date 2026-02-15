import {WikiPage} from "../WikiPage";
import {List} from "../../../lib/ui/List";

export class WikiPageInteractiveOverlays extends WikiPage {
  render(): void {
    this.paragraph("Interactive overlays are a new way of interacting with Alt 1 apps. Put shortly, they work by displaying an overlay that is able to react to being hovered, right clicking, or pressing your Alt 1 main hotkey while hovering your mouse over them.")

    this.paragraph()

    this.header("Background")

    this.paragraph("Interactive overlays exist out of necessity because Alt 1 does not provide plugins with ways to receive user input while they are not focussed. As soon as you click the game, apps cannot react to most of your clicks or button pressed anymore. There are two exceptions to this:")

    this.row(new List()
      .item("Right clicking anywhere")
      .item("Pressing the main hotkey (Alt+1 by default).")
    )

    this.paragraph("In addition, apps know the position of your cursor at all times. In combination with overlays, this can be used to create interactive interfaces that can be mostly used like normal user interfaces by substituting normal left clicks with pressing Alt+1 while hovering a button for example.")
  }
}