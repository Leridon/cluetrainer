import Widget from "../../../lib/ui/Widget";
import {Application} from "../../application";
import {deps} from "../../dependencies";
import {C} from "../../../lib/ui/constructors";
import {Observable, observe} from "../../../lib/reactive";
import {BigNisButton} from "../widgets/BigNisButton";
import Properties, {SlotLayout} from "../widgets/Properties";
import {FairyRingSelector, PotaJewellrySelector} from "./FairyRingSelector";
import {Settings} from "./Settings";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import * as lodash from "lodash";
import {DropdownSelection} from "../widgets/DropdownSelection";
import LightButton from "../widgets/LightButton";
import {Clues, ClueTier, ClueType} from "../../../lib/runescape/clues";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {FormModal} from "../../../lib/ui/controls/FormModal";
import TextField from "../../../lib/ui/controls/TextField";
import {NeoSolving} from "../neosolving/NeoSolvingBehaviour";
import NumberSlider from "../../../lib/ui/controls/NumberSlider";
import {ColorPicker} from "../../../lib/ui/controls/ColorPicker";
import {util} from "../../../lib/util/util";
import {SlideGuider} from "../neosolving/subbehaviours/SliderSolving";
import {CrowdSourcing} from "../../CrowdSourcing";
import {CompassSolving} from "../neosolving/subbehaviours/CompassSolving";
import {clue_data} from "../../../data/clues";
import {NislIcon} from "../nisl";
import {TransportData} from "../../../data/transports";
import {Transportation} from "../../../lib/runescape/transportation";
import {TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import {SearchSelection} from "../widgets/SearchSelection";
import {GameMapMiniWidget} from "../../../lib/gamemap/GameMap";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import {TeleportSpotEntity} from "../map/entities/TeleportSpotEntity";
import InteractionTopControl from "../map/InteractionTopControl";
import TransportLayer from "../map/TransportLayer";
import {KnotSolving} from "../neosolving/subbehaviours/KnotSolving";
import {LockboxSolving} from "../neosolving/subbehaviours/LockboxSolving";
import {TowersSolving} from "../neosolving/subbehaviours/TowersSolving";
import cls = C.cls;
import PotaColor = Settings.PotaColor;
import hbox = C.hbox;
import vbox = C.vbox;
import inlineimg = C.inlineimg;
import hgrid = C.hgrid;
import hboxl = C.hboxl;
import centered = C.centered;
import A1Color = util.A1Color;
import italic = C.italic;
import spacer = C.spacer;
import TeleportGroup = Transportation.TeleportGroup;
import span = C.span;
import greatestCommonDivisor = util.greatestCommonDivisor;

class SectionControl<id_type extends string = string> extends Widget {
  menu_bar: Widget
  content: Widget

  private entry_buttons: {
    original: {
      section: SectionControl.Section,
      entry: SectionControl.Entry
    },
    button: Widget
  }[] = []

  private active_entry: Observable<string> = observe(null)

  constructor(private sections: SectionControl.Section<id_type>[]) {
    super(cls("ctr-section-control"));

    this.active_entry.subscribe(active => {
      this.entry_buttons.forEach(e => {
        const isActive = active == e.original.entry.id

        e.button.toggleClass("active", isActive)

        if (isActive) {
          this.content.empty()

          this.content.append(
            C.cls("ctr-section-control-content-header")
              .css("padding-left", "0")
              .text(e.original.entry.name),
            e.original.entry.renderer()
          )
        }
      })
    })

    this.render()

    this.active_entry.set(sections[0].entries[0].id)
  }

  setActiveSection(id: string): this {
    if (id) {
      this.active_entry.set(id)
    }
    return this
  }

  private render() {
    this.empty()

    this.append(
      this.menu_bar = cls("ctr-section-control-menu"),
      this.content = cls("ctr-section-control-content")
    )

    for (const section of this.sections) {
      cls("ctr-section-control-menu-header")
        .text(section.name)
        .appendTo(this.menu_bar)

      for (const entry of section.entries) {
        const button = cls("ctr-section-control-menu-entry")
          .on("click", () => {
            this.active_entry.set(entry.id)
          })
          .text(entry.short_name ?? entry.name)
          .appendTo(this.menu_bar)

        this.entry_buttons.push({
          original: {section, entry},
          button: button
        })
      }
    }
  }
}

namespace SectionControl {

  export type Entry<id_type extends string = string> = {
    id: id_type,
    name: string,
    short_name?: string,
    renderer: () => Widget
  }

  export type Section<id_type extends string = string> = {
    name: string,
    entries: Entry[]
  }
}

class TeleportSettingsEdit extends Widget {
  private layout: Properties

  constructor(private value: Settings.TeleportSettings) {
    super();

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header("Owned Passages of the Abyss", "left")

    this.layout.paragraph("Save your owned passages of the abyss. You also need to select them in the loadout preset below for it to take effect.")

    for (let color of PotaColor.values) {
      const definition = this.value.potas.find(pota => pota.color == color)

      this.layout.row(new Checkbox(
          hboxl(inlineimg(PotaColor.iconUrl(color)), `${lodash.capitalize(color)} Passage of the Abyss`)
        )
          .setValue(!!definition)
          .onCommit(v => {
            if (v) {
              // Add definition
              this.value.potas.push({
                color: color,
                slots: [null, null, null, null, null, null]
              })
            } else {
              this.value.potas = this.value.potas.filter(pota => pota.color != color)
            }

            this.render()
          })
      )

      if (definition) {
        this.layout.row(
          new SlotLayout(definition.slots.map((e, i) => {
            return {
              name: (i + 1).toString(),
              content: new PotaJewellrySelector()
                .onSelection(e => {
                  definition.slots[i] = e ? {
                    group_id: e.group.id,
                    access_id: e.access.id
                  } : null
                })
                .set(definition.slots[i])
            }
          }), 2)
        )
      }
    }

    this.layout.divider()

    this.layout.header("Presets", "left")

    this.layout.paragraph("Setup presets to easily switch between.")

    const active_preset = this.value.presets.find(p => p.id == this.value.active_preset)

    this.layout.header("Active Preset", "center", 1)

    this.layout.row(
      new DropdownSelection<any>({
        type_class: {toHTML: e => e.name,}
      }, this.value.presets)
        .setValue(active_preset)
        .onSelection(e => {
          this.value.active_preset = e.id
          this.render()
        }),
    )

    this.layout.row(
      new ButtonRow()
        .buttons(
          new LightButton("New Preset")
            .onClick(() => {
              const next_id = Math.max(...this.value.presets.map(p => p.id)) + 1

              let name: string = null

              for (let name_index = 1; name_index < 100; name_index++) {
                const potential_name = `New Preset ${name_index}`

                const exists = this.value.presets.some(p => p.name == potential_name)

                if (!exists) {
                  name = potential_name
                  break
                }
              }

              if (name) {
                this.value.presets.push({
                  id: next_id,
                  name: name,
                  active_potas: [],
                  fairy_ring_favourites: new Array(10).fill(null),
                })

                this.value.active_preset = next_id

                this.render()
              }


            }),
          new LightButton("Delete")
            .setEnabled(!active_preset.fixed)
            .onClick(async () => {
              const really = await ConfirmationModal.simple("Are you sure?",
                  "Deleting a teleport customization preset can not be undone.",
                  "Cancel",
                  "Delete")
                .do()

              if (really) {
                this.value.presets = this.value.presets.filter(p => p != active_preset)

                this.value.active_preset = this.value.presets[0].id

                this.render()
              }
            }),
          new LightButton("Rename")
            .setEnabled(!active_preset.fixed)
            .onClick(async () => {

              const new_name = await (new class extends FormModal<string> {
                constructor() {
                  super();

                  this.title.set("Rename Teleport Preset")

                  this.shown.on(() => {
                    this.input.raw().focus()
                  })
                }

                input: TextField

                render() {
                  super.render();

                  new Properties().named("New Name",
                    this.input = new TextField()
                      .setValue(active_preset.name)
                  ).appendTo(this.body)
                }

                getButtons(): BigNisButton[] {
                  return [
                    new BigNisButton("Cancel", "neutral")
                      .onClick(() => this.cancel()),
                    new BigNisButton("Save", "confirm")
                      .onClick(() => this.confirm(this.input.get()))
                  ]
                }
              }).do()

              if (new_name) {
                active_preset.name = new_name
                this.render()
              }
            })
        )
    )

    const pota_checks = PotaColor.values.map(color =>
      new Checkbox(
        hboxl(inlineimg(PotaColor.iconUrl(color)), lodash.capitalize(color))
      )
        .setValue(active_preset.active_potas.includes(color))
        .onCommit(v => {
            if (v) {
              active_preset.active_potas.push(color)
            } else {
              active_preset.active_potas = active_preset.active_potas.filter(c => c != color)
            }
          }
        )
    )

    this.layout.named("POTAs",
      vbox(
        hgrid(pota_checks[0], pota_checks[1]),
        hgrid(pota_checks[2], pota_checks[3])
      )
    )

    this.layout.header("Fairy Ring Favourites", "left", 1)

    this.layout.row(new SlotLayout(active_preset.fairy_ring_favourites.map((e, i) => {
      return {
        name: ((i + 1) % 10).toString(),
        content: new FairyRingSelector()
          .set(e)
          .onSelection(s => {
            active_preset.fairy_ring_favourites[i] = s.id
          })
      }
    }), 2))


    this.layout.divider()

    this.layout.row(new Checkbox("Automatically switch preset based on clue tier")
      .setValue(this.value.preset_bindings_active)
      .onCommit(v => {
        this.value.preset_bindings_active = v
        this.render()
      })
    )

    if (this.value.preset_bindings_active) {

      for (let tier of ClueTier.values) {
        const current_binding_id = this.value.preset_bindings[tier]

        const current_binding = current_binding_id != null ? this.value.presets.find(p => p.id == current_binding_id) : null

        this.layout.named(ClueType.meta(tier).name, new DropdownSelection<any>({
            type_class: {
              toHTML: e => {
                if (e) return e.name
                else return "None"
              },
            }
          }, [null].concat(this.value.presets))
            .setValue(current_binding)
            .onSelection(e => {
              this.value.preset_bindings[tier] = e ? e.id : null
            })
        )
      }
    }

    this.layout.row(
      new LightButton(
        hbox("Reset to ",
          inlineimg("assets/icons/cluechasers.png"),
          " Clue Chasers recommendations"
        ),
        "rectangle"
      )
        .onClick(async () => {
          const really = await ConfirmationModal.simple(
            "Reset teleport setup",
            "This will reset your passage of the abyss setups and replace every custom preset except the default one. This can not be undone.",
            "Cancel",
            "Go ahead"
          ).do()

          if (really) {
            const clue_chasers = Settings.TeleportSettings.clueChasersRecommendations()

            this.value.potas = clue_chasers.potas
            this.value.presets = [...this.value.presets.filter(p => p.id >= 0), ...clue_chasers.presets.filter(p => p.id < 0)]
            this.value.active_preset = 0
            this.value.preset_bindings = clue_chasers.preset_bindings

            this.render()
          }
        })
    )
  }
}

class PuzzleSettingsEdit extends Widget {
  private layout: Properties

  constructor(private value: SlideGuider.Settings) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header("Slider Puzzles")

    this.layout.header(new Checkbox("Start solving automatically")
        .onCommit(v => this.value.autostart = v)
        .setValue(this.value.autostart)
      , "left", 1)

    this.layout.named("Mode", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Mouse"), value: "mouse" as const},
        {button: new Checkbox("Keyboard"), value: "keyboard" as const},
        {button: new Checkbox("Hybrid"), value: "hybrid" as const},
      ]).onChange(v => this.value.mode = v)
        .setValue(this.value.mode)
        .checkboxes()
    ))

    this.layout.header("Lookahead", "left", 1)
    this.layout.paragraph("Determines how many moves are shown in advance.")
    this.layout.row(new NumberSlider(2, 10, 1)
      .setValue(this.value.max_lookahead)
      .onCommit(v => this.value.max_lookahead = v)
    )

    this.layout.header(new Checkbox("Prevent Overlap")
      .onCommit(v => this.value.prevent_overlap = v)
      .setValue(this.value.prevent_overlap), "left", 1)
    this.layout.paragraph("When enabled, prevents moves that overlap with other moves from being displayed.")

    this.layout.header(new Checkbox("Show Recovery Moves")
      .onCommit(v => this.value.display_recovery = v)
      .setValue(this.value.display_recovery), "left", 1)
    this.layout.paragraph("When enabled, mistakes are automatically detected and recovery moves are displayed.")


    const color_mainline_move = new ColorPicker()
      .setValue(A1Color.toHex(this.value.color_mainline_move))
      .onCommit(v => this.value.color_mainline_move = A1Color.fromHex(v))
    const color_recovery_move = new ColorPicker()
      .setValue(A1Color.toHex(this.value.color_recovery_move))
      .onCommit(v => this.value.color_recovery_move = A1Color.fromHex(v))
    const color_mainline_line = new ColorPicker()
      .setValue(A1Color.toHex(this.value.color_mainline_line))
      .onCommit(v => this.value.color_mainline_line = A1Color.fromHex(v))
    const color_recovery_line = new ColorPicker()
      .setValue(A1Color.toHex(this.value.color_recovery_line))
      .onCommit(v => this.value.color_recovery_line = A1Color.fromHex(v))

    this.layout.named("Colors", hgrid(centered("Main Line"), centered("Recovery")))
    this.layout.named("Moves", hgrid(color_mainline_move, color_recovery_move))
    this.layout.named("Lines", hgrid(color_mainline_line, color_recovery_line))

    this.layout.named("", new LightButton("Reset to default")
      .onClick(() => {
        this.value.color_mainline_move = SlideGuider.Settings.DEFAULT.color_mainline_move
        this.value.color_mainline_line = SlideGuider.Settings.DEFAULT.color_mainline_line
        this.value.color_recovery_move = SlideGuider.Settings.DEFAULT.color_recovery_move
        this.value.color_recovery_line = SlideGuider.Settings.DEFAULT.color_recovery_line

        this.render()
      })
    )

    this.layout.header("Solve Time", "left", 1)
    this.layout.paragraph("How much time the solver should spend finding an optimal solution before the guide starts.")
    this.layout.row(new NumberSlider(0.5, 5, 0.1)
      .withPreviewFunction(v => `${v.toFixed(1)}s`)
      .setValue(this.value.solve_time_ms / 1000)
      .onCommit(v => this.value.solve_time_ms = v * 1000)
    )

    this.layout.header(new Checkbox("Estimate Slider Speed")
      .onCommit(v => this.value.estimate_slider_speed = v)
      .setValue(this.value.estimate_slider_speed), "left", 1)
    this.layout.paragraph("Show an estimate for your equivalent slider speed in Alt1's builtin clue solver after finishing a slider. Takes the faster animation of multi-tile moves in the builtin solver into account.")

    this.layout.header(new Checkbox("Improve screen reader with backtracking (Experimental)")
      .onCommit(v => this.value.estimate_slider_speed = v)
      .setValue(this.value.estimate_slider_speed), "left", 1)
    this.layout.paragraph("Currently experimental. When activated, tries to improve the match read from screen by doing a second search with a bounded backtracking algorithm.")

    this.layout.header(new Checkbox("Continuous solving (Experimental)")
      .onCommit(v => this.value.continue_solving_after_initial_solve = v)
      .setValue(this.value.continue_solving_after_initial_solve), "left", 1)
    this.layout.paragraph("When active, the puzzle solver will continue to look for shorter solutions while completing a puzzle to reduce the number of required moves. Currently experimental, disable if you notice issues.")
  }
}

class KnotSettingsEdit extends Widget {
  private layout: Properties

  constructor(private value: KnotSolving.Settings) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header("Celtic Knot Puzzles")

    this.layout.header(new Checkbox("Start solving and show overlay automatically")
        .onCommit(v => this.value.autostart = v)
        .setValue(this.value.autostart)
      , "left", 1)

    this.layout.paragraph("Disable this if you are simultaneously using Alt1's builtin clue solver and the knot solutions are overlapping.")
  }
}

class LockboxSettingsEdit extends Widget {
  private layout: Properties

  constructor(private value: LockboxSolving.Settings) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header("Lockbox Puzzles")

    this.layout.header(new Checkbox("Start solving and show overlay automatically")
        .onCommit(v => this.value.autostart = v)
        .setValue(this.value.autostart)
      , "left", 1)

    this.layout.paragraph("Disable this if you are simultaneously using Alt1's builtin clue solver and the lockbox solutions are overlapping.")

    this.layout.named("Overlay Color", new ColorPicker()
      .setValue(A1Color.toHex(this.value.overlay_color))
      .onCommit(v => this.value.overlay_color = A1Color.fromHex(v)))

    this.layout.header("Optimization Mode")

    this.layout.paragraph("Control how to optimize the solution. The configured value determines how much a 2-click tile is weighted compared to a 1-click tile. A value of '2' will optimize for the lowest total amount of clicks. A value of '1' will optimize for the lowest number of unique tiles that need to be clicked. Setting this to 1.3 is a good compromise for most people.")

    this.layout.row(new NumberSlider(1, 2, 0.1)
      .setValue(this.value.two_click_factor)
      .onCommit(v => {
        this.value.two_click_factor = v
        update_settings_description()
      })
    )


    const setting_description = c()

    const update_settings_description = () => {
      if (this.value.two_click_factor == 2) {
        setting_description.text(`A value of ${this.value.two_click_factor.toFixed(1)} will optimize for the lowest number of total clicks.`)

      } else if (this.value.two_click_factor == 1) {
        setting_description.text(`A value of ${this.value.two_click_factor.toFixed(1)} will optimize for the lowest number of unique clicked tiles.`)
      } else {
        let two_clicks = 10
        let one_clicks = Math.ceil(two_clicks * this.value.two_click_factor)

        const gcd = greatestCommonDivisor(two_clicks, one_clicks)

        two_clicks /= gcd
        one_clicks /= gcd

        setting_description.text(`A value of ${this.value.two_click_factor.toFixed(1)} will treat ${two_clicks} two-click tiles the same as ${one_clicks} one-click tiles.`)
      }
    }

    update_settings_description()

    this.layout.paragraph(setting_description)
  }
}

class TowersSettingsEdit extends Widget {
  private layout: Properties

  constructor(private value: TowersSolving.Settings) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header("Towers Puzzles")

    this.layout.header(new Checkbox("Start solving and show overlay automatically")
        .onCommit(v => this.value.autostart = v)
        .setValue(this.value.autostart)
      , "left", 1)

    this.layout.paragraph("Disable this if you are simultaneously using Alt1's builtin clue solver and the towers solutions are overlapping.")

    this.layout.header("Overlay Mode", "left", 1)

    this.layout.row(hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Target"), value: "target" as const},
        {button: new Checkbox("Delta"), value: "delta" as const},
        {button: new Checkbox("Both"), value: "both" as const},
      ]).onChange(v => this.value.solution_mode = v)
        .setValue(this.value.solution_mode)
        .checkboxes()
    ))

    this.layout.paragraph("'Target' will show the correct number on the overlay. 'Delta' will show the number of clicks required from the current value. 'Both' will display both.")

    this.layout.header(new Checkbox("Show green border for correct tiles")
        .onCommit(v => this.value.show_correct = v)
        .setValue(this.value.show_correct)
      , "left", 1)

    this.layout.header(new Checkbox("Show red border for overshot tiles")
        .onCommit(v => this.value.show_overshot = v)
        .setValue(this.value.show_overshot)
      , "left", 1)
  }
}

class SolvingSettingsEdit extends Widget {

  private layout: Properties

  constructor(private value: NeoSolving.Settings.InfoPanel) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.paragraph("Choose what data about a clue step and its solution is displayed on the interface while solving.")

    this.layout.named("Clue Text", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Full"), value: "full" as const},
        {button: new Checkbox("Abridged"), value: "abridged" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.clue_text = v)
        .setValue(this.value.clue_text)
        .checkboxes()
    ))

    this.layout.named("Clue Map", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.map_image = v)
        .setValue(this.value.map_image)
        .checkboxes()
    ))

    this.layout.named("Dig Target", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.dig_target = v)
        .setValue(this.value.dig_target)
        .checkboxes()
    ))

    this.layout.named("Talk Target", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.talk_target = v)
        .setValue(this.value.talk_target)
        .checkboxes()
    ))

    this.layout.named("Search Target", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.search_target = v)
        .setValue(this.value.search_target)
        .checkboxes()
    ))

    this.layout.named("Search Key", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.search_key = v)
        .setValue(this.value.search_key)
        .checkboxes()
    ))

    this.layout.named("Hidey Hole", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.hidey_hole = v)
        .setValue(this.value.hidey_hole)
        .checkboxes()
    ))

    this.layout.named("Emote Items", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.emote_items = v)
        .setValue(this.value.emote_items)
        .checkboxes()
    ))


    this.layout.named("Emote(s)", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.emotes = v)
        .setValue(this.value.emotes)
        .checkboxes()
    ))

    this.layout.named("Double Agent", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.double_agent = v)
        .setValue(this.value.double_agent)
        .checkboxes()
    ))

    this.layout.named("Pathing", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.path_components = v)
        .setValue(this.value.path_components)
        .checkboxes()
    ))

    this.layout.named("Puzzles", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.puzzle = v)
        .setValue(this.value.puzzle)
        .checkboxes()
    ))

    this.layout.named("Challenge", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Full"), value: "full" as const},
        {button: new Checkbox("Answer"), value: "answer_only" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.challenge = v)
        .setValue(this.value.challenge)
        .checkboxes()
    ))

    this.layout.named("Presets",
      new LightButton("Everything")
        .onClick(() => {
          Object.assign(this.value, lodash.cloneDeep(NeoSolving.Settings.InfoPanel.EVERYTHING))

          this.render()
        }))

    this.layout.named("",
      new LightButton("Reduced (Recommended)")
        .onClick(() => {
          Object.assign(this.value, lodash.cloneDeep(NeoSolving.Settings.InfoPanel.REDUCED))

          this.render()
        }))

    this.layout.named("",
      new LightButton("Nothing")
        .onClick(() => {
          Object.assign(this.value, lodash.cloneDeep(NeoSolving.Settings.InfoPanel.NOTHING))

          this.render()
        }))


    this.layout.divider()

    /*
    this.layout.header("Informative Entities on Map")

    this.layout.paragraph("Choose which components of a clue step are displayed as interactive elements on the map while solving.")
    
     */
  }
}

class CrowdSourcingSettingsEdit extends Widget {

  private layout: Properties

  constructor(private value: CrowdSourcing.Settings) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {

    this.layout.paragraph("Here you can configure your participation in active crowdsourcing projects. Data is recorded without any personal data and no data beyond what is described here is collected.")

    this.layout.header(new Checkbox("Initial Slider States")
      .onCommit(v => this.value.slider_states = v)
      .setValue(this.value.slider_states), "left", 1)
    this.layout.paragraph("Record the initial order of tiles for puzzle boxes. For every puzzle box encountered while auto-solving is active, the initial state will be recorded.")

  }
}

class CompassSettingsEdit extends Widget {

  private layout: Properties
  private active_preset: CompassSolving.TriangulationPreset | null = null

  constructor(private value: CompassSolving.Settings) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header(new Checkbox("Automatically commit angle on teleport")
      .onCommit(v => this.value.auto_commit_on_angle_change = v)
      .setValue(this.value.auto_commit_on_angle_change), "left", 1)
    this.layout.paragraph("When active, the next triangulation line is automatically drawn when the compass angle changes by more than 10° at once. This is the default behaviour in Alt1's built-in clue solver.")

    this.layout.header(new Checkbox("Show status overlay")
      .onCommit(v => this.value.enable_status_overlay = v)
      .setValue(this.value.enable_status_overlay), "left", 1)
    this.layout.paragraph("Shows detected angle on top of the compass.")

    this.layout.header("Preconfigured Triangulation Strategy")

    this.layout.paragraph("Preconfigured strategies are used to automatically load trinagulation spots whenever you receive a compass clue.")

    for (const compass of clue_data.compass) {
      let binding = this.value.active_triangulation_presets.find(p => p.compass_id == compass.id)

      if (!binding) {
        this.value.active_triangulation_presets.push(binding = {
          compass_id: compass.id,
          preset_id: null
        })
      }

      const candidate_presets = [
        ...this.value.custom_triangulation_presets,
        ...CompassSolving.TriangulationPreset.builtin
      ].filter(p => p.compass_id == compass.id)

      const preset_selector = new DropdownSelection<CompassSolving.TriangulationPreset>({
        type_class: {
          toHTML: (v: CompassSolving.TriangulationPreset) => {
            if (v) return hboxl(...deps().app.template_resolver.resolve(v.name))
            else return italic("None")
          }
        }
      }, [...candidate_presets, null])
        .setValue(candidate_presets.find(p => p.id == binding.preset_id))
        .onSelection(v => {
          binding.preset_id = v ? v.id : null
        })

      this.layout.named(hboxl(inlineimg(ClueType.meta(compass.tier).icon_url), lodash.capitalize(compass.tier)), preset_selector)
    }

    this.layout.header("Custom Strategies")

    this.layout.paragraph("Create your own strategies.")

    type T = CompassSolving.TriangulationPreset | "create"

    const preset_selector = new DropdownSelection<T>({
      type_class: {
        toHTML: (v: T) => {
          if (v == "create") return "Create New"
          else if (v) return hboxl(...deps().app.template_resolver.resolve(v.name))
          else return "None selected"
        }
      }
    }, [...this.value.custom_triangulation_presets, "create"])
      .setValue(this.active_preset)
      .onSelection(v => {
        if (v == "create") {
          const id =
            this.value.custom_triangulation_presets.length == 0
              ? 1
              : Math.max(...this.value.custom_triangulation_presets.map(p => p.id)) + 1

          this.value.custom_triangulation_presets.push(this.active_preset = {
            compass_id: clue_data.gielinor_compass.id,
            name: `Custom Preset ${id}`,
            id: id,
            sequence: []
          })
        } else {
          this.active_preset = v
        }

        this.render()
      })
      .css("flex-grow", "1")

    this.layout.named("Preset", hbox(preset_selector,
        this.active_preset ? NislIcon.delete()
          .withClick(async () => {

            const really = await (new ConfirmationModal({
              title: "Delete preset",
              body: `Do you want to delete the preset '${this.active_preset.name}' preset? It cannot be undone.`,
              options: [
                {kind: "neutral", text: "Cancel", value: false, is_cancel: true},
                {kind: "cancel", text: "Delete", value: true},
              ]
            })).do()

            if (really) {
              this.value.custom_triangulation_presets = this.value.custom_triangulation_presets.filter(p => p != this.active_preset)
              this.active_preset = null
              this.render()
            }
          }) : undefined
      )
    )

    if (this.active_preset) {
      this.layout.named("Name", new TextField()
        .setValue(this.active_preset.name)
        .onCommit(v => {
          this.active_preset.name = v

          // Reset selector value to rerender name
          preset_selector.renderInput()
        })
      )

      const clue = clue_data.compass.find(c => c.id == this.active_preset.compass_id)

      this.layout.named("Tier", new DropdownSelection<Clues.Compass>({
          type_class: {
            toHTML: (v: Clues.Compass) => {
              return hboxl(inlineimg(ClueType.meta(v.tier).icon_url), lodash.capitalize(v.tier))
            }
          }
        }, clue_data.compass)
          .setValue(clue)
          .onSelection(v => {
            this.active_preset.compass_id = v.id
            this.render()
          })
      )


      const sequence = new Properties()

      this.layout.named("Sequence", sequence)

      if (this.active_preset.sequence.length == 0) {
        sequence.row("No triangulation points found.")
      } else {
        for (let i = 0; i < this.active_preset.sequence.length; i++) {
          const point = this.active_preset.sequence[i]

          sequence.header(
            hbox(
              spacer(),
              `Spot ${i + 1}`,
              spacer(),
              NislIcon.delete()
                .withClick(e => {
                  this.active_preset.sequence.splice(i, 1)
                  this.render()
                })
            ), "center", 1)

          type T = TeleportGroup.Spot | TileCoordinates

          const selector = new SearchSelection<T>({
            type_class: {
              toHTML: (v: T) => {
                if (v instanceof Transportation.TeleportGroup.Spot) {
                  return hboxl(hbox(inlineimg(`assets/icons/teleports/${v.image().url}`))
                      .css2({
                        "min-width": "20px",
                        "max-width": "20px",
                      })
                    , span(v.hover()))
                    .css2({
                      "white-space": "nowrap",
                      "overflow": "hidden",
                      "text-overflow": "ellipsis"
                    })
                } else {
                  return `${v.x} | ${v.y} | ${v.level}`
                }
              }
            },
            search_term: (t: Transportation.TeleportGroup.Spot) => t.hover()
          }, TransportData.getAllTeleportSpots())
            .onSelection((s: TeleportGroup.Spot) => {
              point.teleport = s.id()
            })
            .css("flex-grow", "1")

          if (point.teleport) {
            selector.setValue(TransportData.resolveTeleport(point.teleport))
          } else if (point.tile) {
            selector.setValue(point.tile)
          }

          sequence.row(
            hbox(selector,
              new LightButton(NislIcon.from("assets/icons/select.png"))
                .onClick(async () => {
                  const res = await (new class extends FormModal<T> {
                    map: GameMapMiniWidget

                    constructor() {
                      super();
                      this.shown.on(() => {
                        this.map.map.fitView(TileRectangle.extend(
                          TileRectangle.from(...clue.spots), 3), {maxZoom: 20})
                      })
                    }

                    render() {
                      super.render()

                      this.body.append(this.map = new GameMapMiniWidget()
                        .css("width", "100%")
                        .css("height", "400px")
                        .setInteraction((new class extends ValueInteraction<T> {
                            constructor() {
                              super();

                              this.add(new TransportLayer(true, {
                                transport_policy: "none",
                                teleport_policy: "target_only"
                              }))

                            }

                            eventClick(event: GameMapMouseEvent) {
                              event.onPre(() => {
                                if (event.active_entity instanceof TeleportSpotEntity) {
                                  this.commit(event.active_entity.teleport)
                                } else {
                                  this.commit(event.tile())
                                }
                              })
                            }
                          })
                            .attachTopControl(new InteractionTopControl()
                              .setContent(c().text("Click a teleport spot or any tile on the map to select it as a triangulation spot."))
                            )
                            .onCommit(v => this.confirm(v))
                        )
                      )
                    }

                    getButtons(): BigNisButton[] {
                      return [
                        new BigNisButton("Cancel", "neutral")
                          .onClick(() => this.cancel())
                      ]
                    }

                    protected getValueForCancel(): T {
                      return null
                    }
                  })
                    .do()

                  if (res) {
                    if (res instanceof TeleportGroup.Spot) point.teleport = res.id()
                    else point.tile = res

                    this.render()
                  }
                })
            )
          )
        }
      }

      sequence.row(new LightButton("+ Add another spot")
        .onClick(() => {
          this.active_preset.sequence.push({})
          this.render()
        })
      )
    }

    this.layout.header("Manual Tile Selection Inaccuracy", "left", 1)
    this.layout.paragraph("Choose how accurate your manual spot selection when you click the map should be assumed to be. 1 considers your selection to be precisely the tile you stand on, higher values leave more room for error. This does not apply to tiles selected as part of a preconfigured strategy.")
    this.layout.row(new NumberSlider(0, 10, 1)
      .setValue(this.value.manual_tile_inaccuracy)
      .onCommit(v => this.value.manual_tile_inaccuracy = v)
    )
  }
}

export class SettingsEdit extends Widget {
  value: Settings.Settings

  constructor(app: Application, start_section: string) {
    super();

    this.value = lodash.cloneDeep(app.settings.settings)

    new SectionControl<SettingsEdit.section_id>([
      {
        name: "Solving", entries: [{
          id: "info_panels",
          name: "Interface Customization",
          short_name: "Interface",
          renderer: () => new SolvingSettingsEdit(this.value.solving.info_panel)
        }, {
          id: "sliders",
          name: "Slider Puzzle Solving",
          short_name: "Sliders",
          renderer: () => new PuzzleSettingsEdit(this.value.solving.puzzles.sliders)
        }, {
          id: "knots",
          name: "Celtic Knot Solving",
          short_name: "Knots",
          renderer: () => new KnotSettingsEdit(this.value.solving.puzzles.knots)
        }, {
          id: "lockboxes",
          name: "Lockbox Solving",
          short_name: "Lockboxes",
          renderer: () => new LockboxSettingsEdit(this.value.solving.puzzles.lockboxes)
        }, {
          id: "towers",
          name: "Towers Solving",
          short_name: "Towers",
          renderer: () => new TowersSettingsEdit(this.value.solving.puzzles.towers)
        }, {
          id: "compass",
          name: "Compass Solving",
          short_name: "Compass",
          renderer: () => new CompassSettingsEdit(this.value.solving.compass)
        }
        ]
      }, {
        name: "Map", entries: [{
          id: "teleports",
          name: "Teleport Customization",
          short_name: "Teleports",
          renderer: () => new TeleportSettingsEdit(this.value.teleport_customization)
        }
        ]
      }, {
        name: "Advanced", entries: [{
          id: "crowdsourcing",
          name: "Crowdsourcing",
          short_name: "Crowdsourcing",
          renderer: () => new CrowdSourcingSettingsEdit(this.value.crowdsourcing)
        }
        ]
      },
    ])
      .setActiveSection(start_section)
      .appendTo(this)
  }
}

export namespace SettingsEdit {
  export type section_id = "info_panels" | "sliders" | "knots" | "lockboxes" | "towers" | "compass" | "teleports" | "crowdsourcing"
}

export class SettingsModal extends FormModal<{
  saved: boolean,
  value: Settings.Settings
}> {
  edit: SettingsEdit

  private last_saved_value: Settings.Settings = null

  constructor(private start_section: SettingsEdit.section_id = undefined) {
    super();

    this.title.set("Settings")
  }

  protected getValueForCancel(): { saved: boolean; value: Settings.Settings } {
    return {saved: !!this.last_saved_value, value: this.last_saved_value}
  }

  private save() {
    this.last_saved_value = lodash.cloneDeep(this.edit.value)
    deps().app.settings.set(this.last_saved_value)
  }

  render() {
    super.render()

    this.body.css("padding", "0")

    this.body.append(this.edit = new SettingsEdit(deps().app, this.start_section))
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel")
        .onClick(() => this.cancel()),
      new BigNisButton("Save", "confirm")
        .onClick(() => this.save()),
      new BigNisButton("Save and Close", "confirm")
        .onClick(() => {
          this.save()
          this.cancel()
        }),
    ]
  }
}