import Widget from "../../../lib/ui/Widget";
import {FavouriteIcon, NislIcon} from "../nisl";
import NeoSolvingBehaviour from "./NeoSolvingBehaviour";
import {Observable, observe} from "../../../lib/reactive";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import {C} from "../../../lib/ui/constructors";
import {AbstractDropdownSelection} from "../widgets/AbstractDropdownSelection";
import {Clues} from "../../../lib/runescape/clues";
import {MethodProperties} from "../MethodProperties";
import {util} from "../../../lib/util/util";
import spacer = C.spacer;
import span = C.span;
import hbox = C.hbox;
import ClueSpot = Clues.ClueSpot;
import async_init = util.async_init;

export default class MethodSelector extends Widget {
  public method: Observable<AugmentedMethod>

  private methods: AugmentedMethod[]

  private row: Widget

  constructor(private parent: NeoSolvingBehaviour, private clue: ClueSpot.Id) {
    super()

    this.method = observe(parent.active_method)

    async_init(async () => {
      this.methods = (await MethodPackManager.instance().getForClue(this.clue))

      this.method.subscribe(m => this.render(m), true)
    })
  }

  private renderName(method: AugmentedMethod): Widget {
    const div = hbox()
      .css2({
        overflow: "hidden",
        "white-space": "nowrap"
      })

    if (method.method.name && method.method.name.length > 0) {
      div.append(C.span(method.method.name)
        .css2({
          overflow: "hidden",
          "text-overflow": "ellipsis",
        })
      )
    } else {
      div.append(C.italic("Unnamed Method")
        .css2({
          overflow: "hidden",
          "text-overflow": "ellipsis",
        }))
    }

    div.append(
      C.space(),
      span(` (${method.method.expected_time.toFixed(method.method.type == "scantree" ? 1 : 0) ?? "?"} ticks)`)
    )

    return div
  }

  private render(method: AugmentedMethod) {
    const icon = NislIcon.dropdown()
      .css("margin-right", "3px")
      .css("margin-left", "3px")
      .css("position", "relative")

    icon.append(c().css2({
      "position": "absolute",
      "top": 0,
      color: "black",
      "font-weight": "bold",
      width: "100%",
      "text-align": "center"
    }).text(this.methods.length.toString()))

    icon.img.css("width", "12px")

    this.row = hbox(
      method
        ? this.renderName(method)
        : c("<span style='font-style: italic; color: gray'> No method selected</span>"),
      spacer(),
      //`(${this.methods.length})`,
      icon
      ,
    )
      .addClass("ctr-clickable")
      .setAttribute("tabindex", "-1")

    this.row.on("click", () => this.openMethodSelection())
      .appendTo(this)
  }

  private dropdown: AbstractDropdownSelection.DropDown<AugmentedMethod> = null

  private async openMethodSelection() {
    if (!this.dropdown) {
      const favourite = await this.parent.app.favourites.getMethod(this.clue, false)

      this.dropdown = new AbstractDropdownSelection.DropDown<AugmentedMethod>({
        dropdownClass: "ctr-neosolving-favourite-dropdown",
        renderItem: m => {
          if (!m) {
            return hbox(
              new FavouriteIcon().set(favourite === null),
              span("None"),
              spacer()
            )
          } else {
            return hbox(
              new FavouriteIcon().set(favourite && m.method.id == favourite.method.id),
              this.renderName(m),
              spacer()
            ).addTippy(new MethodProperties(m))
          }
        }
      })
        .setItems((await MethodPackManager.instance().getForClue(this.clue)).concat([null]))
        .onSelected(m => {
          this.parent.app.favourites.setMethod(this.clue, m)
          this.parent.setMethod(m)
          if (!m) this.parent.fitToClue()
        })
        .onClosed(() => {
          this.dropdown = null
        })
        .open(this, this.row)
    }
  }
}