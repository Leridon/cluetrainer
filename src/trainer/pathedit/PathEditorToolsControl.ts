import {GameMapControl} from "../../lib/gamemap/GameMapControl";
import ControlWithHeader from "../ui/map/ControlWithHeader";
import {Checkbox} from "../../lib/ui/controls/Checkbox";
import {PathEditor} from "./PathEditor";
import {StatefulAbilityLens} from "./AbilityLens";
import Properties from "../ui/widgets/Properties";
import LightButton from "../ui/widgets/LightButton";
import {MapEntity} from "../../lib/gamemap/MapEntity";
import {TileArea} from "../../lib/runescape/coordinates/TileArea";
import {GameLayer} from "../../lib/gamemap/GameLayer";
import {Rectangle} from "../../lib/math";
import {PathFindingLite} from "./PathFindingLite";
import {tilePolygon} from "../ui/polygon_helpers";
import {observe} from "../../lib/reactive";
import {PathStepEntity} from "../ui/map/entities/PathStepEntity";

class SpiderwebTool {
  private clear_button: LightButton
  private layer = observe<GameLayer>(null)

  constructor(private editor: PathEditor, private layout: Properties) {
    layout.header("Pathfinding Lite", "center", 1)

    layout.row(new Checkbox("Dive"))
    layout.row(new Checkbox("Surge 1"))
    layout.row(new Checkbox("Surge 2"))
    layout.row(new Checkbox("Escape 1"))
    layout.row(new Checkbox("Escape 2"))

    layout.header("Calculate", "left", 1)

    layout.row(new LightButton("Path Target").setEnabled(!!editor.options.target)
      .onClick(() => this.do(editor.options.target))
    )
    layout.row(new LightButton("Custom Target").setEnabled(!!editor.options.target))
    layout.row(this.clear_button = new LightButton("Clear").setEnabled(false).onClick(() => this.clear()))

    this.layer.subscribe(l => this.clear_button.setEnabled(l != null))
  }

  private async do(target: TileArea.ActiveTileArea[]): Promise<void> {
    this.clear()

    const groups = await PathFindingLite.litePathFinding(target.flatMap(a => a.getTiles()), [["surge", "surge", "dive"], ["escape", "escape", "dive"]])

    this.layer.set(new GameLayer().addTo(this.editor.game_layer))

    groups.map(g => new SpiderwebTool.InversePathFindingResultEntity(g)).forEach(e => e.addTo(this.layer.value()))
  }

  private clear() {
    this.layer.value()?.remove()
    this.layer.set(null)
  }
}

namespace SpiderwebTool {
  import renderPath = PathStepEntity.renderPath;

  export class InversePathFindingResultEntity extends MapEntity {
    constructor(private data: PathFindingLite.PathGroup) {
      super()

      this.setInteractive(true)
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
        this.data.paths.forEach(p => renderPath(p).addTo(this))
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

    layout.header("Ability Lens")

    layout.row(this.lens_checkbox = new Checkbox("Show")
      .onCommit(v => {
        this.lens_layer.enabled1.set(v)

        this.lens_static_checkbox.setEnabled(v)
        this.lens_dynamic_checkbox.setEnabled(v)
      }))

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