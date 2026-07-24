import {WikiPage} from "../WikiPage";

export class WikiPageHome extends WikiPage {

  render() {
    this.paragraph("Welcome to Cluepedia, the mini-wiki included with Clue Trainer. It contains guides for Clue Trainer as well as explanations for clue mechanics.")

    this.paragraph("Use the table of contents on the left to navigate.")

    this.seeAlso([
      {name: "Clue Chasers Discord", action: "https://discord.gg/cluechasers"},
      {name: "RuneScape Wiki", action: "https://runescape.wiki/"}
    ])
  }
}