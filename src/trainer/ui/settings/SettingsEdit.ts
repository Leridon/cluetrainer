import Widget from "../../../lib/ui/Widget";
import {ClueTrainer} from "../../ClueTrainer";
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
import {ScanSolving} from "../neosolving/subbehaviours/scans/ScanSolving";
import {Alt1Color} from "../../../lib/alt1/Alt1Color";
import {ScanControlPrototype} from "../neosolving/subbehaviours/scans/ScanInputBehaviour";
import {Alt1} from "lib/alt1/Alt1";
import {ScanTree} from "lib/cluetheory/scans/ScanTree";
import {AugmentedMethod} from "../../model/MethodPackManager";
import {SolvingMethods} from "../../model/methods";
import {SectionControl} from "../widgets/SectionControl";
import cls = C.cls;
import PotaColor = Settings.PotaColor;
import hbox = C.hbox;
import vbox = C.vbox;
import inlineimg = C.inlineimg;
import hgrid = C.hgrid;
import hboxl = C.hboxl;
import centered = C.centered;
import italic = C.italic;
import spacer = C.spacer;
import TeleportGroup = Transportation.TeleportGroup;
import span = C.span;
import greatestCommonDivisor = util.greatestCommonDivisor;
import Appendable = C.Appendable;

class SettingsLayout extends Properties {
  constructor() {super();}

  private separator(): this {
    this.row(cls("nis-settings-edit-separator"))

    return this
  }

  setting(header: Appendable, explanation: Appendable = undefined): this {
    this.header(hboxl(header, SettingsLayout.info(explanation)), "left", 1)

    return this
  }

  section(name: string, explanation: Appendable = undefined) {
    if (this.container.children().length > 0) {
      this.separator()
    }

    this.header(hbox(name, SettingsLayout.info(explanation)))
  }

  namedSetting(
    name: Appendable,
    content: Appendable,
    explanation: Appendable = undefined
  ): this {
    return this.named(hboxl(name, SettingsLayout.info(explanation)), content)
  }
}

namespace SettingsLayout {

  export function info(explanation: Appendable): Widget {
    if (!explanation) return undefined

    return inlineimg("assets/icons/info_nis.png").css("height", "1em").addTippy(explanation)
  }
}

class TeleportSettingsEdit extends Widget {
  private layout: SettingsLayout

  constructor(private value: Settings.TeleportSettings) {
    super();

    this.layout = new SettingsLayout().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.section("Owned Passages of the Abyss")

    this.layout.paragraph("Setup your owned passages of the abyss. You also need to select them in the profile below for it to take effect.")

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

    this.layout.section("Profiles", "Setup profiles to easily switch between.")

    const active_preset = this.value.presets.find(p => p.id == this.value.active_preset)

    this.layout.setting("Active Profile", "Select the active profile to use and edit it.")

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
          new LightButton("New Profile")
            .onClick(() => {
              const next_id = Math.max(...this.value.presets.map(p => p.id)) + 1

              let name: string = null

              for (let name_index = 1; name_index < 100; name_index++) {
                const potential_name = `New Profile ${name_index}`

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

                  this.title.set("Rename Teleport Profile")

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

    this.layout.named("Passages",
      vbox(
        hgrid(pota_checks[0], pota_checks[1]),
        hgrid(pota_checks[2], pota_checks[3])
      )
    )

    this.layout.setting("Fairy Ring Favourites", "Enter your favourite fairy rings to see their hotkey instead of their code on the map.")

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
        )
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

class ScanSettingsEdit extends Widget {
  private layout: SettingsLayout

  constructor(private value: ScanSolving.Settings) {
    super()

    this.layout = new SettingsLayout().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.section("Minimap Scan Range Overlay", "The scan range overlay shows a square around the center of your minimap visualizing your current scan range. ")

    this.layout.row(new Checkbox("Show when using a scan tree")
      .onCommit(v => this.value.show_minimap_overlay_scantree = v)
      .setValue(this.value.show_minimap_overlay_scantree)
    )

    this.layout.row(new Checkbox("Show when not using a scan tree")
      .onCommit(v => this.value.show_minimap_overlay_simple = v)
      .setValue(this.value.show_minimap_overlay_simple)
    )

    this.layout.row(new Checkbox("Show Triple-Ping range")
      .onCommit(v => this.value.show_triple_ping = v)
      .setValue(this.value.show_triple_ping)
    )

    this.layout.row(new Checkbox("Show Double-Ping range")
      .onCommit(v => this.value.show_double_ping = v)
      .setValue(this.value.show_double_ping)
    )

    this.layout.setting("Minimap Overlay Scaling", "Choose how to scale the scan range overlay to fit your minimap zoom.")

    const automated_checkbox = new Checkbox("Automatic (Experimental)", "radio")
    const manual_checkbox = new Checkbox("Manual", "radio")
    const manual_slider = new NumberSlider(3, 30, 0.5)

    const group = new Checkbox.Group([
      {button: automated_checkbox, value: true},
      {button: manual_checkbox, value: false},
    ])
      .onChange(v => {
        this.value.minimap_overlay_automated_zoom_detection = v

        manual_slider.setEnabled(!v)
      })
      .setValue(this.value.minimap_overlay_automated_zoom_detection)

    this.layout.setting(automated_checkbox, "Tries to detect minimap zoom automatically. Has known issues in snowy areas and other edge cases causing the scale to behave inconsistently.")
    this.layout.setting(manual_checkbox, "Manually select a scaling.")

    this.layout.namedSetting("Scale", manual_slider
        .setEnabled(!this.value.minimap_overlay_automated_zoom_detection)
        .onCommit(v => this.value.minimap_overlay_zoom_manual_ppt = v)
        .setValue(this.value.minimap_overlay_zoom_manual_ppt),
      "Select the appropriate pixels per tile for your device and minimap zoom level. May require some experimentation to get right. For fully zoomed out minimaps, the value is around 4. Note that overlays sometimes undergo additional scaling by your operating system, so the actual visible pixels per tile may be higher than the value set here."
    )

    this.layout.section("Scan Tree Zoom Behaviour", "Set up how zoom should behave when using a scan tree.")

    this.layout.paragraph("Ensure the following things are visible when the map view moves:")

    this.layout.setting(new Checkbox("Spots within triple pulse range")
      .setValue(this.value.zoom_behaviour_include_triples)
      .onCommit(v => this.value.zoom_behaviour_include_triples = v)
    )
    this.layout.setting(new Checkbox("Spots within double pulse range")
      .setValue(this.value.zoom_behaviour_include_doubles)
      .onCommit(v => this.value.zoom_behaviour_include_doubles = v)
    )
    this.layout.setting(new Checkbox("Spots within single pulse range")
      .setValue(this.value.zoom_behaviour_include_singles)
      .onCommit(v => this.value.zoom_behaviour_include_singles = v)
    )

    this.layout.section("Input Control")

    this.layout.setting(new Checkbox("Select floor based on previous solution")
        .setValue(this.value.select_floor_based_on_previous_solution)
        .onCommit(v => this.value.select_floor_based_on_previous_solution = v),
      "When a scan tree is loaded for a scan whose dig spots are on multiple different levels (Dorgesh Khaan and Brimhaven Dungeon), and the scan tree starts with a floor distinction that can be done anywhere, the respective path is automatically chosen based on the location of the previous clue and whether the scan scroll suggests scanning another level. "
    )

    if (Alt1.exists()) {
      this.layout.setting(new Checkbox(hbox("Show interactive control overlay", spacer(), new LightButton("Configure")
          .onClick(async () => {
            const result = await new ScanInputOverlayConfigModal(this.value.input_control_configuration)
              .do()

            if (result) {
              this.value.input_control_configuration = result
            }
          }))
        ).setValue(this.value.input_control_enabled)
          .onCommit(v => this.value.input_control_enabled = v),
      )
    }
  }
}

class ScanInputOverlayConfigModal extends FormModal<ScanControlPrototype.Overlay.Config> {
  private value: Observable<ScanControlPrototype.Overlay.Config>

  private overlay: ScanControlPrototype.Overlay

  constructor(value: ScanControlPrototype.Overlay.Config) {
    super({size: "small"});

    this.setTitle("Interactive Scan Tree Overlay Configuration")

    this.value = observe(lodash.cloneDeep(value))
      .structuralEquality()
      .subscribe(change => {
        this.overlay.setConfig(change)
      })

    this.shown.on(() => {
      this.overlay = ScanControlPrototype.Overlay.getActive()

      if (!this.overlay) {
        this.lifetime_manager.bind(
          this.overlay = new ScanControlPrototype.Overlay(this.value.value())
        )

        this.overlay.node_selection.on(node => this.overlay.setNode(node))

        const example = AugmentedMethod.create(ScanInputOverlayConfigModal.example_method, null)

        const ex = ScanTree.Augmentation.synthesize_triple_nodes(ScanTree.Augmentation.basic_augmentation(example.method.tree, example.clue.clue as Clues.Scan))

        this.overlay.setScanPanelState({meerkats: true, triple: false, different_level: false})
        this.overlay.setNode(ex.root_node)

        this.overlay.start()
      }

      this.overlay.setConfig(this.value.value())
    })
  }

  render() {
    super.render();

    const layout = new SettingsLayout()

    layout.section("Position", "Relative to the top center of your screen")
    layout.namedSetting("X", new NumberSlider(-2000, 2000).setValue(this.value.value().position.x)
      .onChange(v => this.value.update(c => c.position.x = v.value))
    )
    layout.namedSetting("Y", new NumberSlider(0, 2000).setValue(this.value.value().position.y)
      .onChange(v => this.value.update(c => c.position.y = v.value))
    )

    layout.section("Size")
    layout.namedSetting("Width", new NumberSlider(160, 1000).setValue(this.value.value().size.x)
      .onChange(v => this.value.update(c => c.size.x = v.value))
    )
    layout.namedSetting("Height", new NumberSlider(100, 1000).setValue(this.value.value().size.y)
      .onChange(v => this.value.update(c => c.size.y = v.value))
    )

    layout.section("Other")
    layout.namedSetting("Spacing", new NumberSlider(1, 20).setValue(this.value.value().gutter)
      .onChange(v => this.value.update(c => c.gutter = v.value))
    )
    layout.setting(new Checkbox("Show help button").setValue(this.value.value().show_help_button)
      .onCommit(v => this.value.update(c => c.show_help_button = v)), "Shows the help button in the top right."
    )
    layout.setting(new Checkbox("Warn for meerkats").setValue(this.value.value().warn_for_meerkats)
      .onCommit(v => this.value.update(c => c.warn_for_meerkats = v)), "Show a warning when you don't have active meerkats for scan trees that require one."
    )
    layout.setting(new Checkbox("Force small back button").setValue(this.value.value().force_small_back_button)
      .onCommit(v => this.value.update(c => c.force_small_back_button = v)), "Forces the small version of the back button."
    )

    layout.appendTo(this.body)
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "cancel").onClick(() => this.cancel()),
      new BigNisButton("Confirm", "confirm").onClick(() => this.confirm(this.value.value())),
    ]
  }
}

namespace ScanInputOverlayConfigModal {
  export const example_method: SolvingMethods.ScanTreeMethod = {
    "id": "037949db-71ad-46d5-a038-d162003e92ae",
    "type": "scantree",
    "timestamp": 1737206928,
    "name": "",
    "description": "",
    "assumptions": {"meerkats_active": true},
    "for": {"clue": 365},
    "tree": {
      "assumed_range": 21,
      "ordered_spots": [{"x": 2747, "y": 5263, "level": 0}, {"x": 2731, "y": 5266, "level": 0}, {"x": 2740, "y": 5273, "level": 0}, {"x": 2723, "y": 5279, "level": 0}, {
        "x": 2711,
        "y": 5271,
        "level": 0
      }, {"x": 2729, "y": 5295, "level": 0}, {"x": 2711, "y": 5284, "level": 0}, {"x": 2730, "y": 5315, "level": 0}, {"x": 2717, "y": 5311, "level": 0}, {
        "x": 2739,
        "y": 5253,
        "level": 1
      }, {"x": 2738, "y": 5301, "level": 1}, {"x": 2700, "y": 5284, "level": 1}, {"x": 2704, "y": 5321, "level": 0}, {"x": 2732, "y": 5327, "level": 0}, {
        "x": 2704,
        "y": 5349,
        "level": 0
      }, {"x": 2701, "y": 5343, "level": 1}, {"x": 2704, "y": 5357, "level": 1}, {"x": 2734, "y": 5370, "level": 1}, {"x": 2747, "y": 5327, "level": 1}, {
        "x": 2698,
        "y": 5316,
        "level": 1
      }],
      "root": {
        "children": [{
          "key": {"pulse": 1, "different_level": false},
          "value": {
            "children": [{"key": {"pulse": 1, "different_level": false}, "value": {"children": [], "directions": "", "path": []}}, {
              "key": {
                "pulse": 2,
                "different_level": false
              }, "value": {"children": [], "directions": "", "path": []}
            }, {"key": {"pulse": 3, "different_level": false, "spot": {"x": 2704, "y": 5349, "level": 0}}, "value": {"children": [], "directions": "", "path": []}}],
            "directions": "",
            "path": [{"type": "teleport", "spot": {"x": 2720, "y": 5352, "level": 0}, "id": {"group": "spheredorgeshkaan", "spot": "north", "access": "sphere"}}]
          }
        }, {
          "key": {"pulse": 2, "different_level": false},
          "value": {
            "children": [{"key": {"pulse": 2, "different_level": true}, "value": {"children": [], "directions": "", "path": []}}, {
              "key": {
                "pulse": 3,
                "different_level": true,
                "spot": {"x": 2711, "y": 5284, "level": 0}
              }, "value": {"children": [], "directions": "", "path": []}
            }],
            "directions": "",
            "path": [{"type": "run", "waypoints": [{"x": 2723, "y": 5264, "level": 0}, {"x": 2723, "y": 5268, "level": 0}]}, {
              "type": "transport",
              "assumed_start": {"x": 2723, "y": 5268, "level": 0},
              "internal": {
                "type": "entity",
                "source_loc": ["loc", 22937],
                "entity": {"name": "Stairs", "kind": "static"},
                "clickable_area": {"topleft": {"x": 2721.5, "y": 5271.5}, "botright": {"x": 2723.5, "y": 5268.5}, "level": 0},
                "actions": [{
                  "cursor": "ladderup",
                  "interactive_area": {"origin": {"x": 2722, "y": 5268, "level": 0}, "size": {"x": 2, "y": 1}},
                  "name": "Climb-up",
                  "movement": [{"time": 3, "fixed_target": {"target": {"origin": {"x": 2722, "y": 5272, "level": 1}}, "relative": true}, "orientation": "toentityafter"}]
                }]
              }
            }]
          }
        }, {
          "key": {"pulse": 3, "different_level": false, "spot": {"x": 2731, "y": 5266, "level": 0}},
          "value": {"children": [], "directions": "", "path": []}
        }, {
          "key": {"pulse": 3, "different_level": false, "spot": {"x": 2740, "y": 5273, "level": 0}},
          "value": {"children": [], "directions": "", "path": []}
        }, {
          "key": {"pulse": 3, "different_level": false, "spot": {"x": 2723, "y": 5279, "level": 0}},
          "value": {"children": [], "directions": "", "path": []}
        }, {
          "key": {"pulse": 3, "different_level": false, "spot": {"x": 2711, "y": 5271, "level": 0}},
          "value": {"children": [], "directions": "", "path": []}
        }, {
          "key": {"pulse": 3, "different_level": false, "spot": {"x": 2711, "y": 5284, "level": 0}},
          "value": {"children": [], "directions": "", "path": []}
        }, {
          "key": {"pulse": 1, "different_level": true},
          "value": {
            "children": [{"key": {"pulse": 2, "different_level": true}, "value": {"children": [], "directions": "", "path": []}}, {
              "key": {
                "pulse": 3,
                "different_level": true,
                "spot": {"x": 2701, "y": 5343, "level": 1}
              }, "value": {"children": [], "directions": "", "path": []}
            }, {
              "key": {"pulse": 3, "different_level": true, "spot": {"x": 2704, "y": 5357, "level": 1}},
              "value": {"children": [], "directions": "", "path": []}
            }, {"key": {"pulse": 3, "different_level": true, "spot": {"x": 2734, "y": 5370, "level": 1}}, "value": {"children": [], "directions": "", "path": []}}],
            "directions": "",
            "path": [{"type": "teleport", "spot": {"x": 2720, "y": 5352, "level": 0}, "id": {"group": "spheredorgeshkaan", "spot": "north", "access": "sphere"}}]
          }
        }, {
          "key": {"pulse": 2, "different_level": true},
          "value": {
            "children": [{"key": {"pulse": 2, "different_level": false}, "value": {"children": [], "directions": "", "path": []}}, {
              "key": {
                "pulse": 3,
                "different_level": false,
                "spot": {"x": 2738, "y": 5301, "level": 1}
              }, "value": {"children": [], "directions": "", "path": []}
            }],
            "directions": "",
            "path": [{"type": "teleport", "spot": {"x": 2735, "y": 5305, "level": 1}, "id": {"group": "spheredorgeshkaan", "spot": "east", "access": "sphere"}}]
          }
        }, {"key": {"pulse": 3, "different_level": true, "spot": {"x": 2739, "y": 5253, "level": 1}}, "value": {"children": [], "directions": "", "path": []}}, {
          "key": {
            "pulse": 3,
            "different_level": true,
            "spot": {"x": 2700, "y": 5284, "level": 1}
          }, "value": {"children": [], "directions": "", "path": []}
        }], "directions": "", "path": [{"type": "teleport", "spot": {"x": 2723, "y": 5264, "level": 0}, "id": {"group": "spheredorgeshkaan", "spot": "south", "access": "sphere"}}]
      }
    },
    "expected_time": 22.225
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
      .setValue(Alt1Color.fromNumber(this.value.color_mainline_move).css_string)
      .onCommit(v => this.value.color_mainline_move = Alt1Color.fromHex(v).for_overlay)
    const color_recovery_move = new ColorPicker()
      .setValue(Alt1Color.fromNumber(this.value.color_recovery_move).css_string)
      .onCommit(v => this.value.color_recovery_move = Alt1Color.fromHex(v).for_overlay)
    const color_mainline_line = new ColorPicker()
      .setValue(Alt1Color.fromNumber(this.value.color_mainline_line).css_string)
      .onCommit(v => this.value.color_mainline_line = Alt1Color.fromHex(v).for_overlay)
    const color_recovery_line = new ColorPicker()
      .setValue(Alt1Color.fromNumber(this.value.color_recovery_line).css_string)
      .onCommit(v => this.value.color_recovery_line = Alt1Color.fromHex(v).for_overlay)

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
    this.layout.row(new NumberSlider(0.1, 5, 0.1)
      .withPreviewFunction(v => `${v.toFixed(1)}s`)
      .setValue(this.value.solve_time_ms / 1000)
      .onCommit(v => this.value.solve_time_ms = v * 1000)
    )

    this.layout.header(new Checkbox("Estimate Slider Speed")
      .onCommit(v => this.value.estimate_slider_speed = v)
      .setValue(this.value.estimate_slider_speed), "left", 1)
    this.layout.paragraph("Show an estimate for your equivalent slider speed in Alt1's builtin clue solver after finishing a slider. Takes the faster animation of multi-tile moves in the builtin solver into account.")

    this.layout.header(new Checkbox("Improve screen reader with backtracking (Experimental)")
      .onCommit(v => this.value.improve_slider_matches_backtracking = v)
      .setValue(this.value.improve_slider_matches_backtracking), "left", 1)
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
      .setValue(Alt1Color.fromNumber(this.value.overlay_color).css_string)
      .onCommit(v => this.value.overlay_color = Alt1Color.fromHex(v).for_overlay))

    this.layout.header("Optimization Mode")

    this.layout.paragraph("Control how to optimize the solution. The configured value determines how much a 2-click tile is weighted compared to a 1-click tile. A value of '2' will optimize for the lowest total amount of clicks. A value of '1' will optimize for the lowest number of unique tiles that need to be clicked. Setting this to 1.3 is a good compromise for most people. Values above 2 try to avoid 2-click tiles.")

    this.layout.row(new NumberSlider(1, 5, 0.1)
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

class GeneralSolvingSettingsEdit extends Widget {
  private layout: SettingsLayout

  constructor(private value: NeoSolving.Settings.GeneralSettings) {
    super()

    this.layout = new SettingsLayout().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.section("Zoom Behaviour", "Configure how the solver zooms into paths and clue target spots.")

    this.layout.namedSetting("Max Zoom",
      hbox(
        new NumberSlider(0, 7)
          .modifyPreviewContainer(c => c.css("min-width", "15px"))
          .setValue(this.value.global_max_zoom)
          .onCommit(v => this.value.global_max_zoom = v),
        NislIcon.reset2().withClick(() => {
          this.value.global_max_zoom = NeoSolving.Settings.GeneralSettings.normalize(undefined).global_max_zoom
          this.render()
        }).tooltip("Reset to default"),
      ),
      "The maximum allowed zoom level for automatic zoom."
    )

    this.layout.namedSetting("Minimum Area",
      hbox(
        new NumberSlider(1, 64)
          .modifyPreviewContainer(c => c.css("min-width", "15px"))
          .setValue(this.value.minimum_view_size)
          .onCommit(v => this.value.minimum_view_size = v),
        NislIcon.reset2().withClick(() => {
          this.value.minimum_view_size = NeoSolving.Settings.GeneralSettings.normalize(undefined).minimum_view_size
          this.render()
        }).tooltip("Reset to default"),
      ),
      "The minimum size of the target area (in tiles) that the zoom tries to fit when zooming in. Smaller areas are padded accordingly."
    )

    this.layout.setting(new Checkbox("Include closest teleport")
        .setValue(this.value.include_closest_teleport)
        .onCommit(v => this.value.include_closest_teleport = v)
      , "Include the closest teleport to the target spot when not using a method, up to a reasonable max distance. May produce undesirable results, especially with underground locations.")

    this.layout.paragraph("Additional zoom options can be found in the 'Scans' section.")
  }
}

class InterfaceSettingsEdit extends Widget {

  private layout: SettingsLayout

  constructor(private value: NeoSolving.Settings.InfoPanel) {
    super()

    this.layout = new SettingsLayout().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.section("Interface", "Choose what data about a clue step and its solution is displayed on the interface while solving.")

    this.layout.namedSetting("Clue Text", hgrid(
        ...new Checkbox.Group([
          {button: new Checkbox("Full"), value: "full" as const},
          {button: new Checkbox("Abridged"), value: "abridged" as const},
          {button: new Checkbox("Hide"), value: "hide" as const},
        ]).onChange(v => this.value.clue_text = v)
          .setValue(this.value.clue_text)
          .checkboxes()
      ),
      "The text of the clue for text clues. 'Abridged' uses a shorter version where applicable."
    )

    this.layout.namedSetting("Clue Map", hgrid(
        ...new Checkbox.Group([
          {button: new Checkbox("Show"), value: "show" as const},
          {button: new Checkbox("Transcript"), value: "transcript" as const},
          {button: new Checkbox("Hide"), value: "hide" as const},
        ]).onChange(v => this.value.map_image = v)
          .setValue(this.value.map_image)
          .checkboxes()
      ),
      "The image for image clues. 'Transcript' displays a text description of the image instead."
    )

    this.layout.namedSetting("Dig Target", hgrid(
        ...new Checkbox.Group([
          {button: new Checkbox("Show"), value: "show" as const},
          {button: new Checkbox("Hide"), value: "hide" as const},
        ]).onChange(v => this.value.dig_target = v)
          .setValue(this.value.dig_target)
          .checkboxes()
      )
      , "A description of where to dig or the coordinates if no description is available."
    )

    this.layout.namedSetting("Talk Target", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.talk_target = v)
        .setValue(this.value.talk_target)
        .checkboxes()
    ), "The name of the NPC you need to talk to.")

    this.layout.namedSetting("Search Target", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.search_target = v)
        .setValue(this.value.search_target)
        .checkboxes()
    ), "The name of the container (drawers, boxes etc.) you need to search.")

    this.layout.namedSetting("Search Key", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.search_key = v)
        .setValue(this.value.search_key)
        .checkboxes()
    ), "How you get the key for a container on medium clues without 'way of the footshaped key' unlocked.")

    this.layout.namedSetting("Hidey Hole", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.hidey_hole = v)
        .setValue(this.value.hidey_hole)
        .checkboxes()
    ), "The name of the hidey hole for emote clues.")

    this.layout.namedSetting("Emote Items", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.emote_items = v)
        .setValue(this.value.emote_items)
        .checkboxes()
    ), "What items you need to equip for emote clues.")


    this.layout.namedSetting("Emote(s)", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.emotes = v)
        .setValue(this.value.emotes)
        .checkboxes()
    ), "The name of the emote/emotes you need to perform for emote clues.")

    this.layout.namedSetting("Double Agent", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.double_agent = v)
        .setValue(this.value.double_agent)
        .checkboxes()
    ), "Shows if you need to fight a double agent for this emote clue.")

    this.layout.namedSetting("Pathing", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Show"), value: "show" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.path_step_list = v)
        .setValue(this.value.path_step_list)
        .checkboxes()
    ), "A list containing short descriptions for the steps that make up a path if one is active for the current clue step.")

    const hide = new Checkbox("Hide")
    const show = new Checkbox("Show")
    const hide_for_scans_compasses = new Checkbox("Hide for Scans/Compasses")

    new Checkbox.Group([
      {button: show, value: "show" as const},
      {button: hide, value: "hide" as const},
      {button: hide_for_scans_compasses, value: "hideforscansandcompasses" as const},
    ]).onChange(v => this.value.puzzle = v)
      .setValue(this.value.puzzle)

    this.layout.namedSetting("Puzzles", vbox(
      hgrid(show, hide),
      hgrid(hide_for_scans_compasses),
    ), "Shows what puzzle (if any) is given on completion of this clue step.")

    this.layout.namedSetting("Challenge", hgrid(
      ...new Checkbox.Group([
        {button: new Checkbox("Full"), value: "full" as const},
        {button: new Checkbox("Answer"), value: "answer_only" as const},
        {button: new Checkbox("Hide"), value: "hide" as const},
      ]).onChange(v => this.value.challenge = v)
        .setValue(this.value.challenge)
        .checkboxes()
    ), "The solution to challenge scrolls given out by npcs.")

    this.layout.section("Load Preset")

    this.layout.row(
      new LightButton("Everything")
        .onClick(() => {
          Object.assign(this.value, lodash.cloneDeep(NeoSolving.Settings.InfoPanel.EVERYTHING))

          this.render()
        }))

    this.layout.row(
      new LightButton("Reduced (Recommended)")
        .onClick(() => {
          Object.assign(this.value, lodash.cloneDeep(NeoSolving.Settings.InfoPanel.REDUCED))

          this.render()
        }))

    this.layout.row(
      new LightButton("Nothing")
        .onClick(() => {
          Object.assign(this.value, lodash.cloneDeep(NeoSolving.Settings.InfoPanel.NOTHING))

          this.render()
        }))

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

  private layout: SettingsLayout
  private active_preset: CompassSolving.TriangulationPreset | null = null

  constructor(private value: CompassSolving.Settings) {
    super()

    this.layout = new SettingsLayout().appendTo(this)

    this.render()
  }

  render() {
    this.layout.empty()

    this.layout.section("General")

    this.layout.setting(new Checkbox("Automatically commit angle on teleport")
        .onCommit(v => this.value.auto_commit_on_angle_change = v)
        .setValue(this.value.auto_commit_on_angle_change),
      "When active, the next triangulation line is automatically drawn when the compass angle changes by more than 4° at once. This is the default behaviour in Alt1's built-in clue solver.")

    this.layout.setting(new Checkbox("Show status overlay")
        .onCommit(v => this.value.enable_status_overlay = v)
        .setValue(this.value.enable_status_overlay),
      "Shows detected compass angle and other info on top of the compass interface."
    )

    this.layout.setting(new Checkbox("Show method previews")
        .onCommit(v => this.value.show_method_preview_of_secondary_solutions = v)
        .setValue(this.value.show_method_preview_of_secondary_solutions),
      "When active method previews for all remaining candidates are shown after the first triangulation step."
    )

    this.layout.namedSetting("Beam Color",
      new ColorPicker()
        .setValue(this.value.beam_color)
        .onCommit(v => this.value.beam_color = v),
      "Select the color of the triangulation beams on the map.")

    this.layout.setting("Manual Tile Selection Inaccuracy", "Choose how accurate your manual spot selection when you click the map should be assumed to be. 1 considers your selection to be precisely the tile you stand on, higher values leave more room for error. This does not apply to tiles selected as part of a preconfigured strategy.")
    this.layout.row(new NumberSlider(0, 10, 1)
      .setValue(this.value.manual_tile_inaccuracy)
      .onCommit(v => this.value.manual_tile_inaccuracy = v)
    )

    this.layout.section("Smart Triangulation", "Configure advanced triangulation behaviour that reduces the need for manual input.")

    this.layout.setting("Active Triangulation Strategies", "Triangulation presets are used to automatically load triangulation spots whenever you receive a compass clue. This skips the need to manually select your teleports repeatedly.")

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
      ].filter(p => [p.compass_id].flat().includes(compass.id))

      const preset_selector = new DropdownSelection<CompassSolving.TriangulationPreset>({
        type_class: {
          toHTML: (v: CompassSolving.TriangulationPreset) => {
            if (v) return hboxl(...deps().app.template_resolver.resolve(v.name)).css2({
              "white-space": "nowrap",
              "overflow": "hidden"
            })
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

    this.layout.setting("Custom Strategies", "You can create your own triangulation presets if none of the builtin presets fit your needs. Don't forget to activate your custom preset in the section above.")

    type T = CompassSolving.TriangulationPreset | "create"

    const preset_selector = new DropdownSelection<T>({
      type_class: {
        toHTML: (v: T) => {
          if (v == "create") return "Create New"
          else if (v) return hboxl(...deps().app.template_resolver.resolve(v.name)).css2({
            "white-space": "nowrap",
            "overflow": "hidden"
          })
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

    this.layout.named("Selection", hbox(preset_selector,
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
        sequence.row("No triangulation points yet.")
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
                              .setName("Spot selection")
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

    this.layout.setting(new Checkbox("Use solution of previous step")
        .onCommit(v => this.value.use_previous_solution_as_start = v)
        .setValue(this.value.use_previous_solution_as_start),
      "When active, the solution of the previous clue step is used as the first triangulation spot and the initially read compass angle is immediately committed. Only uses the solution of scans if you follow the scan tree to a point where the remaining spots are in a reasonably small rectangle."
    )

    this.layout.setting(new Checkbox("Invert preset sequence")
        .onCommit(v => this.value.invert_preset_sequence_if_previous_solution_was_used = v)
        .setValue(this.value.invert_preset_sequence_if_previous_solution_was_used),
      "When active, the preset triangulation sequence is inverted when the solution of the previous clue step is used to draw an initial arrow. This is useful when your triangulation strategy ends somewhere that provides access to useful teleports, such as spirit trees at South Feldip Hills."
    )

    this.layout.setting(new Checkbox("Skip colinear triangulation spots")
        .onCommit(v => this.value.skip_triangulation_point_if_colinear = v)
        .setValue(this.value.skip_triangulation_point_if_colinear),
      "When active, preset triangulation spots that are too close to being in-line with a previously drawn triangulation arrow are skipped (unless they are the last one remaining)."
    )
  }
}

class DataManagementEdit extends Widget {

  private layout = new SettingsLayout().appendTo(this)

  constructor() {
    super();

    this.layout.section("Data Export and Import", "Exported data included all settings and preferences, as well as imported and local methods. Importing a data dump will replace all of your local data with the imported data.")

    this.layout.row(
      hgrid(
        new LightButton("Export")
          .onClick(() => {
            deps().app.data_dump.dump()
          }),
        new LightButton("Import")
          .onClick(() => {
            deps().app.data_dump.restore()
          })
      )
    )
  }
}

export class SettingsEdit extends Widget {
  value: Settings.Settings

  constructor(app: ClueTrainer, start_section: SettingsEdit.section_id) {
    super();

    this.value = lodash.cloneDeep(app.settings.settings)

    this.init(
      new SectionControl<SettingsEdit.section_id>([
        {
          name: "Solving", entries: [{
            id: "solving_general",
            name: "General",
            short_name: "General",
            renderer: () => new GeneralSolvingSettingsEdit(this.value.solving.general)
          }, {
            id: "solving_interface",
            name: "Interface",
            short_name: "Interface",
            renderer: () => new InterfaceSettingsEdit(this.value.solving.info_panel)
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
          }, {
            id: "scans",
            name: "Scan Solving",
            short_name: "Scans",
            renderer: () => new ScanSettingsEdit(this.value.solving.scans)
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
          }, {
            id: "dataexport",
            name: "Data Export",
            short_name: "Data",
            renderer: () => new DataManagementEdit()
          }
          ]
        },
      ])
        .setActiveSection(start_section)
    )
  }
}

export namespace SettingsEdit {
  export type section_id =
    "solving_general"
    | "solving_interface"
    | "sliders"
    | "knots"
    | "lockboxes"
    | "towers"
    | "compass"
    | "teleports"
    | "crowdsourcing"
    | "scans"
    | "dataexport"
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