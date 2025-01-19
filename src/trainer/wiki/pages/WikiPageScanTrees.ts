import {WikiPage} from "../WikiPage";
import {C} from "../../../lib/ui/constructors";
import {ClueTrainerWiki} from "../index";
import {List} from "../../../lib/ui/List";
import link = C.link;
import text_link = C.text_link;
import bold = C.bold;

export class WikiPageScanTrees extends WikiPage {
  render() {
    this.paragraph("Scan Trees are a way of solving scan clues and the main way of doing so in Clue Trainer. In a nutshell, scan trees are a series of decision spots you move to to narrow down the number of possible dig spots as quickly as possible. At every decision spot, you decide where to go next. The name scan tree stems from the fact that they are so called ", link("https://en.wikipedia.org/wiki/Decision_tree").text("decision trees"), ". They can also be thought of as a flowchart.")

    this.header("Scan Trees in Clue Trainer")

    this.paragraph("The most important part of scan trees are the decision spots. Clue Trainer marks these decision spots in green on the map. In many cases, decision spots are larger than just one tile. This can either be because of a non-static teleport being used to get there, or the respective ", text_link("equivalence class", () => ClueTrainerWiki.open("scanequivalenceclasses")), " being larger.")

    this.paragraph("At every decision spot, you observe what pulse you get ingame, plus in some cases whether the scan scroll suggests you to scan a different level. Clue Trainer ", bold("cannot"), " automatically tell that you're at the required decision spot, so you need to tell it that instead. To do so, you have two options:")

    this.row(new List()
      .item("Click the respective line in the scan tree UI.")
      .item("Use the ", text_link("interactive scan tree control overlay", () => ClueTrainerWiki.open("scantreecontroloverlay")), ".")
    )

    this.header("Pathing")

    this.paragraph("Like all methods in Clue Trainer, scan trees also contain specific pathing instructions on how to get to the next spot. Those are displayed on the map and in short form in the scan tree UI. You do not need to follow them precisely for the scan tree to work, but in many cases they set up a quick surge-dive combination to accurately reach the next decision spot very quickly.")
  }
}