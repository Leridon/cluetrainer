import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {List} from "../../../../lib/ui/List";
import bold = C.bold;

export class WikiPageCompassAngleUncertainty extends WikiPage {
  render(): void {

    this.header("TL/DR: Quick Recommendations")
    this.row(new List()
      .item("Consider using static teleports for triangulation.")
      .item("Turn off antialiasing.")
    )

    this.header("Understanding Compass Accuracy")

    this.paragraph("There are multiple things you can do to improve the accuracy of the compass solver. This can speed up your clue solving by improving the likelyhood of successful triangulation after one or even zero teleports.")

    this.header("Location Uncertainty")

    this.paragraph("Location uncertainty refers to the lack of precision in Clue Trainer's knowledge about your current positon in the game world. The most frequent source of this kind of uncertainty is the fact that most teleports in the game are non-static, i.e. have multiple possible landing tiles. For triangulation points, you can view the respective location uncertainty by hovering over the position.")

    this.image("/media/wiki/compass/positiontooltip.png", "Location Uncertainty of an incomplete Moonclan teleport triangulation point.")

    this.paragraph("Location uncertainty affects the starting with of triangulation beams. Unfortunately, this is by far the most impactful kind of inaccuracy for the compass solver. When the location uncertainty is a 5 by 5 square like for most spellbook teleports, the triangulation beams starts with a width of 4 tiles. Naturally, the likelihood that such a beam hits additional dig spots is high.")

    this.paragraph("You can reduce location uncertainty by using static teleports for triangulation. The amulet of nature bound to the Falador park tree patch is a very good option, since it is located near the center of the map. Combined with high angle accuracy (see below), a single teleport can uniquely determine the correct dig spot in 85% of cases. The builtin triangulation preset uses the tile that is also used in the Falador scan method.")

    this.header("Angle Uncertainty")

    this.paragraph("Unsurprisingly, angle uncertainty refers to the uncertainty about the angle detected by Clue Trainer when reading the compass arrow. It affects the angle of the triangulation beam. The two sources of angle uncertainty are calibration uncertainty and resolution uncertainty.")

    this.image("/media/wiki/compass/angletooltip.png", "Angle Uncertainty of ±0.08°.")

    this.header("Resolution Uncertainty", "left", 1)

    this.paragraph("Resolution inaccuracy refers to the inherent inaccuracy of the compass arrow. The game's renderer can only display around 2,000 distinct angles, so there is a natural uncertainty of ±0.09° on average. This is not distributed uniformly, so there resolution uncertainty changes depending on the angle. Resolution uncertainty is the lower limit for angle uncertainty.")

    this.header("Calibration Uncertainty", "left", 1)

    this.paragraph("Clue Trainer reads compass angles in a two step process. First, it calculates the average angle between all black pixels that belong to the compass arrow and the center of the arrow. This is the initial angle reading. It then translates this initial angle to the actual angle by applying a calibration function. The calibration function is determined by ", bold("a lot"), " of manually collected sample points that put initial angles and actual angles in relation. However, no matter how many samples we collect, there will always be a little bit of uncertainty left in the final result in addition to the resolution uncertainty.")

    this.paragraph("The rendering of the compass arrow changes depending on whether antialising is activated in the game's graphics settings (specifically MSAA). Antialiasing changes the rendering in inconsistent ways, causing the compass reader to produce slightly different results on different devices. This is why the compass reader is mostly calibrated with ", bold("antialiasing off"), ". When antialising is on, the compass reader needs to add a flat uncertainty of ±0.5° to be safe. To get the best results, especially when you use a static teleport for triangulation, ", bold("you should turn antialiasing off"), ".")
  }
}