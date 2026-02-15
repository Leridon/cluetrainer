import {GameMapMouseEvent} from "../MapEvents";
import {GameMap} from "../GameMap";
import {ValueInteraction} from "./ValueInteraction";
import {TileRectangle} from "lib/runescape/coordinates/TileRectangle";
import {TileCoordinates} from "../../runescape/coordinates";
import {Observable, observe} from "lib/reactive";

export default class GameMapDragAction extends ValueInteraction<TileRectangle> {
  dragstart: TileCoordinates = null

  area = observe<{ area: TileRectangle, committed: boolean }>({area: null, committed: false})

  constructor(public config: ValueInteraction.option_t<TileRectangle>) {
    super(config);
  }

  onAdd(map: GameMap): this {
    super.onAdd(map)

    map.dragging.disable()
    return this
  }

  onRemove(map: GameMap): this {
    super.onRemove(map)
    map.dragging.enable()
    return this
  }

  start(tile: TileCoordinates): this {
    this.dragstart = tile

    return this
  }

  reset() {
    this.dragstart = null

    this.area.set({area: null, committed: false})
  }

  eventMouseDown(event: GameMapMouseEvent) {
    event.onPre(() => {
      if (!this.dragstart) {
        event.stopAllPropagation()

        this.dragstart = event.tile()

        this.preview(TileRectangle.fromTile(event.tile()))
      }
    })
  }

  eventMouseUp(event: GameMapMouseEvent) {
    event.onPre(() => {
      if (this.dragstart) {
        event.stopAllPropagation()

        this.commit(TileRectangle.from(this.dragstart, event.tile()))
      }
    })
  }

  eventClick(event: GameMapMouseEvent) {
    // Capture and consume the click event, so it does not get sent to the default interaction

    event.onPre(() => {
      event.stopAllPropagation()

      if (this.dragstart) this.commit(TileRectangle.from(this.dragstart, event.tile()))
      else this.commit(TileRectangle.fromTile(event.tile()))
    })
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      if (this.dragstart) {
        event.stopAllPropagation()

        this.preview(TileRectangle.from(this.dragstart, event.tile()))
      }
    })
  }
}