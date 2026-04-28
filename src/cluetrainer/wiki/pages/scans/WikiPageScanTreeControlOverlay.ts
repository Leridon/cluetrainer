import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {ClueTrainerWiki} from "../../index";
import text_link = C.text_link;
import img = C.img;
import hboxc = C.hboxc;

export class WikiPageScanTreeControlOverlay extends WikiPage {
  render() {

    this.paragraph("While using a ", text_link("scan tree", () => ClueTrainerWiki.openOnPage("scantrees")), ", Clue Trainer cannot automatically know when you are at the designated spot for the current node and also cannot always know what pulse you get when you are there. You as a user need to pass this piece of information along to Clue Trainer manually. The scan tree control overlay is an ", text_link("interactive overlay", () => ClueTrainerWiki.openOnPage("interactiveoverlays")), " that can be used to do that while breaking you out of your flow of solving as little as possible. It consists of multiple components, described in the sections below.")

    this.row(hboxc(
      img("/media/wiki/scan_control.png").css2({"max-width": "200px", margin: "0 auto"}),
    ))

    this.header("Child Node Buttons")

    this.paragraph("These colored buttons are in the bottom part of the interactive overlay. For each relevant child node, a rectangular button in the respective color will be shown. When applicable, 'Different Level' or 'Too Far' is shown within the button. To select the a child node, put your mouse on the respective button and press Alt+1.")

    this.paragraph("Clue Trainer can sometimes automatically determine the correct child node by reading the in-game scan panel. It detects triple (red) pulses and whether the scroll suggests scanning a different level. It cannot distinguish single (blue) and double (orange) pulses this way. When the correct child node is uniquely determines, the corresponding button is labeled 'Auto'. While this is the case, pressing Alt+1 when not hovering any other button will select that button.")

    this.header("Back Button")

    this.paragraph("The back button appears when the currently selected node is not the root/start of the scan tree, and goes back one step up the scan tree.")

    this.row(hboxc(
      img("/media/wiki/progress_bar.png").css2({"max-width": "200px", margin: "0 auto"}),
    ))

    this.header("Progress Bar")

    this.paragraph("The progress bar shows your progress in narrowing down the possible dig spots. It uses a logarithmic scale.")
  }
}