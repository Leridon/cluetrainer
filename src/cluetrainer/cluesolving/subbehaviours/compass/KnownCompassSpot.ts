import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import Properties from "../../../ui/widgets/Properties";
import {Rectangle, Vector2} from "../../../../lib/math";
import * as leaflet from "leaflet";
import {levelIcon} from "../../../../lib/gamemap/GameMap";
import {CompassSolving} from "./CompassSolving";
import {TextRendering} from "../../../ui/TextRendering";
import render_digspot = TextRendering.render_digspot;
import {ClueEntities} from "../../ClueEntities";
import DigSolutionEntity = ClueEntities.DigSolutionEntity;

export class KnownCompassSpot extends MapEntity {
  constructor(public readonly spot: CompassSolving.SpotData) {
    super()

    this.setTooltip(() => {
      const layout = new Properties()

      layout.header(c().append("Compass spot ", render_digspot(this.spot.spot_id + 1)))

      layout.paragraph("Click to select as solution and view pathing.")

      return layout
    })
  }

  private possible: boolean = true
  private number: number | null = null
  private active: boolean = false

  setPossible(v: boolean, number: number): this {
    if (this.number != number || v != this.possible) {
      this.number = number
      this.possible = v

      this.requestRendering()
    }

    return this
  }

  setActive(v: boolean): this {
    if (v != this.active) {
      this.active = v
      this.requestRendering()
    }

    return this
  }

  bounds(): Rectangle {
    return Rectangle.from(this.spot.spot.spot)
  }

  protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
    const opacity = this.possible ? 1 : 0.5

    const scale = (this.active ? 1 : 0.5) * (props.highlight ? 1.5 : 1)

    const marker = leaflet.marker(Vector2.toLatLong(this.spot.spot.spot), {
      icon: levelIcon(this.spot.spot.spot.level, scale),
      opacity: opacity,
      interactive: true,
      bubblingMouseEvents: true,
    }).addTo(this)

    if (this.number != null) {
      marker.bindTooltip(leaflet.tooltip({
        content: this.number.toString(),
        className: "spot-number-on-map",
        offset: [0, 10],
        permanent: true,
        direction: "center",
        opacity: opacity
      }))
    }


    if (this.active) {
      DigSolutionEntity.areaGraphics(this.spot.spot.spot, this.spot.spot.clue.single_tile_target).addTo(this)
    }

    return marker.getElement()
  }
}