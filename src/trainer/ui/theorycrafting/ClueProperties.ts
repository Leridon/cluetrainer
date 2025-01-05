import Properties from "../widgets/Properties";
import {Clues, ClueType} from "../../../lib/runescape/clues";
import {Constants} from "../../constants";
import {GieliCoordinates, TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import LightButton from "../widgets/LightButton";
import {C} from "../../../lib/ui/constructors";
import {util} from "../../../lib/util/util";
import {AugmentedMethod, MethodPackManager, Pack} from "../../model/MethodPackManager";
import ContextMenu, {Menu, MenuEntry} from "../widgets/ContextMenu";
import Dependencies from "../../dependencies";
import {FavouriteIcon} from "../nisl";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {EditMethodMetaModal, NewMethodModal} from "./MethodModal";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {Notification} from "../NotificationBar";
import {SolvingMethods} from "../../model/methods";
import hbox = C.hbox;
import spacer = C.spacer;
import span = C.span;
import ClueSpot = Clues.ClueSpot;
import natural_join = util.natural_join;
import plural = util.plural;
import activate = TileArea.activate;

export class ClueProperties extends Properties {
  render_promise: Promise<this> = null

  constructor(private clue: Clues.ClueSpot,
              private edit_handler: (_: AugmentedMethod) => any,
              private include_header: boolean,
              private alternative_index?: number,
              private manage_methods_button?: boolean
  ) {
    super();

    this.render_promise = this.render()
  }

  private async render(): Promise<this> {
    if (this.include_header) this.row(ClueProperties.header(this.clue))

    function renderSolution(self: ClueProperties, sol: Clues.Solution): void {
      try {
        self.named("Solution", (() => {
          switch (sol.type) {
            case "dig":
              return c(`<span><img src='assets/icons/cursor_shovel.png' class="inline-img"> Dig at ${TileCoordinates.toString(sol.spot)}</span>`)
            case "search":
              return c(`<span><img src='assets/icons/cursor_search.png' class="inline-img"> Search <span class="nisl-entity">${sol.entity}</span> at ${TileCoordinates.toString(TileRectangle.bl(sol.spot))}</span>`)
            case "talkto":
              return c(`<span><img src='assets/icons/cursor_talk.png' class="inline-img"> Talk to <span class="nisl-npc">${sol.npc}</span> near ${TileCoordinates.toString(activate(sol.spots[self.alternative_index || 0].range).center())}</span>`)
          }
        })())

        if (sol.type == "search" && sol.key) {
          self.named("Key", c(`<span><span style="font-style: italic">${sol.key.instructions}</span> (${sol.key.answer})</span>`))
        }
      } catch (e) {
      }
    }

    switch (this.clue.clue.type) {
      case "scan":
        this.named("Area", c().text(`${this.clue.clue.scantext}`))
        this.named("Range", c().text(`${this.clue.clue.range}`))
        this.named("Spots", c().text(`${this.clue.clue.spots.length}`))
        break
      case "compass":
        renderSolution(this, {type: "dig", spot: this.clue.spot, description: null})
        this.named("Total", c().text(`${this.clue.clue.spots.length}`))
        break
      case "coordinates":
        this.named("Text", c().text(this.clue.clue.text[0]).css("font-style", "italic"))
        this.named("Coordinates", c().text(GieliCoordinates.toString(this.clue.clue.coordinates)))
        renderSolution(this, {type: "dig", spot: GieliCoordinates.toCoords(this.clue.clue.coordinates), description: null})
        break
      case "simple":
      case "cryptic":
      case "anagram":
        this.named("Text", c().text(this.clue.clue.text[0]).css("font-style", "italic"))
        renderSolution(this, this.clue.clue.solution)
        break
      case "map":
        this.row(
          c(`<div style="text-align: center"><img src="${this.clue.clue.image_url}" style="height: 180px; width: auto; max-width: 100%"></div>`)
        )
        this.named("Transcript", c().text(this.clue.clue.text[0]))
        renderSolution(this, this.clue.clue.solution)
        break
      case "emote":
        this.named("Text", c().text(this.clue.clue.text[0]).css("font-style", "italic"))
        this.named("Equip", c().text(natural_join(this.clue.clue.items, "and")))

        if (this.clue.clue.emotes.length > 1)
          this.named("Emotes", c().text(natural_join(this.clue.clue.emotes, "then")))
        else
          this.named("Emote", c().text(this.clue.clue.emotes[0]))

        this.named("Agent", c().text(this.clue.clue.double_agent ? "Yes" : "No"))
        break
      case "skilling":
        this.named("Text", c().text(this.clue.clue.text[0]))
        this.named("Answer", c().text(this.clue.clue.answer))
        break
    }

    if (this.clue.clue.challenge?.length > 0) {
      this.named("Challenge", c().append(...this.clue.clue.challenge.map(ClueProperties.render_challenge).map(s => s)))
    }

    const methods = await MethodPackManager.instance().get(this.clue)

    this.named("Methods", c().text(`${plural(methods.length, "method")} available`))

    if (this.manage_methods_button) {
      this.row(hbox(new LightButton("Manage Methods", "rectangle")
        .onClick(async (event) => {
          new ContextMenu(await ClueProperties.methodMenu(this.clue, this.edit_handler))
            .showFromEvent(event)
        })
      ).addClass("ctr-button-container"))
    }

    /*
    let methods = await this.methods.get(this.clue)
    this.header("Methods")

    if (methods.length > 0) {
        let grouped = lodash.groupBy(methods, e => e.pack.local_id)

        for (let methods_in_pack of Object.values(grouped)) {
            this.row(new MethodWidget(methods_in_pack, this.edit_handler))
        }
    } else {
        if (this.clue.spot) {
            this.row(c().text("No methods for this spot."))
        } else {
            this.row(c().text("No methods for this clue."))
        }
    }

    this.row(hbox(new LightButton("+ New Method", "rectangle").onClick(() => {
        this.edit_handler({
            clue: this.clue.clue,
            pack: null,
            method: SolvingMethods.init(this.clue)
        })
    })).addClass("ctr-button-container"))

     */

    return this
  }

  rendered(): Promise<this> {
    return this.render_promise
  }
}

export namespace ClueProperties {

  import notification = Notification.notification;
  import Method = SolvingMethods.Method;
  import SubMenu = MenuEntry.SubMenu;

  export function header(clue: Clues.ClueSpot) {
    return hbox(
      span(`${ClueType.meta(clue.clue.tier).name} ${ClueType.meta(clue.clue.type).name} Step (Id ${clue.clue.id})`).css("font-weight", "bold"),
      spacer().css("min-width", "20px"),
      c(`<img class="icon" src='${clue.clue.tier ? ClueType.meta(clue.clue.tier).icon_url : ""}' title="${ClueType.pretty(clue.clue.tier)}" style="margin-right: 3px">`),
      c(`<img class="icon" src='${Constants.icons.types[clue.clue.type]}' title="${ClueType.pretty(clue.clue.type)}">`)
    )
  }

  export async function methodMenu(clue: Clues.ClueSpot,
                                   edit_handler: (_: AugmentedMethod) => any,
  ): Promise<Menu> {
    const ms = await MethodPackManager.instance().get(clue)

    const favourite = await Dependencies.instance().app.favourites.getMethod(ClueSpot.toId(clue))

    return {
      type: "submenu",
      text: "",
      children: [
        {
          type: "basic",
          text: "New Method",
          handler: async () => {
            const m = await new NewMethodModal(clue).do()

            if (m?.created) {
              edit_handler(m.created)
            }
          }
        },
        ...(await Promise.all(ms.map(async (m) => await methodSubMenu(m, edit_handler))))

      ]
    }
  }

  export async function methodSubMenu(m: AugmentedMethod, edit_handler: (_: AugmentedMethod) => any): Promise<SubMenu> {
    const favourite = await Dependencies.instance().app.favourites.getMethod(ClueSpot.toId(m.clue))

    const isFavourite = AugmentedMethod.isSame(favourite, m)

    const men: MenuEntry.SubMenu = {
      type: "submenu",
      text: m.method.name,
      icon: () => new FavouriteIcon().set(isFavourite),
      children: [
        {
          type: "basic",
          text: isFavourite ? "Unset Favourite" : "Make Favourite",
          icon: () => new FavouriteIcon().set(isFavourite),
          handler: () => {
            Dependencies.instance().app.favourites.setMethod(ClueSpot.toId(m.clue), isFavourite ? null : m)
          }
        },
      ]
    }

    if (Pack.isEditable(m.pack)) {
      men.children.push({
        type: "basic",
        text: "Edit",
        icon: "assets/icons/edit.png",
        handler: () => edit_handler(m)
      })

      men.children.push({
        type: "basic",
        text: "Edit Metadata",
        icon: "assets/icons/edit.png",
        handler: async () => {

          const result = await new EditMethodMetaModal(m.clue,
            Method.meta(m.method), false
          ).do()

          if (result?.result) {
            Method.setMeta(m.method, result.result)

            MethodPackManager.instance().updateMethod(m)
          }
        }
      })
    }

    men.children.push(
      {
        type: "basic",
        icon: "assets/icons/copy.png",
        text: "Edit Copy",
        handler: async () => {
          const new_method = await new NewMethodModal(m.clue, m).do()

          if (new_method?.created) {
            edit_handler(new_method.created)
          }
        }
      })

    if (m.pack.type == "local") {
      men.children.push({
        type: "basic",
        text: "Delete",
        icon: "assets/icons/delete.png",
        handler: async () => {
          const really = await new ConfirmationModal<boolean>({
            body: "Are you sure you want to delete this method? There is no way to undo it!",
            options: [
              {kind: "neutral", text: "Cancel", value: false},
              {kind: "cancel", text: "Delete", value: true},
            ]
          }).do()

          if (really) {
            MethodPackManager.instance().deleteMethod(m)

            notification("Deleted").show()
          }
        }
      })
    }

    return men
  }

  export function render_challenge(challenge: Clues.Challenge) {
    switch (challenge.type) {
      case "wizard":
        return c(`<div><img src='assets/icons/cursor_attack.png' class="inline-img"> Wizard</div>`);
      case "slider":
        return c(`<div><img src='assets/icons/slider.png' class="inline-img"> Puzzle box</div>`);
      case "celticknot":
        return c(`<div><img src='assets/icons/celticknot.png' class="inline-img"> Celtic Knot</div>`);
      case "lockbox":
        return c(`<div><img src='assets/icons/lockbox.png' class="inline-img"> Lockbox</div>`);
      case "towers":
        return c(`<div><img src='assets/icons/towers.png' class="inline-img"> Towers Puzzle</div>`);
      case "challengescroll":
        return c(`<div><img src='assets/icons/cursor_talk.png' class="inline-img"> <span style="font-style: italic">${challenge.question}</span> (Answer: ${natural_join(challenge.answers.map(a => a.note ? `${a.answer} (${a.note}` : a.answer), "or")})</div>`);
    }
  }
}