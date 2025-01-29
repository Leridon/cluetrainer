import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {ClueTrainerWiki} from "../../index";
import Widget from "../../../../lib/ui/Widget";
import text_link = C.text_link;
import hboxc = C.hboxc;

export class WikiPageScanClues extends WikiPage {
  render(): void {

    this.paragraph("Scan clues mainly appear in elite clues. To solve them, you need to dig at one of multiple possible spots within a given area. To find the correct spot, you need to search the area until you are close enough to the spot ")

    this.header("Pulses")

    this.paragraph("While a scan is active, your character has pulsating rings around it. They change color and speed depending on how far away you are from the correct dig spot. Note that this only updates every two ticks.")

    this.header("Triple Pulse", "left", 1)
    this.paragraph("If the target spot is withing your scan range, there will be three red rings pulsating very fast. Additionally, an arrow will point to the target tile in the game world as well as on the minimap, and the text on the san panel changes.")

    this.header("Double Pulse", "left", 1)
    this.paragraph("If the dig spot is more than your scan range but less than two times the scan range away from you, there will be two orange rings pulsating in a moderate speed.")

    this.header("Single Pulse", "left", 1)
    this.paragraph("If the correct spot is even farther away, there will be a single blue ring pulsating slowly.")

    const videos: Widget[] = [
      c("<video controls loop><source src='/media/wiki/single.webm' type='video/webm'></video>").css2({
        width: "120px",
        height: "200px",
        margin: "0 auto",
      }),
      c("<video controls loop><source src='/media/wiki/double.webm' type='video/webm'></video>").css2({
        width: "120px",
        height: "200px",
        margin: "0 auto",
      }),
      c("<video controls loop><source src='/media/wiki/triple.webm' type='video/webm'></video>").css2({
        width: "120px",
        height: "200px",
        margin: "0 auto",
      }),
    ]

    videos.forEach(v => {
      v.on("play", (e) => {
        videos.forEach(v => {
          if (e.target != v.raw()) (v.raw() as HTMLVideoElement).pause()
        })
      })
    })

    this.row(hboxc(
      ...videos
    ))

    this.header("Too Far/Different level")
    this.paragraph("In addition to the changing pulse, there is a second mechanic that is less well known and easily missed. In some situations, the text in the scan panel suggests you to try scanning a different level. This can be used to rule out some of the spots before even entering the scan area. More information can be found in the ", text_link("dedicated page", () => ClueTrainerWiki.openOnPage("toofardifferentlevel")), ".")

    this.seeAlso([
      {name: "Scan Clues", comment: "RS Wiki", action: "https://runescape.wiki/w/Treasure_Trails/Guide/Scans"}
    ])
  }
}