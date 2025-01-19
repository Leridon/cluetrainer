import {WikiPage} from "../WikiPage";
import {C} from "../../../lib/ui/constructors";
import italic = C.italic;

export class WikiPageScanClues extends WikiPage {
  render(): void {
    this.paragraph(italic("This page is yet to be written."))

    this.seeAlso([
      {name: "Scan Clues", comment: "RS Wiki", action: "https://runescape.wiki/w/Treasure_Trails/Guide/Scans"}
    ])
  }
}