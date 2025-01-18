import {SectionControl} from "../ui/widgets/SectionControl";
import {NisModal} from "../../lib/ui/NisModal";
import {WikiPageScanTreeControlOverlay} from "./pages/WikiPageScanTreeControlOverlay";
import {WikiPageHome} from "./pages/WikiPageHome";
import {WikiPageScanTrees} from "./pages/WikiPageScanTrees";

export class ClueTrainerWiki extends SectionControl<ClueTrainerWiki.page_id> {
  constructor() {
    super([{
      name: "Wiki",
      entries: [
        {id: "home", name: "About", renderer: () => new WikiPageHome()}
      ]
    }, {
      name: "Solving",
      entries: [
        {id: "scantrees", name: "Scan Trees", renderer: () => new WikiPageScanTrees()},
        {id: "scantreecontroloverlay", name: "Scan Tree Control Overlay", short_name: "Tree Control", renderer: () => new WikiPageScanTreeControlOverlay()},
      ]
    }]);
  }
}

export namespace ClueTrainerWiki {
  export type page_id = "home" | "scantrees" | "scantreecontroloverlay"

  let instance: ClueTrainerWiki = null

  export function open(page?: page_id) {
    if (instance) instance.setActiveSection(page)
    else {
      const modal = new class extends NisModal {
        constructor() {
          super();

          this.setTitle("Cluepedia")
        }

        render() {
          super.render();

          instance = new ClueTrainerWiki()
            .setActiveSection(page ?? "home")
            .appendTo(this.body)
        }
      }

      modal.hiding.on(() => instance = null)

      modal.show()
    }
  }
}