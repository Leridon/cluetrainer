import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import {GameMapMouseEvent} from "../../../lib/gamemap/MapEvents";
import * as leaflet from "leaflet"
import {boxPolygon, tilePolygon} from "../polygon_helpers";
import InteractionTopControl from "../map/InteractionTopControl";
import {GameMap} from "../../../lib/gamemap/GameMap";
import ButtonRow from "../../../lib/ui/ButtonRow";
import LightButton from "../widgets/LightButton";
import {util} from "../../../lib/util/util";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {Notification} from "../NotificationBar";
import {DrawArrowInteraction} from "../../pathedit/interactions/DrawArrowInteraction";
import {Rectangle} from "../../../lib/math";
import cleanedJSON = util.cleanedJSON;
import notification = Notification.notification;
import activate = TileArea.activate;

export class DrawTileAreaInteraction extends ValueInteraction<TileCoordinates[]> {
  drawing: {
    additive: boolean
  } | null

  tiles: TileCoordinates[] = []

  constructor(start_tiles: TileCoordinates[] = [], private show_commands: ("commit" | "copy" | "copytiles" | "reset")[] = []) {
    super({
      preview_render: area => leaflet.featureGroup(
        area.map(tile => tilePolygon(tile)
          .setStyle({
            color: "blue",
            fillOpacity: 0.4,
            stroke: false
          })
        )
      )
    });

    this.tiles = start_tiles

    this.preview(this.tiles)

    this.attachTopControl(new InteractionTopControl({name: "Draw Tile Area"})
      .setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[Shift + Mouse] add tiles`))
          .append(c().text(`[Alt + Mouse] remove tiles`))
          .append(c().text(`Hold [Ctrl] to draw rectangles`))
          .append(this.show_commands.length == 0 ? undefined : new ButtonRow()
            .buttons(
              ...show_commands.map(command => {
                switch (command) {
                  case "commit":
                    return new LightButton("Confirm")
                      .onClick(() => {
                        this.commit(this.tiles)
                      })
                  case "copy":
                    return new LightButton("Copy")
                      .onClick(() => {
                        if (this.tiles.length > 0) {
                          navigator.clipboard.writeText(cleanedJSON(TileArea.fromTiles(this.tiles)))
                          notification("Copied").show()
                        } else {
                          notification("No tiles", "error")
                        }
                      })
                  case "copytiles":
                    return new LightButton("Copy Array")
                      .onClick(() => {
                        if (this.tiles.length > 0) {
                          navigator.clipboard.writeText(cleanedJSON(this.tiles))
                          notification("Copied").show()
                        } else {
                          notification("No tiles", "error")
                        }

                      })
                  case "reset":
                    return new LightButton("Reset")
                      .onClick(() => {
                        this.tiles = []

                        this.preview(this.tiles)
                      })
                }
              })
            )
          )
      )
    )
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

  private set(adding: boolean, ...tiles: TileCoordinates[]) {
    let changed = false
    tiles.forEach(tile => {
      const index = this.tiles.findIndex(t => TileCoordinates.eq2(t, tile))
      const contains = index >= 0

      if (adding !== contains) {
        if (adding) this.tiles.push(tile)
        else this.tiles.splice(index, 1)

        changed = true
      }
    })

    if (changed) this.preview(this.tiles)
  }

  private toggle(tile: TileCoordinates): boolean {
    const index = this.tiles.findIndex(t => TileCoordinates.eq2(t, tile))
    const contains = index >= 0

    if (!contains) this.tiles.push(tile)
    else this.tiles.splice(index, 1)

    this.preview(this.tiles)

    return !contains
  }

  private activeRectangleDrawing: DrawArrowInteraction

  eventMouseDown(event: GameMapMouseEvent) {
    super.eventMouseDown(event);
    event.onPost(() => {

      if (event.original.shiftKey || event.original.altKey) {
        event.original.preventDefault()

        const additive = event.original.shiftKey

        this.getMap().dragging.disable()

        if (event.original.ctrlKey) {

          if (!this.activeRectangleDrawing)
            this.activeRectangleDrawing = new DrawArrowInteraction(false)
              .attachTopControl(null)
              .setStartPosition(event.tile())
              .setPreviewFunction(([a, b]) => boxPolygon(Rectangle.from(a, b))
                .setStyle({
                  color: additive ? "green" : "red",
                  stroke: true
                })
              )
              .onCommit(([a, b]) => {
                if (this.activeRectangleDrawing) {
                  this.activeRectangleDrawing.remove()
                  this.activeRectangleDrawing = null
                }

                const rect = TileRectangle.from(a, b)

                this.set(additive, ...activate(TileArea.fromRect(rect)).getTiles())
              })
              .addTo(this)
        } else {

          this.drawing = {
            additive: event.original.shiftKey
          }

          this.set(additive, event.tile())
        }
      }
    })
  }

  eventMouseUp(event: GameMapMouseEvent) {

    event.onPost(() => {
      this.drawing = null

      this.getMap().dragging.enable()
    })
  }

  eventHover(event: GameMapMouseEvent) {
    super.eventHover(event);

    event.onPost(() => {
      if (this.drawing) {
        event.onPost(() => {
          this.set(this.drawing.additive, event.tile())
        })
      }
    })

  }
}