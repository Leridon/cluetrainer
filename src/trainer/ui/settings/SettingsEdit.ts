import Widget from "../../../lib/ui/Widget";
import {Application} from "../../application";
import {NisModal} from "../../../lib/ui/NisModal";
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
import {ClueTier, ClueType} from "../../../lib/runescape/clues";
import ButtonRow from "../../../lib/ui/ButtonRow";
import {ConfirmationModal} from "../widgets/modals/ConfirmationModal";
import {FormModal} from "../../../lib/ui/controls/FormModal";
import TextField from "../../../lib/ui/controls/TextField";
import {NeoSolving} from "../neosolving/NeoSolvingBehaviour";
import NumberSlider from "../../../lib/ui/controls/NumberSlider";
import {ColorPicker} from "../../../lib/ui/controls/ColorPicker";
import {util} from "../../../lib/util/util";
import {SlideGuider} from "../neosolving/SlideGuider";
import {CrowdSourcing} from "../../CrowdSourcing";
import cls = C.cls;
import PotaColor = Settings.PotaColor;
import hbox = C.hbox;
import vbox = C.vbox;
import inlineimg = C.inlineimg;
import hgrid = C.hgrid;
import hboxl = C.hboxl;
import centered = C.centered;
import A1Color = util.A1Color;

class SectionControl extends Widget {
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

  constructor(private sections: SectionControl.Section[]) {
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

  export type Entry = {
    id: string,
    name: string,
    short_name?: string,
    renderer: () => Widget
  }

  export type Section = {
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

    this.layout.paragraph("Save your owned passages of the abyss.")

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

  constructor(private value: NeoSolving.Settings.Puzzles) {
    super()

    this.layout = new Properties().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.header("Slider Puzzles")

    this.layout.named("Mode", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Mouse"), value: "mouse" as const},
        {button: new Checkbox("Keyboard"), value: "keyboard" as const},
        {button: new Checkbox("Hybrid"), value: "hybrid" as const},
      ]).onChange(v => this.value.sliders.mode = v)
        .setValue(this.value.sliders.mode)
        .checkboxes()
    ))

    this.layout.header(new Checkbox("Start solving automatically")
        .onCommit(v => this.value.sliders.autostart = v)
        .setValue(this.value.sliders.autostart)
      , "left", 1)

    this.layout.header("Lookahead", "left", 1)
    this.layout.paragraph("Determines how many moves are shown in advance.")
    this.layout.row(new NumberSlider(2, 10, 1)
      .setValue(this.value.sliders.max_lookahead)
      .onCommit(v => this.value.sliders.max_lookahead = v)
    )

    this.layout.header(new Checkbox("Prevent Overlap")
      .onCommit(v => this.value.sliders.prevent_overlap = v)
      .setValue(this.value.sliders.prevent_overlap), "left", 1)
    this.layout.paragraph("When enabled, prevents moves that overlap with other moves from being displayed.")

    this.layout.header(new Checkbox("Show Recovery Moves")
      .onCommit(v => this.value.sliders.display_recovery = v)
      .setValue(this.value.sliders.display_recovery), "left", 1)
    this.layout.paragraph("When enabled, mistakes are automatically detected and recovery moves are displayed.")


    const color_mainline_move = new ColorPicker()
      .setValue(A1Color.toHex(this.value.sliders.color_mainline_move))
      .onCommit(v => this.value.sliders.color_mainline_move = A1Color.fromHex(v))
    const color_recovery_move = new ColorPicker()
      .setValue(A1Color.toHex(this.value.sliders.color_recovery_move))
      .onCommit(v => this.value.sliders.color_recovery_move = A1Color.fromHex(v))
    const color_mainline_line = new ColorPicker()
      .setValue(A1Color.toHex(this.value.sliders.color_mainline_line))
      .onCommit(v => this.value.sliders.color_mainline_line = A1Color.fromHex(v))
    const color_recovery_line = new ColorPicker()
      .setValue(A1Color.toHex(this.value.sliders.color_recovery_line))
      .onCommit(v => this.value.sliders.color_recovery_line = A1Color.fromHex(v))

    this.layout.named("Colors", hgrid(centered("Main Line"), centered("Recovery")))
    this.layout.named("Moves", hgrid(color_mainline_move, color_recovery_move))
    this.layout.named("Lines", hgrid(color_mainline_line, color_recovery_line))

    this.layout.named("", new LightButton("Reset to default")
      .onClick(() => {
        this.value.sliders.color_mainline_move = SlideGuider.Settings.DEFAULT.color_mainline_move
        this.value.sliders.color_mainline_line = SlideGuider.Settings.DEFAULT.color_mainline_line
        this.value.sliders.color_recovery_move = SlideGuider.Settings.DEFAULT.color_recovery_move
        this.value.sliders.color_recovery_line = SlideGuider.Settings.DEFAULT.color_recovery_line

        this.render()
      })
    )

    this.layout.header("Solve Time", "left", 1)
    this.layout.paragraph("How much time the solver should spend finding an optimal solution before the guide starts.")
    this.layout.row(new NumberSlider(0.5, 5, 0.1)
      .withPreviewFunction(v => `${v.toFixed(1)}s`)
      .setValue(this.value.sliders.solve_time_ms / 1000)
      .onCommit(v => this.value.sliders.solve_time_ms = v * 1000)
    )

    this.layout.header(new Checkbox("Estimate Slider Speed")
      .onCommit(v => this.value.sliders.estimate_slider_speed = v)
      .setValue(this.value.sliders.estimate_slider_speed), "left", 1)
    this.layout.paragraph("Show an estimate for your equivalent slider speed in Alt1's builtin clue solver after finishing a slider. Takes the faster animation of multi-tile moves in the builtin solver into account.")

    this.layout.header(new Checkbox("Improve screen reader with backtracking (Experimental)")
      .onCommit(v => this.value.sliders.estimate_slider_speed = v)
      .setValue(this.value.sliders.estimate_slider_speed), "left", 1)
    this.layout.paragraph("Currently experimental. When activated, tries to improve the match read from screen by doing a second search with a bounded backtracking algorithm.")
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

    this.layout.header("Clue Information in UI")

    this.layout.paragraph("Choose what data about a clue step and its solution is displayed on the UI while solving.")

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

export class SettingsEdit extends Widget {
  value: Settings.Settings

  constructor(app: Application, start_section: string) {
    super();

    this.value = lodash.cloneDeep(app.settings.settings)

    new SectionControl([
      {
        name: "Solving", entries: [{
          id: "info_panels",
          name: "Clue Info Customization",
          short_name: "Clue Info",
          renderer: () => new SolvingSettingsEdit(this.value.solving.info_panel)
        }, {
          id: "puzzles",
          name: "Puzzle Solving",
          short_name: "Puzzles",
          renderer: () => new PuzzleSettingsEdit(this.value.solving.puzzles)
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

export class SettingsModal extends NisModal {
  edit: SettingsEdit

  constructor(private start_section: string = undefined) {
    super();

    this.title.set("Settings")

    this.hidden.on(() => {
      deps().app.settings.set(this.edit.value)
    })
  }

  render() {
    super.render()

    this.body.css("padding", "0")

    this.body.append(this.edit = new SettingsEdit(deps().app, this.start_section))
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Save and Exit", "confirm")
        .onClick(() => this.remove())
        .css("min-width", "150px")
    ]
  }
}