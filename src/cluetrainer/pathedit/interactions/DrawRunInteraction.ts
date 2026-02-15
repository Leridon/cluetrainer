import {TileCoordinates} from "../../../lib/runescape/coordinates/TileCoordinates";
import {PathFinder} from "../../../lib/runescape/movement";
import {GameMapKeyboardEvent, GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import InteractionTopControl from "../../ui/map/InteractionTopControl";
import {Observable, observe} from "../../../lib/reactive";
import {util} from "../../../lib/util/util";
import {Path} from "../../../lib/runescape/pathing";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {PathGraphics} from "../../ui/path_graphics";
import * as leaflet from "leaflet";
import {Vector2} from "../../../lib/math";
import index = util.index;
import observe_combined = Observable.observe_combined;
import arrow = PathGraphics.arrow;
import createX = PathGraphics.createX;

class DrawRunInteractionInternal extends ValueInteraction<{
  path: TileCoordinates[],
  no_path_to: TileCoordinates
}> {
  private segments: Observable<{
    tiles: TileCoordinates[]
  }[]> = observe([])

  private path = this.segments.map(segments => {
    return segments.flatMap((segment, index) => index == 0 ? segment.tiles : segment.tiles.slice(1))
  })
  private last_position = this.path.map(s => index(s, -1)).equality(TileCoordinates.eq2)
  private has_start_position = this.last_position.map(p => !!p)

  private cached_pathfinding_state = this.last_position.map(p => p ? PathFinder.init_djikstra(p) : null)

  private previewed_segment: Observable<{
    target: TileCoordinates,
    forced: boolean,
    tiles: TileCoordinates[],
    broken: boolean
  }> = observe(null)

  constructor() {
    super({
      preview_render: (v) => {
        if (v) {
          const preview = leaflet.featureGroup()

          if (v.no_path_to) {
            arrow(index(v.path, -1), v.no_path_to).setStyle({
              color: "red"
            }).addTo(preview)

            let marker = createX(v.no_path_to,
              "yellow",
              16
            ).addTo(preview)

            marker.bindTooltip(leaflet.tooltip({
                content: `No path`,
                className: "run-drawing-tile-count",
                offset: [0, 20],
                permanent: true,
                direction: "center",
              })
            )
          } else {
            leaflet.polyline(
              //lines.map((t) => .map(Vector2.toLatLong)),
              v.path.map(Vector2.toLatLong),
              {
                color: "#b4b4b4",
                weight: 3,
              }
            ).addTo(preview)

            let marker = createX(index(v.path, -1),
              "yellow",
              16
            ).addTo(preview)

            marker.bindTooltip(leaflet.tooltip({
                content: `${PathFinder.pathLength(v.path)} tiles`,
                className: "run-drawing-tile-count",
                offset: [0, 20],
                permanent: true,
                direction: "center",
              })
            )
          }

          return preview
        }
      }
    })

    this.attachTopControl(
      new InteractionTopControl({name: "Drawing Run-Path"})
    )

    this.has_start_position.subscribe(has => {
      if (has) {
        this.top_control.setContent(
          c("<div style='font-family: monospace; white-space:pre'></div>")
            .append(c().text(`[Click] valid target tile to confirm.`))
            .append(c().text(`[Shift + Click] to place a forced waypoint.`))
            .append(c().text(`[Ctrl] to ignore all obstacles.`))
            .append(c().text(`[Backspace] to remove last waypoint.`))
        )
      } else {
        this.top_control.setContent(
          c("<div style='font-family: monospace; white-space:pre'></div>")
            .append(c().text(`[Click] any tile to start.`))
        )
      }
    }, true)

    observe_combined({segments: this.segments, previewed_segment: this.previewed_segment}).subscribe(({segments, previewed_segment}) => {
      let real_segments = segments.map(s => s.tiles)

      if (previewed_segment && !previewed_segment.broken) real_segments.push(previewed_segment.tiles)

      let waypoints = real_segments.flat()

      if (waypoints.length > 0) {
        this.preview({
          path: waypoints,
          no_path_to: previewed_segment?.broken ? previewed_segment.target : null
        })
      } else {
        this.preview(null)
      }
    })
  }

  setStartPosition(pos: TileCoordinates): this {
    if (pos) this.segments.set([{tiles: [pos]}])
    else this.segments.set([])

    return this
  }

  private getPathFindingState(): PathFinder.state {
    return this.cached_pathfinding_state.value()
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(async () => {
      event.stopAllPropagation()

      if (this.segments.value().length == 0) this.setStartPosition(event.tile())
      else {
        let segment =
          await (event.original.ctrlKey
            ? PathFinder.idealPath(this.last_position.value(), event.tile())
            : PathFinder.find(this.getPathFindingState(), TileArea.init(event.tile())))

        if (segment) {
          this.segments.update(w => w.push({tiles: segment}))
          this.previewed_segment.set(null)

          if (!event.original.shiftKey) {
            this.commit({
              path: this.path.value(),
              no_path_to: null
            })
          }
        }
      }
    })
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPost(async () => {
      this.updatePreview(event.tile(), event.original.ctrlKey)
    })
  }

  private async updatePreview(tile: TileCoordinates, force: boolean) {
    if (this.last_position.value()) {
      let segment =
        await (force
          ? PathFinder.idealPath(this.last_position.value(), tile)
          : PathFinder.find(this.getPathFindingState(), TileArea.init(tile)))

      this.previewed_segment.set({
        target: tile,
        forced: force,
        broken: !segment,
        tiles: segment
      })
    } else {
      this.previewed_segment.set(null)
    }
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPost(() => {
      if (event.original.key == "Control" && this.previewed_segment.value()) {
        event.stopAllPropagation()
        this.updatePreview(this.previewed_segment.value().target, true)
      }

      if (event.original.key == "Backspace") {
        event.stopAllPropagation()

        this.segments.update(s => s.splice(s.length - 1, 1))

        if (this.previewed_segment.value()) {
          this.updatePreview(this.previewed_segment.value().target, this.previewed_segment.value().forced)
        }
        this.previewed_segment.update(() => {})
      }
    })
  }

  eventKeyUp(event: GameMapKeyboardEvent) {
    event.onPost(() => {
      if (event.original.key == "Control" && this.previewed_segment.value()) {
        event.stopAllPropagation()
        this.updatePreview(this.previewed_segment.value().target, false)
      }
    })
  }
}

function normalizeWaypoints(waypoints: TileCoordinates[]): TileCoordinates[] {
  const result: TileCoordinates[] = []

  for (const p of waypoints) {
    if (!TileCoordinates.equals(p, result[result.length - 1])) result.push(p)
  }

  return result
}

export default class DrawRunInteraction extends ValueInteraction<Path.step_run> {
  internal: DrawRunInteractionInternal

  constructor() {
    super();

    this.internal = new DrawRunInteractionInternal()
      .onCommit(v => {
        this.commit(({
          type: "run",
          waypoints: normalizeWaypoints(v.path)
        }))
      })
      .onDiscarded(() => this.cancel())
      .addTo(this)
  }

  setStartPosition(pos: TileCoordinates): this {
    this.internal.setStartPosition(pos)

    return this
  }
}