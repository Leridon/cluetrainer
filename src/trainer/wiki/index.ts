import {SectionControl} from "../ui/widgets/SectionControl";
import {NisModal} from "../../lib/ui/NisModal";
import {WikiPageScanTreeControlOverlay} from "./pages/scans/WikiPageScanTreeControlOverlay";
import {WikiPageHome} from "./pages/WikiPageHome";
import {WikiPageScanTrees} from "./pages/scans/WikiPageScanTrees";
import {WikiPageScanClues} from "./pages/scans/WikiPageScanClues";
import {WikiPageScanEquivalenceClasses} from "./pages/scans/WikiPageScanEquivalenceClasses";
import {WikiPageMethodEditing} from "./pages/WikiPageMethodEditing";
import {WikiPageScanTreeEditing} from "./pages/WikiPageScanTreeEditing";
import {WikiPageInteractiveOverlays} from "./pages/WikiPageInteractiveOverlay";
import {WikiPageTooFarDifferentLevel} from "./pages/scans/WikiPageTooFarDifferentLevel";

export class ClueTrainerWiki extends SectionControl<ClueTrainerWiki.page_id> {
  constructor() {
    super([{
      name: "Wiki",
      entries: [
        {id: "home", name: "Cluepedia", renderer: () => new WikiPageHome()}
      ]
    }, {
      name: "Scans",
      entries: [
        {id: "scans", name: "Scan Clues", renderer: () => new WikiPageScanClues()},
        {id: "scantrees", name: "Scan Trees", renderer: () => new WikiPageScanTrees()},
        {id: "scantreecontroloverlay", name: "Scan Tree Control Overlay", short_name: "Tree Control", renderer: () => new WikiPageScanTreeControlOverlay()},
        {id: "toofardifferentlevel", name: "Try scanning a different level.", short_name: "Different Level", renderer: () => new WikiPageTooFarDifferentLevel()}
      ]
    }, {
      name: "Miscellaneous",
      entries: [
        {id: "interactiveoverlays", name: "Interactive Overlays", renderer: () => new WikiPageInteractiveOverlays()}
      ]
    },
      {
        name: "Method Creation",
        entries: [
          {id: "methodediting", name: "Method Editing", short_name: "General", renderer: () => new WikiPageMethodEditing()},
          {id: "scantreeediting", name: "Creating Scan Trees", short_name: "Scan Trees", renderer: () => new WikiPageScanTreeEditing()},
          {id: "scanequivalenceclasses", name: "Scan Tree Equivalence Classes", short_name: "Equivalence Classes", renderer: () => new WikiPageScanEquivalenceClasses()},
        ]
      }]);
  }
}

export namespace ClueTrainerWiki {
  export type page_id = "home" | "scantrees" | "scantreecontroloverlay" | "scans" | "scanequivalenceclasses"
    | "methodediting" | "scantreeediting" | "toofardifferentlevel" | "interactiveoverlays"

  let instance: ClueTrainerWiki = null

  export function openOnPage(page?: page_id) {
    if (instance) instance.setActiveSection(page)
    else {
      const modal = new class extends NisModal {
        constructor() {
          super({size: "large"});

          this.setTitle("Cluepedia")
        }

        render() {
          super.render();

          this.body.css("padding", "0")
            .css("display", "flex")

          instance = new ClueTrainerWiki()
            .css("width", "100%")
            .setActiveSection(page ?? "home")
            .appendTo(this.body)
        }
      }

      modal.hiding.on(() => instance = null)

      modal.show()
    }
  }
}