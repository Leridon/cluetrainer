import {Clues} from "../../../lib/runescape/clues";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import {floor_t, GieliCoordinates, TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import {Rectangle} from "../../../lib/math";
import Widget from "../../../lib/ui/Widget";
import {ClueProperties} from "./ClueProperties";
import {MapEntity} from "../../../lib/gamemap/MapEntity";
import {GameMapContextMenuEvent} from "../../../lib/gamemap/MapEvents";
import {Menu} from "../widgets/ContextMenu";
import {blue_marker, green_marker, red_marker, yellow_marker} from "../../../lib/gamemap/GameMap";
import * as leaflet from "leaflet";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import ClueSpot = Clues.ClueSpot;

export class ClueOverviewMarker extends MapEntity {
  constructor(private clue: Clues.ClueSpot,
              private methods: MethodPackManager,
              private edit_handler: (_: AugmentedMethod) => any,
              private talk_alternative_index?: number,
  ) {
    super();
    this.setInteractive()

    this.setTooltip(async () => {
      let self = this

      return (await new ClueProperties(
        self.clue,
        self.edit_handler,
        true,
        self.talk_alternative_index
      ).rendered()).row(c().text("Right click marker to manage methods.").css("font-style", "italic"))
    })
  }

  override bounds(): TileRectangle {
    return TileRectangle.from(ClueOverviewMarker.position(this.clue, this.talk_alternative_index))
  }

  protected async render_implementation(options: MapEntity.RenderProps): Promise<Element> {
    //let marker = new TileMarker(ClueOverviewMarker.position(this.clue, this.talk_alternative_index)).withMarker().addTo(this)

    const level_markers = [red_marker, blue_marker, green_marker, yellow_marker]

    const pos = ClueOverviewMarker.position(this.clue, this.talk_alternative_index)

    const highlight = options.highlight

    let marker = leaflet.marker([pos.y, pos.x], {
      icon: leaflet.icon({
        iconUrl: level_markers[pos.level],
        iconSize: highlight ? [27, 36] : [18, 24],
        iconAnchor: highlight ? [14, 36] : [9, 24],
        className: "marker-icon",
      }),
    }).addTo(this)

    return marker.getElement()
  }

  override async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
    return await ClueProperties.methodMenu(this.clue, this.edit_handler)
  }
}

export namespace ClueOverviewMarker {
  import activate = TileArea.activate;

  export function position(clue: Clues.ClueSpot, alternative_index?: number): TileCoordinates {
    switch (clue.clue.type) {
      case "anagram":
      case "simple":
      case "cryptic":
      case "map":
        switch (clue.clue.solution?.type) {
          case "talkto":
            let i = Math.min(alternative_index || 0, clue.clue.solution.spots.length)

            return activate(clue.clue.solution.spots[i].range).center()
          case "dig":
            return clue.clue.solution.spot
          case "search":
            return TileRectangle.center(clue.clue.solution.spot)
        }
        return {x: 0, y: 0, level: 0}
      case "compass":
        return clue.spot
      case "coordinates":
        return GieliCoordinates.toCoords(clue.clue.coordinates)
      case "emote":
        return activate(clue.clue.area).center()
      case "scan":
        return TileCoordinates.lift(Rectangle.center(Rectangle.from(...clue.clue.spots)), Math.min(...clue.clue.spots.map(s => s.level)) as floor_t)
      case "skilling":
        let i = alternative_index || 0

        if (i >= 0 && clue.clue.areas?.length > 0) {
          if (i >= clue.clue.areas.length) i = 0
          return activate(clue.clue.areas[i]).center()
        }

        break
    }

    return {x: 0, y: 0, level: 0}
  }


  export function forClue(spot: ClueSpot, method_index: MethodPackManager,
                          edit_handler: (_: AugmentedMethod) => any): ClueOverviewMarker[] {

    let variants: { instance_index?: number }[] = (() => {
      if (spot.clue.solution?.type == "talkto" && spot.clue.solution.spots) {
        return spot.clue.solution.spots.map((s, i) => ({instance_index: i}))
      } else if (spot.clue.type == "skilling") {
        return (spot.clue.areas || []).map((s, i) => ({instance_index: i}))
      } else return [{}]
    })()

    return variants.map(({instance_index}) => new ClueOverviewMarker(spot, method_index, edit_handler, instance_index))
  }
}