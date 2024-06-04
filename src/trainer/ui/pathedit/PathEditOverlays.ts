import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import ControlWithHeader from "../map/ControlWithHeader";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import * as leaflet from "leaflet"
import {tileHalfPolygons, tilePolygon} from "../polygon_helpers";
import {direction, MovementAbilities, PlayerPosition} from "../../../lib/runescape/movement";
import {TileCoordinates} from "../../../lib/runescape/coordinates";
import {Vector2} from "../../../lib/math";
import {PathBuilder} from "./PathBuilder";
import {PathEditor} from "./PathEditor";
import {Observable, observe} from "../../../lib/reactive";
import {GameLayer} from "../../../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import {util} from "../../../lib/util/util";
import possibility_raster = MovementAbilities.possibility_raster;
import observe_combined = Observable.observe_combined;
import eqWithNull = util.eqWithNull;

export class AbilityLens extends leaflet.FeatureGroup {
  constructor(private tile: TileCoordinates, private surge_escape_for: direction[] = []) {
    super();

    this.render()
  }

  async render() {
    let raster = await possibility_raster(this.tile, this.surge_escape_for)

    function style(color: string): leaflet.PolylineOptions {
      return {
        fillOpacity: 0.2,
        stroke: false,
        fillColor: color,
      }
    }

    const polygons: leaflet.Polygon[] = []

    for (let dx = 0; dx < raster.data.size.x; dx++) {
      for (let dy = 0; dy < raster.data.size.y; dy++) {
        const tile = TileCoordinates.move(raster.data.origin, {x: dx, y: dy})

        const works = raster.data.query(tile)

        if (works) {

          if (this.surge_escape_for.length > 0) {

            const surge = raster.targets.some(t => Vector2.eq(tile, t.surge))
            const escape = raster.targets.some(t => Vector2.eq(tile, t.escape))

            if (surge && escape) {
              const [s, e] = tileHalfPolygons(tile,
                [style("#426896"), style("#234709")],
              )

              polygons.push(s, e)
            } else if (surge) {
              polygons.push(
                tilePolygon(tile, style("#426896"))
              )
            } else if (escape) {
              polygons.push(
                tilePolygon(tile, style("#234709"))
              )
            } else {
              polygons.push(
                tilePolygon(tile, style("#e2c40c"))
              )
            }
          } else {
            polygons.push(
              tilePolygon(tile, style("#e2c40c"))
            )
          }
        } else {
          polygons.push(
            tilePolygon(tile, style("red"))
          )
        }
      }
    }

    polygons.forEach(p => p.addTo(this))
  }
}

export class StateAbilityLensLayer extends GameLayer {

  active_lens: AbilityLens = null

  enabled1 = observe(true)
  enabled2 = observe(true)

  static = observe(true)

  render_for_state: Observable<PlayerPosition> = observe(null).equality((eqWithNull(PlayerPosition.eq)))

  constructor(builder: PathBuilder) {
    super();

    builder.cursor_state.subscribe(s => {
      if (this.static.value()) this.render_for_state.set(s?.state?.position)
    }, true)

    this.static.subscribe(v => {
      if (v) this.render_for_state.set(builder.cursor_state.value()?.state?.position)
    })

    observe_combined({
      enabled1: this.enabled1,
      enabled2: this.enabled2,
      state: this.render_for_state
    }).subscribe(({enabled1, enabled2, state}) => {
      const render_at_all = enabled1 && enabled2 && state?.tile

      this.render(render_at_all ? state : undefined)
    }, true)
  }

  private render(state: PlayerPosition) {
    if (this.active_lens) {
      this.active_lens.remove()
      this.active_lens = null
    }

    if (!state?.tile) return;

    this.active_lens = new AbilityLens(state.tile,
      state.direction ?
        [state.direction] : direction.all
    ).addTo(this)
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      if (!this.static.value()) {
        this.render_for_state.set({
          tile: event.tile(),
          direction: 0
        })
      }
    })
  }
}

export class PathEditOverlayControl extends GameMapControl {
  lens_layer: StateAbilityLensLayer

  lens_checkbox: Checkbox
  lens_static_checkbox: Checkbox
  lens_dynamic_checkbox: Checkbox

  constructor(editor: PathEditor) {
    super({
      position: "top-right",
      type: "floating",
    }, c());

    this.lens_layer = new StateAbilityLensLayer(editor.value).addTo(this)

    this.lens_layer.enabled1.set(false)

    this.setContent(new ControlWithHeader("Path Tools")
      .append(
        this.lens_checkbox = new Checkbox("Show Ability Lens")
          .onCommit(v => {
            this.lens_layer.enabled1.set(v)

            this.lens_static_checkbox.setEnabled(v)
            this.lens_dynamic_checkbox.setEnabled(v)
          }),

        this.lens_static_checkbox = new Checkbox("Static", "radio")
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