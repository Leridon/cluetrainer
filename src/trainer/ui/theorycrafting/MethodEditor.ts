import Behaviour from "../../../lib/ui/Behaviour";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import MapSideBar from "../MapSideBar";
import Properties from "../widgets/Properties";
import ScanEditor from "./scanedit/ScanEditor";
import {SolvingMethods} from "../../model/methods";
import {Clues} from "../../../lib/runescape/clues";
import MethodSubEditor from "./MethodSubEditor";
import LightButton from "../widgets/LightButton";
import SelectPackModal from "./SelectPackModal";
import {GenericPathMethodEditor} from "./GenericPathMethodEditor";
import {AssumptionProperty} from "./AssumptionProperty";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {observe} from "../../../lib/reactive";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {EditMethodMetaModal} from "./MethodModal";
import TheoryCrafter from "./TheoryCrafter";
import Dependencies from "../../dependencies";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import GenericPathMethod = SolvingMethods.GenericPathMethod;
import Method = SolvingMethods.Method;
import ClueSpot = Clues.ClueSpot;
import {Notification} from "../NotificationBar";
import notification = Notification.notification;

class MethodEditSideBar extends MapSideBar {
  save_row: ButtonRow
  meta_props: Properties

  constructor(private parent: MethodEditor) {
    super("Method Editor");

    this.save_row = new ButtonRow().appendTo(this.body)

    /*this.header.close_handler.set(() => {
        // TODO: Confirm for unsaved changes

        parent.stop()
    })*/

    this.parent.is_dirty.subscribe(() => this.renderSaveRow())
    this.meta_props = new Properties().appendTo(this.body)

    this.renderMetaProps()
    this.renderSaveRow()
  }

  private renderMetaProps() {
    this.meta_props.empty()

    const props = this.meta_props

    props.named("Pack", c().text(this.parent.method.pack ? this.parent.method.pack.name : "None"))
    props.named("Name", c().text(this.parent.method.method.name))
    props.named("Assumptions", c().append(...AssumptionProperty.icons(this.parent.method.method.assumptions)))

    props.header("Description")
    props.row(c().text(this.parent.method.method.description
        ? this.parent.method.method.description
        : "None"
      ).css("font-style", "italic")
    )
    props.row(new LightButton("Edit Metainformation", "rectangle").onClick(async () => {
      const result = await new EditMethodMetaModal({clue: this.parent.method.clue, spot: this.parent.method.method.for.spot},
        Method.meta(this.parent.method.method)
      ).do()

      if (result?.result) {
        Method.setMeta(this.parent.method.method, result.result)
        this.renderMetaProps()
        this.parent.sub_editor.setAssumptions(result.result.assumptions)
        this.parent.registerChange()
      }
    }))

  }

  private renderSaveRow() {
    this.save_row.empty()

    this.save_row.buttons(
      new LightButton("Save", "rectangle")
        .setEnabled(this.parent.is_dirty.value())
        .onClick(async () => {

          if (this.parent.method.pack) {
            await MethodPackManager.instance().updateMethod(this.parent.method)
            notification(`Successfully saved in Pack '${this.parent.method.pack.name}'.`).show()
          } else {
            const result = await new SelectPackModal().do()

            if (result?.pack) {
              await MethodPackManager.instance().updatePack(result.pack, p => p.methods.push(this.parent.method.method))

              this.parent.method.pack = result.pack

              notification(`Successfully saved in Pack '${this.parent.method.pack.name}'.`).show()

              this.renderSaveRow()
            }
          }

          this.parent.is_dirty.set(false)
        }),
      new LightButton("Make and Edit Copy", "rectangle")
        .setEnabled(!!this.parent.method.pack)
        .onClick(async () => {
          this.parent.theorycrafter.editMethod({
            pack: null,
            clue: this.parent.method.clue,
            method: SolvingMethods.clone(this.parent.method.method)
          })
        }),
      new LightButton("Close", "rectangle")
        .onClick(async () => {
          const really = await this.parent.requestClosePermission()

          if (really) this.parent.stop()
        })
      ,
    )

  }
}

export default class MethodEditor extends Behaviour {
  is_dirty = observe(false)

  sidebar: MethodEditSideBar

  sub_editor: MethodSubEditor

  constructor(public theorycrafter: TheoryCrafter, public method: AugmentedMethod) {
    super();

    if (!method.pack || !MethodPackManager.instance().getMethod(method.pack.local_id, method.method.id)) {
      this.is_dirty.set(true)
    }
  }

  registerChange(): void {
    this.is_dirty.set(true)
  }

  protected begin() {
    this.sidebar = new MethodEditSideBar(this).prependTo(Dependencies.instance().app.main_content)
      .css("width", "300px")

    if (this.method.method.type == "scantree") {
      this.sub_editor = this.withSub(new ScanEditor(this, Dependencies.instance().app, this.method as AugmentedMethod<ScanTreeMethod, Clues.Scan>, this.sidebar.body))
    } else {
      this.sub_editor = this.withSub(new GenericPathMethodEditor(this, this.method as AugmentedMethod<GenericPathMethod, Clues.Step>))
    }

    this.sub_editor.setAssumptions(this.method.method.assumptions)

    const bounds = ClueSpot.targetArea({clue: this.method.clue, spot: this.method.method.for.spot})

    if (bounds) {
      this.sub_editor.layer.getMap().fitView(TileArea.toRect(bounds))
    }
  }

  protected end() {
    this.sidebar.remove()
  }

  async requestClosePermission(): Promise<boolean> {
    return (!this.is_dirty.value()) || (await new ConfirmationModal({
      title: "Unsaved changes",
      body: "There are unsaved changes that will be lost.",
      options:
        [{
          kind: "neutral",
          text: "Cancel",
          value: false,
          is_cancel: true
        },
          {
            kind: "cancel",
            text: "Confirm",
            value: true,
          },
        ]
    }).do())
  }
}