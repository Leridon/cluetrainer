import Behaviour from "../../../lib/ui/Behaviour";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import MapSideBar from "../MapSideBar";
import ScanEditor from "./scanedit/ScanEditor";
import {SolvingMethods} from "../../model/methods";
import {Clues} from "../../../lib/runescape/clues";
import MethodSubEditor from "./MethodSubEditor";
import LightButton from "../widgets/LightButton";
import SelectPackModal from "./SelectPackModal";
import {GenericPathMethodEditor} from "./GenericPathMethodEditor";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {observe} from "../../../lib/reactive";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {EditMethodMetaModal} from "./MethodModal";
import TheoryCrafter from "./TheoryCrafter";
import Dependencies from "../../dependencies";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {Notification} from "../NotificationBar";
import {MethodProperties} from "../MethodProperties";
import {ConfirmBeforeUnload} from "../../../lib/util/ConfirmBeforeUnload";
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import GenericPathMethod = SolvingMethods.GenericPathMethod;
import Method = SolvingMethods.Method;
import ClueSpot = Clues.ClueSpot;
import notification = Notification.notification;

class MethodEditSideBar extends MapSideBar {
  save_row: ButtonRow
  meta_props: MethodProperties

  constructor(private parent: MethodEditor) {
    super("Editing Method");

    this.save_row = new ButtonRow().appendTo(this.body)

    this.header.close_handler.set(() => this.close())

    this.parent.is_dirty.subscribe(() => this.renderSaveRow())
    this.meta_props = new MethodProperties(this.parent.method).appendTo(this.body)

    this.renderMetaProps()
    this.renderSaveRow()
  }

  private renderMetaProps() {
    this.meta_props.render()

    this.meta_props.row(new LightButton("Edit Metainformation", "rectangle").onClick(async () => {
      const result = await new EditMethodMetaModal(this.parent.method.clue,
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
      new LightButton("Make and Edit Copy")
        .setEnabled(!!this.parent.method.pack)
        .onClick(async () => {
          this.parent.theorycrafter.editMethod({
            pack: null,
            clue: this.parent.method.clue,
            method: SolvingMethods.clone(this.parent.method.method)
          })
        }),
      new LightButton("Close")
        .onClick(async () => this.close())
      ,
    )
  }

  private async close() {
    const really = await this.parent.requestClosePermission()

    if (really) this.parent.stop()
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

    const bounds = ClueSpot.targetArea(this.method.clue)

    if (bounds) {
      this.sub_editor.layer.getMap().fitView(TileArea.toRect(bounds[0]))
    }

    this.lifetime_manager.bind(ConfirmBeforeUnload.instance().register())
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