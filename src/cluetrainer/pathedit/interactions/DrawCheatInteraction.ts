import {TileCoordinates} from "../../../lib/runescape/coordinates/TileCoordinates";
import {direction} from "../../../lib/runescape/movement";
import {Path} from "../../../lib/runescape/pathing";
import {GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import InteractionTopControl from "../../ui/map/InteractionTopControl";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {PathStepEntity} from "../../ui/map/entities/PathStepEntity";
import {Vector2} from "../../../lib/math";

export class DrawCheatInteraction extends ValueInteraction<Path.step_cheat> {
  constructor(private start_from: TileCoordinates) {
    super({
      preview_render: (step) => new PathStepEntity(step).setInteractive(false)
    })

    this.attachTopControl(new InteractionTopControl().setName(`Drawing Cheat step`)
      .setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[Click] tile to confirm target.`))
      )
    )
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(async () => {
      event.stopAllPropagation()

      let tile = event.tile()

      const orientation = this.start_from
        ? direction.fromVector(Vector2.sub(tile, this.start_from))
        : undefined

      this.commit({
        type: "cheat",
        assumed_start: this.start_from,
        target: tile,
        ticks: 0,
        orientation: orientation
      })
    })
  }

  eventHover(event: GameMapMouseEvent) {
    this.preview({
      type: "cheat",
      assumed_start: this.start_from,
      target: event.tile(),
      ticks: 0
    })
  }
}