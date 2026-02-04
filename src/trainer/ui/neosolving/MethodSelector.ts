import Widget from "../../../lib/ui/Widget";
import {FavouriteIcon, NislIcon} from "../nisl";
import {ewent} from "../../../lib/reactive";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import {C} from "../../../lib/ui/constructors";
import {AbstractDropdownSelection} from "../widgets/AbstractDropdownSelection";
import {Clues} from "../../../lib/runescape/clues";
import {MethodProperties} from "../MethodProperties";
import {FavoriteIndex} from "../../favorites";
import spacer = C.spacer;
import span = C.span;
import hbox = C.hbox;
import ClueSpot = Clues.ClueSpot;

export default class MethodSelector extends Widget {
  private clue: ClueSpot.Id
  private method: AugmentedMethod
  private methods: AugmentedMethod[]

  public readonly method_selected = ewent<{
    clue: ClueSpot.Id,
    method: AugmentedMethod
  }>()

  private row: Widget

  constructor(private favourite_index: FavoriteIndex) {
    super()
  }

  public async setClue(clue: ClueSpot.Id, method: AugmentedMethod) {
    this.clue = clue
    this.method = method

    this.methods = (await MethodPackManager.instance().getForClue(this.clue))

    this.render()
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
      span(` (${method.method.expected_time.toFixed(method.method.type == "scantree" ? 1 : 0) ?? "?"}t)`)
    )

    return div
  }

  private render() {
    this.empty()

    if (!this.clue) return

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
      this.method
        ? this.renderName(this.method)
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
      const favourite = await this.favourite_index.getMethod(this.clue, false)

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
          if (m != this.method) {
            this.method = m
            this.render()
            this.method_selected.trigger({clue: this.clue, method: m})
          }
        })
        .onClosed(() => {
          this.dropdown = null
        })
        .open(this, this.row)
    }
  }
}