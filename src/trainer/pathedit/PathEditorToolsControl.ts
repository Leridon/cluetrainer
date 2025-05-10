import {GameMapControl} from "../../lib/gamemap/GameMapControl";
import ControlWithHeader from "../ui/map/ControlWithHeader";
import {Checkbox} from "../../lib/ui/controls/Checkbox";
import * as leaflet from "leaflet"
import {tileHalfPolygons, tilePolygon} from "../ui/polygon_helpers";
import {direction, MovementAbilities, PlayerPosition} from "../../lib/runescape/movement";
import {TileCoordinates} from "../../lib/runescape/coordinates";
import {Vector2} from "../../lib/math";
import {PathBuilder} from "./PathBuilder";
import {PathEditor} from "./PathEditor";
import {Observable, observe} from "../../lib/reactive";
import {GameLayer} from "../../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../../lib/gamemap/MapEvents";
import {util} from "../../lib/util/util";
import possibility_raster = MovementAbilities.possibility_raster;
import observe_combined = Observable.observe_combined;
import eqWithNull = util.eqWithNull;
import {StatefulAbilityLens} from "./AbilityLens";

export class PathEditorToolsControl extends GameMapControl {
  lens_layer: StatefulAbilityLens

  lens_checkbox: Checkbox
  lens_static_checkbox: Checkbox
  lens_dynamic_checkbox: Checkbox

  constructor(editor: PathEditor) {
    super({
      position: "top-right",
      type: "floating",
    }, c());

    this.lens_layer = new StatefulAbilityLens(editor.value).addTo(this)

    this.lens_layer.enabled1.set(false)

    this.setContent(new ControlWithHeader("Path Tools")
      .append(
        this.lens_checkbox = new Checkbox("Show Ability Lens")
          .onCommit(v => {
            this.lens_layer.enabled1.set(v)

            this.lens_static_checkbox.setEnabled(v)
            this.lens_dynamic_checkbox.setEnabled(v)
          }),

        this.lens_static_checkbox = new Checkbox("At current position", "radio")
          .css("margin-left", "10px")
          .setValue(true)
          .setEnabled(false),
        this.lens_dynamic_checkbox = new Checkbox("Follow Mouse", "radio")
          .css("margin-left", "10px")
          .setValue(false)
          .setEnabled(false),
      )
    )

    new Checkbox.Group([
      {button: this.lens_dynamic_checkbox, value: false},
      {button: this.lens_static_checkbox, value: true},
    ]).onChange(v => this.lens_layer.static.set(v))
      .setValue(true)
  }
}