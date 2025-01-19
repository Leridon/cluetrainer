import {SectionControl} from "../ui/widgets/SectionControl";
import {NisModal} from "../../lib/ui/NisModal";
import {WikiPageScanTreeControlOverlay} from "./pages/WikiPageScanTreeControlOverlay";
import {WikiPageHome} from "./pages/WikiPageHome";
import {WikiPageScanTrees} from "./pages/WikiPageScanTrees";
import {WikiPageScanClues} from "./pages/WikiPageScanClues";
import {WikiPageScanEquivalenceClasses} from "./pages/WikiPageScanEquivalenceClasses";

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
        {id: "scanequivalenceclasses", name: "Scan Tree Equivalence Classes", short_name: "Equivalence Classes", renderer: () => new WikiPageScanEquivalenceClasses()},
      ]
    }]);
  }
}

export namespace ClueTrainerWiki {
  export type page_id = "home" | "scantrees" | "scantreecontroloverlay" | "scans" | "scanequivalenceclasses"

  let instance: ClueTrainerWiki = null

  export function open(page?: page_id) {
    if (instance) instance.setActiveSection(page)
    else {
      const modal = new class extends NisModal {
        constructor() {
          super({size: "fullscreen"});

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