import {GameMapMouseEvent} from "../MapEvents";
import {ValueInteraction} from "./ValueInteraction";
import {TileCoordinates} from "../../runescape/coordinates";
import InteractionTopControl from "../../../cluetrainer/ui/map/InteractionTopControl";

export class SelectTileInteraction extends ValueInteraction<TileCoordinates> {
  constructor(public override config: ValueInteraction.option_t<TileCoordinates> = {}, protected conf: {
    snap?: number,
    shift_snap?: number
  } = {snap: 1, shift_snap: 1}) {
    super(config)
  }

  protected coordinatesOfEvent(event: GameMapMouseEvent): TileCoordinates {
    const granularity = event.original.shiftKey ? (this.conf.shift_snap ?? 1) : (this.conf.snap ?? 1)

    return TileCoordinates.snap(event.coordinates, granularity)
  }

  override eventHover(event: GameMapMouseEvent) {
    super.eventHover(event);

    event.onPre(() => {
      this.preview(this.coordinatesOfEvent(event))
    })
  }

  override eventClick(event: GameMapMouseEvent) {
    event.onPre(() => {
      event.stopAllPropagation()

      this.commit(this.coordinatesOfEvent(event))
    })
  }
}

export namespace SelectTileInteraction {
  export type OffTileMode = "always" | "never" | "optional"

  export class Standalone extends SelectTileInteraction {
    constructor(config: ValueInteraction.option_t<TileCoordinates> = {}, private off_tile: SelectTileInteraction.OffTileMode = "never") {
      super(config, {
        "always": {snap: 0, shift_snap: 0},
        "never": {snap: 1, shift_snap: 1},
        "optional": {snap: 1, shift_snap: 0},
      }[off_tile])

      switch (this.off_tile) {
        case "never":
          this.attachTopControl(new InteractionTopControl({name: "Select Tile"}).setText("Click a tile to select it."))
          break;
        case "optional":
          this.attachTopControl(new InteractionTopControl({name: "Select Tile"}).setContent(
            c("<div style='font-family: monospace; white-space:pre'></div>")
              .append(c().text(`Hold [Shift] to disable snapping`))
          ))
          break;
        case "always":
          this.attachTopControl(new InteractionTopControl({name: "Select Coordinates"}).setText("Click the map to select coordinates."))

      }

    }

  }
}