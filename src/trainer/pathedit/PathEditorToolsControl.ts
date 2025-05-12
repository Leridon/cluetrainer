import {GameMapControl} from "../../lib/gamemap/GameMapControl";
import ControlWithHeader from "../ui/map/ControlWithHeader";
import {Checkbox} from "../../lib/ui/controls/Checkbox";
import {PathEditor} from "./PathEditor";
import {StatefulAbilityLens} from "./AbilityLens";
import Properties from "../ui/widgets/Properties";
import LightButton from "../ui/widgets/LightButton";
import {MapEntity} from "../../lib/gamemap/MapEntity";
import {GameLayer} from "../../lib/gamemap/GameLayer";
import {Rectangle} from "../../lib/math";
import {PathFindingLite} from "./PathFindingLite";
import {tilePolygon} from "../ui/polygon_helpers";
import {observe} from "../../lib/reactive";
import {PathStepEntity} from "../ui/map/entities/PathStepEntity";
import {DrawTileAreaInteraction} from "../ui/devutilitylayer/DrawTileAreaInteraction";
import {GameMapContextMenuEvent} from "../../lib/gamemap/MapEvents";
import {PathGraphics} from "../ui/path_graphics";
import {C} from "../../lib/ui/constructors";
import {MovementAbilities, PlayerPosition} from "../../lib/runescape/movement";
import Widget from "../../lib/ui/Widget";
import {FormModal} from "../../lib/ui/controls/FormModal";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import {Menu} from "../ui/widgets/ContextMenu";
import * as assert from "assert";
import movement_ability = MovementAbilities.movement_ability;
import hboxl = C.hboxl;
import hgrid = C.hgrid;

class SpiderwebTool {
  private layer = observe<GameLayer>(null)

  private clear_button: LightButton
  private calculate_button: LightButton


  constructor(private editor: PathEditor, private layout: Properties) {
    layout.header("Pathfinding Lite", "center", 1)

    /*
    layout.row(new LightButton("Path Target").setEnabled(!!editor.options.target)
      .onClick(() => this.do(editor.options.target))
    )
    layout.row(new LightButton("Custom Target")
      .onClick(() => {
        this.editor.interaction_guard.set(new DrawTileAreaInteraction([], ["commit", "reset"]).onCommit(area => {
          this.do([TileArea.activate(TileArea.fromTiles(area))])
        }))

      })
    )*/

    layout.row(
      hgrid(
        this.clear_button = new LightButton("Clear").setVisible(false).onClick(() => this.clear()),
        this.calculate_button = new LightButton("Calculate").setVisible(true).onClick(async () => {
          const settings = await new SpiderwebTool.SettingsModal(editor).do()

          if (!settings) return

          if (settings.area == undefined) {
            this.editor.interaction_guard.set(new DrawTileAreaInteraction([], ["commit", "reset"])
              .onCommit(area => {
                settings.area = area.map(t => ({tile: t, direction: undefined}))

                this.do(settings)
              }))
          } else {
            this.do(settings)
          }
        }))
    )

    this.layer.subscribe(l => {
      this.clear_button.setVisible(l != null)
      this.calculate_button.setVisible(l == null)
    })
  }

  private async do(settings: SpiderwebTool.Settings): Promise<void> {
    this.clear()

    const groups = await PathFindingLite.litePathFinding(settings.area, [settings.abilities])

    this.layer.set(new SpiderwebTool.PreviewLayer(this.editor).addTo(this.editor.game_layer))

    groups.map(g => new SpiderwebTool.InversePathFindingResultEntity(g)).forEach(e => e.addTo(this.layer.value()))
  }

  private clear() {
    this.layer.value()?.remove()
    this.layer.set(null)
  }
}

namespace SpiderwebTool {
  import renderPath = PathStepEntity.renderPath;
  import ability_icon = PathGraphics.ability_icon;
  import inlineimg = C.inlineimg;
  import hbox = C.hbox;
  import vbox = C.vbox;

  type area_type = "pathtarget" | "cursorposition" | "custom"

  export type Settings = {
    abilities: movement_ability[]
    area: PlayerPosition[] | undefined
  }

  export class SettingsModal extends FormModal<Settings> {
    private combination_view: Widget
    private combination = observe<movement_ability[]>([])
    private area_type_selection: Checkbox.Group<area_type>

    constructor(private editor: PathEditor) {
      super();

      this.title.set("Pathfinding Lite Settings")

      {
        const combination: movement_ability[] = []

        combination.push("dive")

        if (editor.value.assumptions().double_surge) combination.push("surge", "surge")
        else combination.push("surge")

        if (editor.value.assumptions().double_escape) combination.push("escape", "escape")
        else combination.push("escape")

        this.combination.set(combination)
      }
    }

    render() {
      super.render();

      const layout = new Properties()

      layout.header("Available Abilities")

      layout.named("Current Selection", hboxl(this.combination_view = hboxl(), "(Click to remove)"))

      this.combination.subscribe(comb => {
        this.combination_view.empty()

        this.combination_view.append(...comb.map((a, i) => inlineimg(ability_icon(a)).addClass("ctr-clickable").on("click", () => {
          this.combination.update(v => v.splice(i, 1))
        })))
      }, true)

      layout.named("Add Ability", hboxl(
          ...(["dive", "surge", "escape"] as const).map(ability =>
            inlineimg(ability_icon(ability)).addClass("ctr-clickable").on("click", () => {
              this.combination.update(v => v.push(ability))
            }))
        )
      )

      layout.header("Area", "center", 1)

      const buttons: {
        button: Checkbox,
        value: area_type
      }[] = []

      buttons.push({button: new Checkbox("Path Target", "radio").setEnabled(!!this.editor.options.target).setValue(true), value: "pathtarget"})
      buttons.push({button: new Checkbox("Custom", "radio").setValue(false), value: "custom"})

      this.area_type_selection = new Checkbox.Group(buttons).setValue(buttons.find(b => b.button.isEnabled()).value)

      layout.row(vbox(...this.area_type_selection.checkboxes()))

      this.body.append(layout)
    }

    private confirm_current() {

      this.confirm({
        abilities: this.combination.value(),
        area: (() => {
          switch (this.area_type_selection.get()) {
            case "pathtarget":
              return this.editor.options.target.flatMap(t => t.getTiles()).map(t => ({tile: t, direction: undefined}))
            case "custom":
              return undefined
          }
        })()
      })
    }

    getButtons(): BigNisButton[] {
      return [
        new BigNisButton("Confirm", "confirm").onClick(() => this.confirm_current()),
        new BigNisButton("Candel", "cancel").onClick(() => this.cancel()),
      ]
    }
  }

  export class PreviewLayer extends GameLayer {

    constructor(private editor: PathEditor) {
      super();
    }

    eventContextMenu(event: GameMapContextMenuEvent) {
      event.onPost(e => {
        if (e.active_entity instanceof InversePathFindingResultEntity) {
          e.addForEntity(
            {
              type: "basic",
              handler: () => {
                e.active_entity.remove()
              },
              text: "Remove"
            }
          )

          if (e.active_entity.data.paths.length == 1) {
            e.addForEntity({
              type: "basic",
              handler: () => {
                assert(e.active_entity instanceof InversePathFindingResultEntity)

                this.editor.value.add(...e.active_entity.data.paths[0].path)
              },
              text: "Insert at cursor"
            })
          } else {
            e.addForEntity({
              type: "submenu",
              children: e.active_entity.data.paths.map((p, i) => {
                return {
                  type: "basic" as const,
                  text: `Path ${i}`,
                  handler: () => {
                    this.editor.value.add(...p.path)
                  },
                }
              }),
              text: "Insert at cursor"
            })
          }
        }
      })
    }
  }

  export class InversePathFindingResultEntity extends MapEntity {
    constructor(public data: PathFindingLite.PathGroup) {
      super()

      this.setInteractive(true)

      this.setTooltip(() => {
        const props = new Properties()

        this.data.paths.forEach(path => {
          props.row(
            hbox(...path.path.map(s => inlineimg(ability_icon(s.ability))))
          )
        })

        return props
      })
    }

    async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
      return {
        type: "submenu",
        text: "Calculated Path",
        children: []
      }
    }

    bounds(): Rectangle {
      return Rectangle.from(this.data.origin);
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const poly = tilePolygon(this.data.origin)
        .setStyle({
          interactive: true
        })
        .addTo(this)

      if (props.highlight) {
        this.data.paths.forEach(p => renderPath(p.path).addTo(this))
      }

      return poly.getElement()
    }
  }
}

export class PathEditorToolsControl extends GameMapControl {
  lens_layer: StatefulAbilityLens

  lens_checkbox: Checkbox
  lens_static_checkbox: Checkbox
  lens_dynamic_checkbox: Checkbox

  private spiderweb_tool: SpiderwebTool

  constructor(editor: PathEditor) {
    super({
      position: "top-right",
      type: "floating",
    }, c());

    this.lens_layer = new StatefulAbilityLens(editor.value).addTo(this)

    this.lens_layer.enabled1.set(false)

    const control = new ControlWithHeader("Path Tools")

    this.setContent(control)

    const layout = new Properties().appendTo(control.body)

    layout.header(new Checkbox("Ability Lens").onCommit(v => {
      this.lens_layer.enabled1.set(v)

      this.lens_static_checkbox.setEnabled(v)
      this.lens_dynamic_checkbox.setEnabled(v)
    }), "left", 1)

    layout.row(this.lens_static_checkbox = new Checkbox("At path position", "radio")
      .css("margin-left", "10px")
      .setValue(true)
      .setEnabled(false))

    layout.row(
      this.lens_dynamic_checkbox = new Checkbox("Follow Mouse", "radio")
        .css("margin-left", "10px")
        .setValue(false)
        .setEnabled(false)
    )

    new Checkbox.Group([
      {button: this.lens_dynamic_checkbox, value: false},
      {button: this.lens_static_checkbox, value: true},
    ]).onChange(v => this.lens_layer.static.set(v))
      .setValue(true)

    layout.divider()

    this.spiderweb_tool = new SpiderwebTool(editor, layout)
  }
}