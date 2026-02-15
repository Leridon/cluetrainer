import {MethodPackManager} from "../../MethodPackManager";
import MethodPackWidget from "./MethodPackWidget";
import {Observable, observe} from "../../../lib/reactive";
import lodash from "lodash";
import Button from "../../../lib/ui/controls/Button";
import {BigNisButton} from "../widgets/BigNisButton";
import {FormModal} from "../../../lib/ui/controls/FormModal";
import LightButton from "../widgets/LightButton";
import {NewMethodPackModal} from "./MethodPackModal";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {MethodPack} from "../../model/MethodPack";

export default class SelectPackModal extends FormModal<{
  pack: MethodPack
}> {
  private packs = MethodPackManager.instance()

  private valid_packs: Observable<MethodPack[]> = observe([])

  private pack_widgets: MethodPackWidget[]

  selected: Observable<MethodPack> = observe(null)

  save_button: Button

  constructor(private types: MethodPack["type"][] = ["local"]) {
    super({force_footer: true});

    this.title.set("Select Pack");

    this.selected.subscribe(() => this.highlightCurrentSelection())

    this.updateValidPacks(true)

    this.valid_packs.subscribe((valid) => {
      this.renderSelectors(valid)

      if (!valid.includes(this.selected.value())) this.selected.set(null)
    })
  }

  private updateValidPacks(auto_select: boolean = false): void {
    this.packs.all().then((packs) => {
      this.valid_packs.set(packs.filter(p => this.types.includes(p.type)))

      if (auto_select) {
        this.selected.set(lodash.maxBy(this.valid_packs.value(), p => p.timestamp))
      }
    })
  }

  render() {
    super.render();

    this.renderSelectors(this.valid_packs.value())
  }

  private renderSelectors(valid_packs: MethodPack[]) {
    this.body.empty();

    this.pack_widgets = valid_packs.map(pack => {
      return new MethodPackWidget(pack, this.packs, {
        buttons: false
      })
        .css("cursor", "pointer")
        .tapRaw(r => r.on("click", () => {
          if (this.selected.value() == pack) this.selected.set(null)
          else this.selected.set(pack)
        }))
        .appendTo(this.body)
    })

    if (this.types.includes("local")) {
      new ButtonRow().buttons(
        new LightButton("Create New")
          .onClick(async () => {
            let result = await new NewMethodPackModal().do()

            if (result?.created) this.updateValidPacks(true)
          })
      ).appendTo(this.body)
    }
  }

  private highlightCurrentSelection(): void {
    const currentSelection = this.selected.value()

    this.pack_widgets.forEach(w => {
      w.toggleClass("inactive", w.pack != currentSelection)

      this.save_button?.setEnabled(!!currentSelection)
    })
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => {
          this.confirm({
            pack: null
          })
        }),
      this.save_button = new BigNisButton("Save", "confirm").onClick(() => {
        this.confirm({
          pack: this.selected.value()
        })

        /*

        this.packs.updatePack(this.active.value(), p => p.methods.push(this.method.method))

        this.saved_in = this.active.value()

        this.remove()


         */
      }),
    ]
  }
}