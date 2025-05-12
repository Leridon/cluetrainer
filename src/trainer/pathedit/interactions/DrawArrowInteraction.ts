import {TileCoordinates} from "../../../lib/runescape/coordinates/TileCoordinates";
import {GameMapKeyboardEvent, GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import InteractionTopControl from "../../ui/map/InteractionTopControl";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {Observable, observe} from "../../../lib/reactive";
import {PathGraphics} from "../../ui/path_graphics";
import arrow = PathGraphics.arrow;
import observe_combined = Observable.observe_combined;

export class DrawArrowInteraction extends ValueInteraction<[TileCoordinates, TileCoordinates]> {
  private start_position: Observable<TileCoordinates> = observe(null).equality(TileCoordinates.eq2)
  private previewed_target_position: Observable<TileCoordinates> = observe(null).equality(TileCoordinates.eq2)
  private snap_target_position: Observable<boolean> = observe(true)

  constructor(private allow_off_grid: boolean) {
    super({
      preview_render: ([from, to]) => {
        return arrow(from, to).setStyle({
          weight: 3,
          color: "gold"
        })
      }
    })

    observe_combined({start: this.start_position, target: this.previewed_target_position, snap: this.snap_target_position})
      .subscribe(({start, target, snap}) => {
        if (start && target) {
          if (snap) this.preview([start, TileCoordinates.snap(target)])
          else this.preview([start, target])
        }
      })

    this.attachTopControl(new InteractionTopControl().setName(`Drawing arrow`))

    this.start_position.subscribe(() => this.updateInstructions(), true)
  }

  updateInstructions() {
    if(!this.top_control) return

    if (this.start_position.value()) {
      this.top_control.setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[Click] target tile to confirm.`))
          .append(this.allow_off_grid ? c().text(`[Shift] to disable tile snapping.`) : undefined)
          .append(c().text(`[Backspace] to reset start tile.`))
      )
    } else {
      this.top_control.setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[Click] tile to set start position.`))
          .append(this.allow_off_grid ? c().text(`[Shift] to disable tile snapping.`) : undefined)
      )
    }
  }

  setStartPosition(pos: TileCoordinates): this {
    this.start_position.set(pos)

    return this
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(async () => {
      event.stopAllPropagation()

      if (!this.start_position.value()) {
        this.start_position.set(event.coordinates)
      } else {
        if (this.snap_target_position.value()) this.commit([this.start_position.value(), event.tile()])
        else this.commit([this.start_position.value(), event.coordinates])
      }
    })
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPost(() => {
      if (this.start_position.value()) {
        this.previewed_target_position.set(event.coordinates)
      }
    })
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPre(() => {
      if (this.start_position.value() != null && event.original.key == "Backspace") {
        event.stopAllPropagation()
        this.start_position.set(null)
      }
    })

    if(this.allow_off_grid) {
      event.onPost(() => {
        if (event.original.key == "Shift") this.snap_target_position.set(false)
      })
    }
  }

  eventKeyUp(event: GameMapKeyboardEvent) {
    if(this.allow_off_grid) {
      event.onPost(() => {
        if (event.original.key == "Shift") this.snap_target_position.set(true)
      })
    }
  }
}