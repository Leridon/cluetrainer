import {TileCoordinates} from "../../../lib/runescape/coordinates";
import * as leaflet from "leaflet";
import {HostedMapData, MovementAbilities} from "../../../lib/runescape/movement";
import {Path} from "../../../lib/runescape/pathing";
import {GameMapKeyboardEvent, GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import InteractionTopControl from "../../ui/map/InteractionTopControl";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {Observable, observe} from "../../../lib/reactive";
import {PathStepEntity} from "../../ui/map/entities/PathStepEntity";
import {PathGraphics} from "../../ui/path_graphics";
import {AbilityLens} from "../AbilityLens";
import observe_combined = Observable.observe_combined;
import arrow = PathGraphics.arrow;
import isFarDive = MovementAbilities.isFarDive;


export class DrawAbilityInteraction extends ValueInteraction<Path.step_ability> {
  _possibility_overlay: leaflet.FeatureGroup = null
  _preview_arrow: leaflet.Layer = null

  private start_position: Observable<TileCoordinates> = observe(null).equality(TileCoordinates.eq2)
  private current_target: Observable<{
    tile: TileCoordinates,
    forced: boolean
  }> = observe(null).equality((a, b) => TileCoordinates.eq2(a?.tile, b?.tile) && a?.forced == b?.forced)

  private overlay_tile: Observable<TileCoordinates> = observe(null).equality(TileCoordinates.eq2)

  constructor(private ability: MovementAbilities.movement_ability) {
    super({})

    this.attachTopControl(new InteractionTopControl().setName(`Drawing ${ability}`))

    observe_combined({start: this.start_position, target: this.current_target}).subscribe(({start, target}) => {
      this.overlay_tile.set(start || target?.tile)

      this.updateArrow(start, target?.tile, target?.forced)
    })

    this.overlay_tile.subscribe(tile => this.updateDiveOverlay(tile))

    this.start_position.subscribe(() => this.updateInstructions(), true)
  }

  updateInstructions() {
    if (this.start_position.value()) {
      this.top_control.setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[Click] valid target tile to confirm.`))
          .append(c().text(`[Shift + Click] to force any target tile.`))
          .append(c().text(`[Backspace] to reset start tile.`))
      )
    } else {
      this.top_control.setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[Click] the origin tile of the ability.`))
      )
    }
  }

  setStartPosition(pos: TileCoordinates): this {
    this.start_position.set(pos)

    return this
  }

  private async updateDiveOverlay(tile: TileCoordinates | null): Promise<void> {
    if (this.ability != "barge" && this.ability != "dive") return

    if (this._possibility_overlay) {
      this._possibility_overlay.remove()
      this._possibility_overlay = null
    }

    if (tile == null) return

    this._possibility_overlay = new AbilityLens(tile)
    this._possibility_overlay.addTo(this)
  }

  private async updateArrow(start: TileCoordinates, hover: TileCoordinates, forced: boolean) {
    // Calculate the preview that needs to be drawn.
    let res = await (async (): Promise<{ from: TileCoordinates, to: TileCoordinates, okay: boolean } | null> => {
      if (!start || !hover) return null

      if (forced) return {from: start, to: hover, okay: true}
      else {
        let res = await MovementAbilities.generic(HostedMapData.get(), this.ability, start, hover)

        return {from: start, to: res?.tile || hover, okay: !!res}
      }
    })()

    // Remove existing preview
    if (this._preview_arrow) {
      this._preview_arrow.remove()
      this._preview_arrow = null
    }

    if (res) {
      let {from, to, okay} = res

      // Draw the necessary preview
      this._preview_arrow = (
        okay ? new PathStepEntity({
            type: "ability",
            ability: this.ability,
            is_far_dive: this.ability == "dive" && await isFarDive(from, to),
            from: from,
            to: to
          }).setInteractive(false)
          : arrow(from, to).setStyle({
            weight: 3,
            color: "red"
          })
      ).addTo(this)
    }
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(async () => {
      event.stopAllPropagation()

      let tile = event.tile()

      if (!this.start_position.value()) {
        this.start_position.set(tile)
      } else {

        if (event.original.shiftKey) {
          const is_far_dive = this.ability == "dive" && await isFarDive(this.start_position.value(), tile)

          this.commit({
            type: "ability",
            ability: this.ability,
            is_far_dive: is_far_dive ? true : undefined,
            from: this.start_position.value(),
            to: tile
          })
        } else {
          let res = await MovementAbilities.generic(HostedMapData.get(), this.ability, this.start_position.value(), tile)

          if (res) {
            const is_far_dive = this.ability == "dive" && await isFarDive(this.start_position.value(), res.tile)

            this.commit({
              type: "ability",
              ability: this.ability,
              is_far_dive: is_far_dive ? true : undefined,
              from: this.start_position.value(),
              to: res.tile
            })
          }
        }
      }
    })
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.current_target.set({tile: event.tile(), forced: event.original.shiftKey})
    })
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPre(() => {
      if (this.start_position.value() != null && event.original.key == "Backspace") {
        event.stopAllPropagation()
        this.start_position.set(null)
      }
    })

    event.onPost(() => {
      if (event.original.key == "Shift") this.current_target.update(c => {
        if (c) c.forced = true
      })
    })
  }

  eventKeyUp(event: GameMapKeyboardEvent) {
    event.onPost(() => {
      if (event.original.key == "Shift") this.current_target.update(c => {
        if (c) c.forced = false
      })
    })
  }
}