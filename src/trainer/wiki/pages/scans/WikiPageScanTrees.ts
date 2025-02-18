import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {ClueTrainerWiki} from "../../index";
import {List} from "../../../../lib/ui/List";
import link = C.link;
import text_link = C.text_link;
import bold = C.bold;

export class WikiPageScanTrees extends WikiPage {
  render() {
    this.paragraph("Scan Trees are a way of solving scan clues and the main way of doing so in Clue Trainer. They consist of a series of decision spots used to narrow down the number of possible dig spots efficiently. At every decision spot, you decide your next move based on the game's feedback. The term \"scan tree\" comes from their relationship to ", link("https://en.wikipedia.org/wiki/Decision_tree").text("decision trees"), ".")

    this.header("Scan Trees in Clue Trainer")

    this.paragraph("Clue Trainer marks decision spots in green on the map. They may cover multiple tiles due to non-static teleports or larger ", text_link("equivalence classes", () => ClueTrainerWiki.openOnPage("scanequivalenceclasses")), ".")

    this.paragraph("At every decision spot, you observe the in-game pulse or, in some cases, check if the scan scroll suggests scanning a different level. Clue Trainer ", bold("cannot"), " automatically detect when you've reached a decision spot and what pulse the game gives you, so you need to indicate it manually by:")

    this.row(new List()
      .item("Clicking the respective line in the scan tree UI.")
      .item("Using the ", text_link("interactive scan tree control overlay", () => ClueTrainerWiki.openOnPage("scantreecontroloverlay")), ".")
    )

    this.paragraph("Like all methods in Clue Trainer, scan trees also contain pathing instructions on how to get to the next spot. Following them precisely is not required, but in many cases they set up quick surge-dive combinations to accurately reach the next decision spot quickly.")

    this.seeAlso([
      {action: () => ClueTrainerWiki.openOnPage("scantreeediting"), name: "Creating custom scan trees"}
    ])
  }
}