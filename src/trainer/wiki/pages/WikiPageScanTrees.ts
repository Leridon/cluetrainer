import {WikiPage} from "../WikiPage";

export class WikiPageScanTrees extends WikiPage {
  render() {
    this.paragraph("Scan Trees are a way of solving scan clues. They are basically a decision tree that iteratively narrows down the possible dig spots by moving to predefined spots and deciding where to go next based on the type of pulse you get at this position.")

    this.paragraph("In Clue Trainer, scan trees are the default way of solving scan clues. ")
  }
}