import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import italic = C.italic;
import img = C.img;
import hboxc = C.hboxc;
import bold = C.bold;
import mediaContainer = C.mediaContainer;

export class WikiPageTooFarDifferentLevel extends WikiPage {
  render(): void {
    this.paragraph(
      "In some cases, scan clues suggest to ", italic("try scanning a different level"), ". Counterintuitively, this does not just indicate that the player is on the wrong floor, but can also appear when the dig spot is in an underground area while the player is on the surface or vice versa. This article explains how this mechanic works exactly and how it can be used to optimize scans such as Taverley Dungeon or Dorgesh-Kaan."
    )

    this.row(mediaContainer(
      img("/media/wiki/differentlevel.png").css2({"max-width": "120px"}),
      img("/media/wiki/toofar.png").css2({"max-width": "120px"}),
    ))

    this.header("The Basic Case: Floor Differences")

    this.paragraph("The RuneScape map consists of four different floors. Most of the Gielinor's surface is on ", bold("floor 0"), ", while higher floors of buildings are on ", bold("floor 1"), " and above. This also applies to dungeons, which are mostly on ", bold("floor 0"), " too. Brimhaven Dungeon has two floors, with the western part being on ", bold("floor 1"), ". Some locations are on floors other than 0 without it being obvious, such as the Tears of Guthix area on ", bold("floor 2"), ", and Prifddinas on ", bold("floor 1"), ".")

    this.paragraph("Dig spots for scan clues are also located on specific floors. If you are on a different floor than the target, the ", italic("'Try scanning a different level.'"), " message appears.")

    this.paragraph("For scans that consist of multiple floors, this can be used to narrow down the candidates before teleporting to the area. For example, when you are on floor 0 and get a Dorgesh-Kaan scan with the ", italic("'Try scanning a different level.'"), " message, you already know that the dig spot will be one of those on the upper level of the city. Likewise, if the scroll does not suggest that, the dig spot will be on the lower level.")

    this.header("The Weird Case: Underground Areas")

    this.paragraph("There is a second case in which this message is shown, usually encountered with the Taverley Dungeon or the Fremmenik Slayer Dungeon scans. To understand what triggers it in these cases, we need to understand how the game handles underground areas.")

    this.paragraph("Dungeons and other underground areas are not actually below the surface. Instead, they exist on ", bold("floor 0"), " far away from the surface. Originally, underground areas where placed 6400 tiles (100 chunks) north of their logical surface location. As that area became crowded, newer underground areas use different placements.")

    this.paragraph("To account for the placement logic of older dungeons, the ", italic("'Try scanning a different level.'"), " message appears when the player is logically above or below the target spot. More precisely, it is shown when the target spot is within your ", bold("scan range + 15 tiles"), " of where your current position would be when moving it 6400 tiles north/south. This includes the +5 bonus from the meerkats familiar.")

    this.paragraph("This behaviour can help eliminate candidate spots that would otherwise take longer to reach. For example, Falador is logically above the eastern part of Taverley dungeon, so teleporting there first can determine whether to immediately go to that area.")

    this.paragraph("Clue Trainer shows ", bold("complement spots"), " (underground/surface projections of dig spots) on the map, as well as the complement range square when applicable.")

    this.row(mediaContainer(
      img("/media/wiki/complement_range.png")
    ))
  }
}