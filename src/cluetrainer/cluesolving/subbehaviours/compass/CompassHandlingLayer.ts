import {Rectangle, Transform, Vector2} from "../../../../lib/math";
import * as leaflet from "leaflet";
import {CompassSolving} from "./CompassSolving";
import { GameLayer } from "lib/gamemap/GameLayer";
import {Compasses} from "../../../cluetheory/Compasses";
import {KnownCompassSpot} from "./KnownCompassSpot";
import {TeleportSpotEntity} from "../../../ui/map/entities/TeleportSpotEntity";
import {GameMapMouseEvent} from "../../../../lib/gamemap/MapEvents";
import {PathStepEntity} from "../../../ui/map/entities/PathStepEntity";
import {TransportData} from "../../../../data/transports";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import activate = TileArea.activate;
import {Clues} from "../../../model/Clues";
import digSpotArea = Clues.digSpotArea;
import {TileRectangle} from "../../../../lib/runescape/coordinates";

export class CompassHandlingLayer extends GameLayer {
  private lines: {
    line: leaflet.Layer
  }[] = []

  constructor(private solving: CompassSolving) {
    super()

    this.solving.spots.forEach((e) =>
      e.marker = new KnownCompassSpot(e)
        .setInteractive(true)
        .addTo(this)
    )
  }

  async updateOverlay() {
    this.lines.forEach(l => {
      l.line.remove()
    })

    this.lines = []

    const information = this.solving.entries.filter(e => e.information).map(l => l.information)

    this.lines = information.map(info => {
      const from = info.origin

      const off = Vector2.transform(Vector2.scale(2000, Compasses.ANGLE_REFERENCE_VECTOR), Transform.rotationRadians(info.angle_radians.median))

      const to = Vector2.add(from, off)

      const right = Vector2.transform(info.direction, Transform.rotationRadians(Math.PI / 2))

      const corner_near_left = Vector2.add(from, Vector2.scale(info.origin_uncertainty, right))
      const corner_near_right = Vector2.add(from, Vector2.scale(-info.origin_uncertainty, right))


      const corner_far_left = Vector2.add(corner_near_left, Vector2.transform(off, Transform.rotationRadians(info.angle_radians.epsilon)))
      const corner_far_right = Vector2.add(corner_near_right, Vector2.transform(off, Transform.rotationRadians(-info.angle_radians.epsilon)))

      return {
        line:
          leaflet.featureGroup([
            leaflet.polyline([Vector2.toLatLong(from), Vector2.toLatLong(to)], {color: this.solving.settings.beam_color}),
            leaflet.polygon([
              Vector2.toLatLong(corner_near_left),
              Vector2.toLatLong(corner_near_right),
              Vector2.toLatLong(corner_far_right),
              Vector2.toLatLong(corner_far_left),
            ]).setStyle({
              stroke: false,
              fillOpacity: 0.2,
              color: this.solving.settings.beam_color
            })
          ]).addTo(this)
      }
    })
  }

  override eventClick(event: GameMapMouseEvent) {
    event.onPost(() => {

      if (event.active_entity instanceof TeleportSpotEntity) {
        this.solving.registerSpot(event.active_entity.teleport, false)
      } else if (event.active_entity instanceof PathStepEntity && event.active_entity.step.type == "teleport") {
        this.solving.registerSpot(TransportData.resolveTeleport(event.active_entity.step.id), false)
      } else if (event.active_entity instanceof KnownCompassSpot) {
        if (this.solving.entries.some(e => e.information) || !this.solving.captured_compass) {
          this.solving.setSelectedSpot(event.active_entity.spot, true)
        } else {
          this.solving.registerSpot(activate(this.solving.clue.single_tile_target ? TileArea.init(event.active_entity.spot.spot.spot) : digSpotArea(event.active_entity.spot.spot.spot)), true)
        }
      } else {
        this.solving.registerSpot(
          activate(TileArea.fromRect(TileRectangle.lift(
              Rectangle.centeredOn(event.tile(), this.solving.settings.manual_tile_inaccuracy),
              event.tile().level
            ))
          ), false
        )
      }
    })
  }
}