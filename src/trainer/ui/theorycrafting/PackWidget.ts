import Widget from "../../../lib/ui/Widget";
import {AugmentedMethod, MethodPackManager, Pack} from "../../model/MethodPackManager";
import Properties from "../widgets/Properties";
import {C} from "../../../lib/ui/constructors";
import {ExportImport} from "../../../lib/util/exportString";
import ExportStringModal from "../widgets/modals/ExportStringModal";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import ContextMenu, {Menu} from "../widgets/ContextMenu";
import {AssumptionProperty} from "./AssumptionProperty";
import {EditMethodPackModal, NewMethodPackModal} from "./MethodPackModal";
import {util} from "../../../lib/util/util";
import {Notification} from "../NotificationBar";
import {MethodNormalization} from "./MethodNormalization";
import * as lodash from "lodash"
import {SolvingMethods} from "../../model/methods";
import {ScanTree} from "../../../lib/cluetheory/scans/ScanTree";
import {Path} from "../../../lib/runescape/pathing";
import exp = ExportImport.exp;
import cleanedJSON = util.cleanedJSON;
import notification = Notification.notification;
import hboxl = C.hboxl;
import span = C.span;
import spacer = C.spacer;
import Method = SolvingMethods.Method;

export default class PackWidget extends Widget {
  constructor(public pack: Pack,
              private manager: MethodPackManager,
              customization: {
                buttons?: boolean,
                collapsible?: boolean
              },
              private open_handler: (_: Pack) => void = undefined
  ) {
    super();


    this.addClass("ctr-pack-widget")

    const body = new Properties()
      .addClass("ctr-pack-widget-body")

    const header = C.hbox(
        `${pack.name} (${pack.methods.length})`,
        spacer(),
        C.div(span(lodash.capitalize(pack.type))
          .addClass("ctr-pack-widget-header-type")
          .addClass(Pack.isEditableDefault(pack)
            ? `ctr-pack-widget-header-type-local`
            : `ctr-pack-widget-header-type-${pack.type}`)
        ).css("position", "relative"),
        customization.buttons ?
          c().setInnerHtml("&#x22EE;")
            .addClass("ctr-path-edit-overview-step-options")
            .addClass("ctr-clickable")
            .on("click", async (event) => {
              this.openContextMenu(event)
            }) : undefined
      )
      .addClass("ctr-pack-widget-header")
      .tooltip(pack.local_id)

    this.append(header, body)

    body.named("Assumptions", hboxl(...AssumptionProperty.icons(pack.default_assumptions)))

    body.named("Author(s)", c().text(pack.author))

    body.row(c().css("font-style", "italic").text(pack.description))

    if (customization.buttons) {
      this.on("contextmenu", (event) => this.openContextMenu(event))
    }

    if (open_handler) {
      this.addClass("ctr-clickable")
      this.on("click", () => this.open_handler(pack))
    }
  }

  private openContextMenu(event: JQuery.MouseEventBase) {
    event.preventDefault()
    event.stopPropagation()

    const pack = this.pack
    const manager = this.manager

    const menu: Menu = {
      type: "submenu",
      text: "",
      children: []
    }

    if (this.open_handler) {
      menu.children.push({
        type: "basic",
        text: "Open",
        handler: () => this.open_handler(pack)
      })
    }

    if (event.ctrlKey && pack.is_real_default) {
      menu.children.push({
        type: "basic",
        text: "Enable Editing",
        icon: "/assets/icons/copy.png",
        handler: () => MethodPackManager.instance().create(pack, true)
      })
    } else {
      menu.children.push({
        type: "basic",
        text: "Clone",
        icon: "/assets/icons/copy.png",
        handler: () => new NewMethodPackModal(pack).do()
      })
    }

    if (Pack.isEditable(pack)) {
      menu.children.push({
        type: "basic",
        text: "Edit Metainformation",
        icon: "/assets/icons/edit.png",
        handler: () => {
          new EditMethodPackModal(pack).do()
        }
      })
    }

    if (Pack.isEditable(pack) || pack.type == "imported") {
      menu.children.push({
        type: "basic",
        text: "Delete",
        icon: "/assets/icons/delete.png",
        handler: async () => {
          const really = await new ConfirmationModal<boolean>({
            body:
              pack.type == "imported"
                ? `Are you sure you want to remove this imported pack? You will need to reimport it again.`
                : `Are you sure you want to delete the local pack ${pack.name}? There is no way to undo this action!`,
            options: [
              {kind: "neutral", text: "Cancel", value: false},
              {kind: "cancel", text: "Delete", value: true},
            ]
          }).do()

          if (really) {
            await manager.deletePack(pack)

            notification(`Deleted pack '${this.pack.name}'`).show()
          }
        }
      })

      const pack_name = pack.name.length > 0 ? pack.name : "Unnamed Pack"

      menu.children.push({
        type: "basic",
        text: "Export",
        handler: () => {
          const date = new Date(pack.timestamp * 1000)

          ExportStringModal.do(exp({type: "method-pack", version: 1},
            true,
            true
          )(pack), "", `${pack_name}-${date.toLocaleString("en-gb")}.txt`)
        }
      })

      menu.children.push({
        type: "basic",
        text: "Export JSON",
        handler: () => {
          const date = new Date(pack.timestamp * 1000)

          ExportStringModal.do(cleanedJSON(pack), "",
            `${pack_name}-${date.toLocaleString("en-gb")}.json`
          )
        }
      })
    }

    if (!pack.is_real_default) {
      menu.children.push({
        type: "basic",
        text: "Normalize",
        handler: () => {
          new MethodNormalization.Modal(this.pack).show()
        }
      })
    }

    menu.children.push({
      type: "submenu",
      text: "Advanced",
      children: [{
        type: "basic",
        text: "Detailled Export",
        handler: async () => {
          type MethodWithDetails = Method & { details: any }

          const with_details: MethodWithDetails[] = await Promise.all(this.pack.methods.map(async m => {
            const details: any = await (async () => {
              switch (m.type) {
                case "scantree": {
                  const augmented_method = AugmentedMethod.create(m, this.pack)
                  const augmented = await ScanTree.Augmentation.augment({
                    augment_paths: true,
                    analyze_correctness: true,
                    analyze_completeness: true,
                    analyze_timing: true,
                    synthesize_triple_nodes: false,
                    path_assumptions: m.assumptions
                  }, m.tree, augmented_method.clue.clue)

                  augmented.root_node = ScanTree.Augmentation.AugmentedScanTreeNode.uncycled(augmented.root_node)
                  return augmented
                }
                case "general_path":
                  return await Path.augment(m.main_path)
              }
            })()

            return {...m, details: details}
          }))

          ExportStringModal.do(cleanedJSON(with_details), "All methods of this method pack with advanced analysis included.", `${this.pack.name}_augmented.json`)
        }
      }]
    })

    new ContextMenu(menu).showFromEvent2(event.originalEvent as MouseEvent)

  }
}