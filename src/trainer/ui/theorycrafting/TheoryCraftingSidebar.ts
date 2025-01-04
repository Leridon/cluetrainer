import MapSideBar from "../MapSideBar";
import TheoryCrafter from "./TheoryCrafter";
import PackWidget from "./PackWidget";
import {MethodPackManager, Pack} from "../../model/MethodPackManager";
import {C} from "../../../lib/ui/constructors";
import LightButton from "../widgets/LightButton";
import ImportStringModal from "../widgets/modals/ImportStringModal";
import {ExportImport} from "../../../lib/util/exportString";
import {NewMethodPackModal} from "./MethodPackModal";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import btnrow = C.btnrow;
import imp = ExportImport.imp;

export default class TheoryCraftingSidebar extends MapSideBar {

  private methods: MethodPackManager

  constructor(public theorycrafter: TheoryCrafter) {
    super("Method Packs");

    this.css("width", "300px")

    this.methods = MethodPackManager.instance()

    this.methods.saved.on(async (p) => this.render(await this.methods.all())).bindTo(theorycrafter.lifetime_manager)
    this.methods.all().then(p => this.render(p))
  }

  render(packs: Pack[]) {
    this.body.empty()

    btnrow(
      new LightButton("Import", "rectangle")
        .onClick(async () => {
          const imported = await new ImportStringModal<Pack>(imp({expected_type: "method-pack", expected_version: 1})).do()

          if (imported?.imported) {

            const existing = this.methods.local().find(pack => pack.original_id == imported.imported.original_id)

            const action =
              existing
                ? await new ConfirmationModal({
                  title: "Duplicate Import",
                  body: "An instance of this method pack already exists locally. What do you want to do?",
                  options: [{
                    kind: "cancel" as const,
                    text: "Cancel",
                    value: "cancel" as const,
                    is_cancel: true
                  }, {
                    kind: "confirm" as const,
                    text: "Create Copy",
                    value: "copy" as const,
                  }, {
                    kind: "confirm" as const,
                    text: "Replace",
                    value: "replace" as const,
                  }]
                }).do()
                : "copy"

            switch (action) {
              case "copy":
                this.methods.import(imported.imported, !existing && imported.imported.type == "default");
                break;
              case "replace":
                this.methods.replacePack(existing, imported.imported)
                break;
              case "cancel":
            }
          }
        }),
      new LightButton("+ Create New", "rectangle")
        .onClick(() => {
          new NewMethodPackModal().do()
        })
    ).appendTo(this.body)

    packs.forEach(p => {
      new PackWidget(p, MethodPackManager.instance(), {buttons: true, collapsible: true}).appendTo(this.body)
    })
  }
}