import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {ClueTrainerWiki} from "../../index";
import text_link = C.text_link;

export class WikiPageCompassClues extends WikiPage {
  render(): void {
    this.paragraph("This page is about the general mechanics of compass clues. To learn how to solve them using Clue Trainer, see the ", text_link("dedicated page", () => ClueTrainerWiki.openOnPage("compasssolver")), ".")

    this.header("Compass Mechanics")

    this.paragraph("Compass clues appear in elite and master clues. When opened, an arrow points towards a location where you need to dig for the next step or the casket.")

    this.header("Compass Triangulation")

    this.paragraph("The usual way to solve compass clues is by a process called triangulation. It works by teleporting to two separate locations and (mentally) drawing a line from there using the direction of the compass arrow. The dig spot is where the two lines intersect.")

    this.seeAlso([
      {name: "Compass Solver", action: () => ClueTrainerWiki.openOnPage("compasssolver")},
      {name: "Compass Clues", comment: "RS Wiki", action: "https://runescape.wiki/w/Treasure_Trails/Guide/Compass"}
    ])
  }

}