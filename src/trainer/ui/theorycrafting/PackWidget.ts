import Widget from "../../../lib/ui/Widget";
import {MethodPackManager, Pack} from "../../model/MethodPackManager";
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
import exp = ExportImport.exp;
import cleanedJSON = util.cleanedJSON;
import notification = Notification.notification;
import hboxl = C.hboxl;
import {MethodNormalization} from "./MethodNormalization";

export default class PackWidget extends Widget {
  constructor(public pack: Pack,
              manager: MethodPackManager,
              customization: {
                buttons?: boolean,
                collapsible?: boolean
              }
  ) {
    super();

    this.addClass("ctr-pack-widget")

    let body = new Properties()
      .addClass("ctr-pack-widget-body")

    let header = C.div()
      .append(
        `${pack.name} (${pack.methods.length})`,
      )
      .addClass("ctr-pack-widget-header")
      .tooltip(pack.local_id)

    this.append(header, body)

    body.named("Type", pack.type)

    body.named("Assumptions", hboxl(...AssumptionProperty.icons(pack.default_assumptions)))

    body.named("Author(s)", c().text(pack.author))

    body.row(c().css("font-style", "italic").text(pack.description))

    if (customization.buttons) {
      this.on("click contextmenu", (event) => {
        event.preventDefault()

        let menu: Menu = {
          type: "submenu",
          text: "",
          children: []
        }

        menu.children.push({
          type: "basic",
          text: "Clone",
          icon: "assets/icons/copy.png",
          handler: () => new NewMethodPackModal(pack).do()
        })

        if (pack.type == "local") {
          menu.children.push({
            type: "basic",
            text: "Edit Metainformation",
            icon: "assets/icons/edit.png",
            handler: () => {
              new EditMethodPackModal(pack).do()
            }
          })
        }

        if (pack.type == "local" || pack.type == "imported") {
          menu.children.push({
            type: "basic",
            text: "Delete",
            icon: "assets/icons/delete.png",
            handler: async () => {
              const really = await new ConfirmationModal<boolean>({
                body:
                  pack.type == "local"
                    ? `Are you sure you want to delete the local pack ${pack.name}? There is no way to undo this action!`
                    : `Are you sure you want to remove this imported pack? You will need to reimport it again.`,
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
             ExportStringModal.do(exp({type: "method-pack", version: 1},
                true,
                true
              )(pack), "", `${pack_name}.txt`)
            }
          })

          menu.children.push({
            type: "basic",
            text: "Export JSON",
            handler: () => {
              ExportStringModal.do(cleanedJSON(pack), "",
                `${pack_name}.json`
              )
            }
          })
        }

        menu.children.push({
          type: "basic",
          text: "Normalize",
          handler: () => {
            new MethodNormalization.Modal(this.pack).show()
          }
        })

        new ContextMenu(menu).showFromEvent2(event.originalEvent as MouseEvent)
      })
    }
  }
}