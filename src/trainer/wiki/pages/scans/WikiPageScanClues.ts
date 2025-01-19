import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import italic = C.italic;

export class WikiPageScanClues extends WikiPage {
  render(): void {
    this.todo()

    this.seeAlso([
      {name: "Scan Clues", comment: "RS Wiki", action: "https://runescape.wiki/w/Treasure_Trails/Guide/Scans"}
    ])
  }
}