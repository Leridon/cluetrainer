import LightButton from "../ui/widgets/LightButton";
import ContextMenu, {MenuEntry} from "../ui/widgets/ContextMenu";
import {BookmarkStorage} from "./BookmarkStorage";
import ExportStringModal from "../ui/widgets/modals/ExportStringModal";
import {Path} from "../../lib/runescape/pathing";
import ImportStringModal from "../ui/widgets/modals/ImportStringModal";
import {PathEditor} from "./PathEditor";
import {util} from "../../lib/util/util";
import Widget from "../../lib/ui/Widget";
import {TileArea} from "../../lib/runescape/coordinates/TileArea";
import {AssumptionProperty} from "../ui/theorycrafting/AssumptionProperty";
import {FormModal} from "../../lib/ui/controls/FormModal";
import {SolvingMethods} from "../model/methods";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import cleanedJSON = util.cleanedJSON;
import ClueAssumptions = SolvingMethods.ClueAssumptions;

export class PathEditMenuBar extends Widget {
  constructor(private editor: PathEditor) {
    super();

    this.addClass("ctr-menurow")

    // Render buttons
    {
      const undo = new LightButton("Undo", "rectangle")
        .onClick(() => this.editor.value.undoredo.undo())

      const redo = new LightButton("Redo", "rectangle")
        .onClick(() => this.editor.value.undoredo.redo())

      undo.enabled.bindTo(this.editor.value.undoredo.canUndo)
      redo.enabled.bindTo(this.editor.value.undoredo.canRedo)

      this.append(
        undo, redo,
        new LightButton("Bookmarks", "rectangle")
          .onClick((event) => {
            new ContextMenu(
              BookmarkStorage.getContextMenu(this.editor.value, this.editor.bookmarks)
            ).showFromEvent(event)
          })
        ,
        new LightButton("Save", "rectangle").onClick(() => {
          this.editor.options.commit_handler(this.editor.value.get())
        }).setEnabled(!!this.editor.options.commit_handler),
        new LightButton("Close", "rectangle")
          .setEnabled(!!this.editor.options.discard_handler)
          .onClick(() => {
            this.editor.discard()
          })
        ,
        new LightButton("", "rectangle")
          .setInnerHtml("&#x2630;")
          .onClick((event) => {
            const entries: MenuEntry[] = []

            if (this.editor.options.target) {
              entries.push({
                type: "basic",
                text: "Focus target",
                handler: () => {
                  this.editor.game_layer.getMap().fitView(TileArea.toRect(this.editor.options.target[0].parent))
                }
              })
            }

            entries.push(
              {
                type: "basic",
                text: "Export",
                handler: () => {
                  new ExportStringModal(Path.export_path(this.editor.value.get())).show()
                }
              },
              {
                type: "basic",
                text: "Show JSON",
                handler: () => {
                  new ExportStringModal(cleanedJSON(this.editor.value.get())).show()
                }
              },
              {
                type: "basic",
                text: "Import",
                handler: async () => {
                  const imported = await new ImportStringModal((s) => Path.import_path(s)).do()

                  if (imported?.imported) this.editor.value.set(imported.imported)
                }
              },
            )

            if (this.editor.options.editable_assumptions) {
              entries.push({
                type: "basic",
                text: "Edit assumptions",
                handler: async () => {
                  const self = this

                  const res = await (new class extends FormModal<ClueAssumptions> {
                    private property: AssumptionProperty

                    constructor() {
                      super()

                      this.setTitle("Edit assumptions")
                    }

                    public render() {
                      super.render()

                      const assumptions = self.editor.options.start_state.assumptions

                      this.body.append(
                        this.property = new AssumptionProperty()
                          .setValue(assumptions)
                          .setRelevantAssumptions(ClueAssumptions.Relevance.path)
                          .onCommit(a => {
                              //this.commit(copyUpdate(this.get(), meta => meta.assumptions = a))
                            }
                          )
                      )
                    }

                    getButtons(): BigNisButton[] {
                      return [
                        new BigNisButton("Save", "confirm").onClick(() => this.confirm(this.property.get())),
                        new BigNisButton("Cancel", "cancel").onClick(() => this.cancel()),
                      ]
                    }
                  }).do()

                  if (!res) return

                  this.editor.value.setAssumptions(res)

                }
              })
            }

            new ContextMenu({
              type: "submenu",
              text: "",
              children: entries
            }).showFromEvent(event)
          }),
      )
    }
  }
}