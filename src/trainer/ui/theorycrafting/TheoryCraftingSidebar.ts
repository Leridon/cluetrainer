import MapSideBar from "../MapSideBar";
import TheoryCrafter from "./TheoryCrafter";
import PackWidget from "./PackWidget";
import {AugmentedMethod, MethodPackManager, Pack} from "../../model/MethodPackManager";
import {C} from "../../../lib/ui/constructors";
import LightButton from "../widgets/LightButton";
import ImportStringModal from "../widgets/modals/ImportStringModal";
import {ExportImport} from "../../../lib/util/exportString";
import {NewMethodPackModal} from "./MethodPackModal";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {observe} from "../../../lib/reactive";
import {MethodWidget} from "./MethodWidget";
import {Clues} from "../../../lib/runescape/clues";
import {DropdownSelection} from "../widgets/DropdownSelection";
import Properties from "../widgets/Properties";
import btnrow = C.btnrow;
import imp = ExportImport.imp;

export default class TheoryCraftingSidebar extends MapSideBar {

  private methods: MethodPackManager

  private opened_pack = observe<Pack>(null)

  constructor(public theorycrafter: TheoryCrafter) {
    super("Method Packs");

    this.css("width", "300px")

    this.methods = MethodPackManager.instance()

    this.methods.saved.on(async (p) => this.render()).bindTo(theorycrafter.lifetime_manager)

    this.opened_pack.subscribe(() => this.render(), true)
  }

  private method_widgets: MethodWidget[] = []

  async render() {
    this.body.empty()

    const focus = this.opened_pack.value()

    const packs = await this.methods.all()

    this.method_widgets = []

    const props = new Properties().appendTo(this.body)

    /*
    props.named("Map Visibility",
      new DropdownSelection({
        type_class: {
          toHTML: e => e
        }
      }, ["None", "All", "Preferred per Clue", "Focussed Method Pack", "Manual Selection"])
    )*/

    if (focus) {
      this.header.name.set(`Pack: ${focus.name}`)
      this.header.close_handler.set(() => this.opened_pack.set(null))

      /*props.row(btnrow(
        new LightButton("Visibility", "rectangle")
          .onClick(async () => {

          }),
      ))*/

      this.method_widgets = focus.methods.map(method =>
        new MethodWidget(this.theorycrafter, AugmentedMethod.create(method, focus))
          .appendTo(this.body)
      )
    } else {
      this.header.name.set("Method Packs")
      this.header.close_handler.set(null)

      props.row(btnrow(
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
                      text: "Duplicate",
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
      ))

      packs.forEach(p => {
        new PackWidget(p, MethodPackManager.instance(), {buttons: true, collapsible: true}, pack => this.opened_pack.set(pack)).appendTo(this.body)
      })
    }
  }

  notifyFavouriteChange(change: { clue: Clues.ClueSpot.Id; new: AugmentedMethod }) {
    this.method_widgets.forEach(w => w.notifyFavouriteChange(change))
  }
}