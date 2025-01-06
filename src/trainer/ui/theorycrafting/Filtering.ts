import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import ControlWithHeader from "../map/ControlWithHeader";
import {storage} from "../../../lib/util/storage";
import {ewent, Observable, observe} from "../../../lib/reactive";
import {ClueSpotIndex} from "../../../lib/runescape/clues/ClueIndex";
import Widget from "../../../lib/ui/Widget";
import {clue_data} from "../../../data/clues";
import {AugmentedMethod, MethodPackManager, Pack} from "../../model/MethodPackManager";
import Properties from "../widgets/Properties";
import {Clues, ClueTier, ClueType} from "../../../lib/runescape/clues";
import {SmallImageButton, SmallImageToggleButton} from "../widgets/SmallImageButton";
import {DropdownSelection} from "../widgets/DropdownSelection";
import * as lodash from "lodash";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import TextField from "../../../lib/ui/controls/TextField";
import {C} from "../../../lib/ui/constructors";
import {ClueProperties} from "./ClueProperties";
import {GameMap} from "../../../lib/gamemap/GameMap";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import {ClueOverviewMarker} from "./OverviewMarker";
import * as fuzzysort from "fuzzysort";
import ContextMenu from "../widgets/ContextMenu";
import sitog = SmallImageButton.sitog;
import hbox = C.hbox;
import spacer = C.spacer;
import span = C.span;
import vbox = C.vbox;
import ClueSpot = Clues.ClueSpot;

export type ClueSpotFilter = {
  tiers?: { [P in ClueTier]: boolean },
  types?: { [P in ClueType]: boolean },
  method_pack?: string,
  method_mode?: "none" | "at_least_one" | null,
  search_term?: string
}

export namespace ClueSpotFilter {
  import ClueSpot = Clues.ClueSpot;

  export function normalize(f: ClueSpotFilter): ClueSpotFilter {
    if (!f.types) {
      f.types = {
        simple: true,
        anagram: true,
        compass: true,
        coordinates: true,
        cryptic: true,
        emote: true,
        map: true,
        scan: true,
        skilling: true
      }
    }

    if (!f.tiers) {
      f.tiers = {
        easy: true,
        elite: true,
        hard: true,
        master: true,
        medium: true,
        tetracompass: true,
        sandy: true
      }
    }

    return f
  }

  export async function apply(f: ClueSpotFilter, clue: ClueSpot, methods?: MethodPackManager, prepared?: Fuzzysort.Prepared): Promise<boolean> {
    if (!(f.types[clue.clue.type] && f.tiers[clue.clue.tier])) return false

    if (methods && f.method_mode) {
      let ms = await methods.getForClue(ClueSpot.toId(clue), f.method_pack ? [f.method_pack] : undefined)

      switch (f.method_mode) {
        case "none":
          if (ms.length > 0) return false
          break
        case "at_least_one":
          if (ms.length <= 0) return false
          break
      }
    }

    if (f.search_term) {
      if (!prepared) return false

      let match = fuzzysort.single(f.search_term, prepared)

      if (!match || match.score < -500) return false
    }

    return true
  }

  export function filter_string(clue: ClueSpot): string {
    switch (clue.clue.type) {
      case "compass":
        return null
      default:
        return clue.clue.text[0]

    }

    return null
  }
}

class ClueSpotFilterResult extends Widget {
  //props: ClueProperties
  summary: Widget

  constructor(private spot: ClueSpot,
              private methods: MethodPackManager,
              private edit_handler: (_: AugmentedMethod) => any,
              private map?: GameMap
  ) {
    super();

    this.addClass("ctr-filtered-clue-result")

    this.addTippy(() => {
      let self = this

      return (new ClueProperties(
        this.spot,
        self.edit_handler,
        true,
        undefined,
        false
      )).row(c().text("Right click to manage methods.").css("font-style", "italic"))
    })

    this.append(hbox(
      vbox(
        this.summary = c().text(ClueSpot.shortString(spot)).addClass("ctr-filtered-clue-result-summary").on("click", () => {
          if (this.map) {
            this.map.fitView(TileRectangle.from(ClueOverviewMarker.position(spot)), {
              maxZoom: 4
            })
          }
        }).tooltip("Click to center on spot."),
      ).css2({
        "overflow": "hidden"
      }),
      spacer(),
      c().setInnerHtml("&#x22EE;")
        .addClass("ctr-path-edit-overview-step-options")
        .addClass("ctr-clickable")
        .on("click", async (event) => {
          new ContextMenu(await ClueProperties.methodMenu(this.spot, this.edit_handler)).showFromEvent(event)
        })
    ))

    this.on("contextmenu", async (event) => {
      event.preventDefault()
      new ContextMenu(await ClueProperties.methodMenu(this.spot, this.edit_handler)).showFromEvent(event)
    })

    //this.append(this.props)
  }
}

export class FilterControl extends GameMapControl<ControlWithHeader> {
  private stored_filter = new storage.Variable<ClueSpotFilter>("preferences/cluefilters2", () => ClueSpotFilter.normalize({}))
  public filter: Observable<ClueSpotFilter> = observe({})
  public filtered_index_updated = ewent()

  public index: ClueSpotIndex<{
    visible: boolean,
    list_widget: Widget,
    prepared_search_string: Fuzzysort.Prepared
  }> =
    clue_data.spot_index.with(() => ({visible: false, list_widget: null, prepared_search_string: null}))

  private count_line: Widget
  private result_container: Widget

  constructor(
    private methods: MethodPackManager,
    private edit_handler: (_: AugmentedMethod) => any
  ) {
    super({
      type: "floating",
      position: "top-right"
    }, new ControlWithHeader("Clue Filter").css2({"max-width": "300px", "width": "300px"}))

    this.index.forEach(e => {
      let s = ClueSpotFilter.filter_string(e.for)

      e.prepared_search_string = s ? fuzzysort.prepare(s) : null
    })

    this.filter.set(ClueSpotFilter.normalize(this.stored_filter.get()))
    this.filter.subscribe(f => {
      this.stored_filter.set(f)
    })

    this.renderFilter()

    this.filter.subscribe(async () => {
      await this.refreshFilterIndex()
    }, true)
  }

  public async refreshFilterIndex() {
    await Promise.all(this.index.flat().map(async e => {
      e.visible = await ClueSpotFilter.apply(this.filter.value(), e.for, this.methods, e.prepared_search_string)
    }))

    this.filtered_index_updated.trigger(undefined)

    this.renderResults()
  }

  private async renderFilter(): Promise<void> {
    this.count_line = c()

    this.result_container = c()
      .css2({
        "max-height": "60vh",
        "overflow-y": "scroll"
      })

    this.content.body.css2({
      "display": "flex",
      "flex-direction": "column"
    })

    let props = new Properties().appendTo(this.content.body)
    // TODO: Also filter for challenge types

    let buttons: {
      tier: { tier: ClueTier, btn: SmallImageToggleButton }[],
      type: { type: ClueType, btn: SmallImageToggleButton }[],
    } = {
      tier: ClueTier.values.map(t => {
        return {
          tier: t, btn: sitog(ClueType.meta(t).icon_url, (v) => this.filter.update(f => f.tiers[t] = v))
            .setState(this.filter.value().tiers[t])
            .tooltip(ClueType.meta(t).name)
        }
      }),
      type: ClueType.all.map(t => {
        return {
          type: t, btn: sitog(ClueType.meta(t).icon_url, (v) => this.filter.update(f => f.types[t] = v))
            .setState(this.filter.value().types[t])
            .tooltip(ClueType.meta(t).name)
        }
      })
    }

    props.named("Tier", hbox(...buttons.tier.map(s => s.btn), spacer()).addClass("ctr-filter-control-row"))
    props.named("Type", hbox(...buttons.type.map(s => s.btn), spacer()).addClass("ctr-filter-control-row"))

    if (this.methods) {
      const group = new Checkbox.Group<"none" | "at_least_one">([
        {value: "none", button: new Checkbox("None")},
        {value: "at_least_one", button: new Checkbox("At least one", "radio")},
      ], true).setValue(this.filter.value().method_mode)
        .onChange(v => this.filter.update(f => f.method_mode = v))

      const [none, at_least_one] = group.checkboxes()

      const specifics_container = hbox(none, spacer(), at_least_one)//new ButtonRow({max_center_spacer_width: "100%", align: "center"})

      const selection = new DropdownSelection({
          type_class: {
            toHTML(v: Pack): Widget {
              if (v) return span(`${lodash.capitalize(v.type)}: ${v.name}`)
              else return span("Any")
            }
          },
        },
        [null].concat(await this.methods.all())
      )
        .setItems(async () => [null].concat(await this.methods.all()))
        .setValue(this.filter.value().method_pack
          ? await this.methods.getPack(this.filter.value().method_pack)
          : null
        ).onSelection(s => {
          this.filter.update(f => f.method_pack = s?.local_id)
        }, true)

      props.named("Methods", specifics_container)
      props.named("In Pack", selection)
    }

    props.named("Search", new TextField().setPlaceholder("Search")
      .setValue(this.filter.value().search_term || "")
      .onChange(v => {
        this.filter.update(f => f.search_term = v.value)
      })
    )

    this.content.body.append(
      this.count_line,
      this.result_container
    )
  }

  async renderResults() {
    this.index.flat().forEach(e => {
      if (e.visible && !e.list_widget) {
        e.list_widget = new ClueSpotFilterResult(e.for,
          this.methods,
          this.edit_handler,
          this.getMap()
        ).appendTo(this.result_container)
      } else if (!e.visible && e.list_widget) {
        e.list_widget.remove()
        e.list_widget = null
      }
    })

    this?.count_line.text(`${this.index.flat().filter(e => e.visible).length} matches`)
  }
}