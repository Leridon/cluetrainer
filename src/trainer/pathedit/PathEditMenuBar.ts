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
import cleanedJSON = util.cleanedJSON;

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