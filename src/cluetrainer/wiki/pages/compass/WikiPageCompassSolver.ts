import {WikiPage} from "../../WikiPage";
import {C} from "../../../../lib/ui/constructors";
import {SettingsModal} from "../../../ui/settings/SettingsEdit";
import {ClueTrainerWiki} from "../../index";
import italic = C.italic;
import text_link = C.text_link;

export class WikiPageCompassSolver extends WikiPage {
  render(): void {
    this.header("Solving Compasses with Clue Trainer")

    this.paragraph("Clue Trainer's compass solver is very flexible and can be used in various ways. It supports standard triangulation, as well as 1-teleport and occasionally 0-teleport strategies. It supports a very manual approach as well as a more automated solving flow where you do not need to interact directly with Clue Trainer at all.")

    this.paragraph("The compass solver has various options to customize its behavior. You can find them in the ", text_link("Compass section of the settings", () => SettingsModal.openOnPage("compass")), ".")

    this.header("Triangulation Points")

    this.paragraph("Solving compasses in Clue Trainer revolves around so called triangulation points. They are a combination of a position and an angle. Each triangulation point defines a beam across the game map that covers the area the target spot could be in. By default, the compass solver starts with an empty triangulation point that has neither a position nor an angle.")

    this.image("/media/wiki/compass/initialsolver.png", "Compass Solver with an empty triangulation points")

    this.paragraph("Triangulation points are created in two steps: First, a position for the triangulation point is selected. Later, an angle is recorded to draw the actual triangulation beam on the map. Triangulation points without an angle are called incomplete.")

    this.image("/media/wiki/compass/positiontooltip.png", "Position of an incomplete Moonclan teleport triangulation point.")

    this.paragraph("Complete triangulation points are drawn as beams on the Clue Trainer map. Beam's aren't just a line, but are shaped like a cone. This is because the associated angle always has a little bit of uncertainty included in it. For example, even though the angle might show as 13.1°, it is actually 13.1° ±0.121 degrees. You can learn more about uncertainty in the ", text_link("dedicated wiki page", () => ClueTrainerWiki.openOnPage("compasssolveruncertainty")), ".")

    this.image("/media/wiki/compass/triangulationbeam.png", "A triangulation beam drawn from Moonclan teleport.")

    this.paragraph("Compass spots that are not hit by all triangulation beams are ruled out and their respective map markers are grayed out. When the possible spots are narrowed down to just one, it will be set as the solution and the pathing will appear. At any point, you can also manually select a solution by clicking its marker.")

    this.image("/media/wiki/compass/finishedtriangulation.png", "Finished triangulation after two teleports.")

    this.header("Adding Triangulation Points with Positions")

    this.header("... by clicking the map", "left", 1)

    this.paragraph("One way to create triangulation points is by clicking them on the Clue Trainer map. You can click either teleport icons or arbitrary tiles to add a new triangulation point at the respective position. When clicking a tile, a square of a given size is used to account for imprecise clicking. The size of the square can be configured in the compass settings.")

    this.header("... by hovering a teleport option and pressing Alt+1", "left", 1)

    this.paragraph("If you used Alt1's builtin Clue Solver before, you may be familiar with this method. You can right click various teleports in the game and press Alt+1 (or whatever your main hotkey is bound to) while hovering the teleport option in the right-click menu to add that teleport as a new triangulation point.")

    this.paragraph(italic("Dev note: If you notice a teleport that does not work with this method, please reach out so it can be added."))

    this.header("... by using preconfigured triangulation strategies", "left", 1)

    this.paragraph("Most seasoned clue chasers use the same two teleports for compass triangulation every time. If you do not want to manually input the same locations for every single compass clue, you can use preconfigured triangulation strategies. When this is activated, the list of triangulation points will be populated with all preconfigured teleports whenever a new compass clue is opened.")

    this.paragraph("Triangulation strategies can be configured in the compass settings. There is a number of recommended teleport combinations already included, but you can also create your own.")

    this.header("... by using the previous clue's solution", "left", 1)

    this.paragraph("This option needs to be activated in the compass settings. It facilitates 1-teleport or even 0-teleport triangulation strategies. When you open a new compass clue with this option activated, the compass solver assumes that you still are at the location of previous clue's solution and immediately creates a triangulation point at that location. It will also automatically record the first angle of the compass arrow the solver reads after opening the clue. If you moved away from the previous clue's solution area before opening the next clue, this can produce unexpected results, so you need to be aware of this and potentially manually remove this triangulation point again.")

    this.paragraph("If the previous clue step was a scan clue, the assumed location may encompass the entire scan area, causing the triangulation beam to be very wide. You can narrow it down by following the ", text_link("Scan Tree", () => ClueTrainerWiki.openOnPage("scantrees")), ", or by manually clicking the final dig spot marker.")

    this.paragraph("Except for tetracompasses, the previous clue's solution is always assumed to be at least a 3 by 3 square of tiles, because this is the area where you can dig to solve the step.")

    this.header("... by using the sextant item", "left", 1)

    this.paragraph("Clue Trainer has an option to read your ingame chat to look for the position messages of the Sextant item. The Sextant can be clicked to display your current position as geocoordinates in the chat. Whenever Clue Trainer detects such a message (with a recent timestamp), it will create a triangulation point for that location and immediately record the current angle of the compass arrow. While this requires carrying a Sextant item around, it can be useful to tell Clue Trainer your precise location. You can use it to narrow down the previous clue's solution to a single tile or to narrow down the landing position after a non-static teleport.")

    this.paragraph("This option can be toggled in the compass settings. It is on by default.")

    this.header("A note on minimap tracking")

    this.paragraph("Alt1's builtin Clue Solver has a feature called minimap tracking. When active, it tries to automatically find your position on the map by reading the minimap. Obviously, this is a great feature for the compass solver when it works: When the plugin always knows precisely where you are, it can just draw triangulation beams automatically, without the need for you to do any manual input.")

    this.paragraph("Unfortunately, the current version of minimap tracking is notoriously error prone. It frequently misplaces players on the map, is very sensitive to minor rendering inconsistencies across different devices, and needs to be updated after every graphical update. For these reasons, Clue Trainer ", C.bold("does not use minimap tracking"), ". The combination of preconfigured triangulation presets and using the previous clue's solution is a much more reliable alternative to eliminate the need to interact with the compass solver manually while solving clues. Whenever players ask for help because Clue Solver draws seemingly random lines from weird location pointing nowhere, minimap tracking is the culprit.")

    this.header("Recording Angles for Incomplete Triangulation Points")

    this.paragraph("To record an angle for an incomplete triangulation point, you need to make sure that the correct triangulation point is selected. The currently selected triangulated point is highlighted in a light blue. You can select a different triangulation point by clicking on the respective line in the compass solver.")

    this.image("/media/wiki/compass/selectedentry.png", "The South Feldip Hills point is currently selected.")

    this.paragraph("Whenever an angle is recorded, the selection will advance to the next existing incomplete triangulation point, so it will automatically step through your list of preconfigured teleports. If there are no more incomplete triangulation points, a new empty triangulation point will be created at the end of the list.")

    this.header("... automatically after teleporting", "left", 1)

    this.paragraph("Whenever the angle of the compass arrow changes by more than 4° at once or stops spinning, Clue Trainer assumes that you have just teleported to the next triangulation point. The new angle will be recorded to the selected triangulation point.")

    this.paragraph("This behaviour can be toggled in the settings.")

    this.header("... manually by pressing Alt+1", "left", 1)

    this.paragraph("At any point, you can press Alt+1 (or whatever your main hotkey is bound to) to record the current angle of the compass arrow to the selected triangulation point.")

    this.header("... by clicking the checkmark", "left", 1)

    this.paragraph("On the right side of an incomplete triangulation point, you can click the checkmark to record the current angle of the compass arrow to the respective triangulation point.")

    this.header("Deleting and Resetting Triangulation Points")

    this.paragraph("When you made a mistake along the way, you can delete angles and positions from triangulation points. The crossmark on the right next to the recorded angle removes the angle, but keeps the position. The crossmark on the left next to the position removes the entire triangulation point.")

    this.paragraph("You can also reset the entire list of triangulation points by clicking the reset button in the top right corner. This will restore the state to what it was when you opened the clue.")
  }
}