import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {ClueTrainerWiki} from "../../index";
import text_link = C.text_link;

export class WikiPageScanTreeControlOverlay extends WikiPage {
  render() {

    this.paragraph("While using a ", text_link("scan tree", () => ClueTrainerWiki.openOnPage("scantrees")), ", Clue Trainer cannot automatically know when you are at the designated spot for the current node and also cannot always know what pulse you get when you are there. You as a user need to pass this piece of information along to Clue Trainer manually. The scan tree control overlay is an ", text_link("interactive overlay", () => ClueTrainerWiki.openOnPage("interactiveoverlays")), " that can be used to do that while breaking you out of your flow of solving as little as possible. It consists of multiple components, described in the sections below.")

    this.header("Child Node Buttons")

    this.paragraph("These buttons are in the bottom part of the interactive overlay. For each relevant child node, a rectangular button in the respective color will be shown. When applicable, 'Different Level' or 'Too Far' is shown within the button. To select the a child node, put your mouse on the respective button and press Alt+1.")

    this.paragraph("In some situations, Clue Trainer can automatically detect which child node is the correct one to chose by reading the scan panel in the game. It can automatically detect when you receive a triple (red) pulse and whether the scroll suggests scanning a different level. Unfortunately, it cannot disambiguate single (blue) and double (orange) pulses this way. When Clue Trainer uniquely determined which child node would be selected with the current state, it adds the text 'Auto' to the respective button. While this is the case, pressing Alt+1 with your cursor anywhere on the screen will select that button.")

    this.header("Back Button")

    this.paragraph("The back button appears when the currently selected node is not the root/start of the scan tree, and goes back one step up the scan tree.")

    this.header("Progress Bar")

    this.paragraph("The progress bar shows your progress in narrowing down the possible dig spots. It uses a logarithmic scale.")

    this.todo()
  }
}