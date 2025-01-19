import {WikiPage} from "../WikiPage";
import {C} from "../../../lib/ui/constructors";
import italic = C.italic;

export class WikiPageScanEquivalenceClasses extends WikiPage {
  render(): void {
    this.paragraph(italic("This page is yet to be written."))
  }
}