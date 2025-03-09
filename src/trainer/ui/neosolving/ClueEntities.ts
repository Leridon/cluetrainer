import {Rectangle} from "lib/math";
import {MapEntity} from "../../../lib/gamemap/MapEntity";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {areaPolygon, boxPolygon, tilePolygon} from "../polygon_helpers";
import {RenderingUtility} from "../map/RenderingUtility";
import {TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import {CursorType} from "../../../lib/runescape/CursorType";
import {FloorLevels} from "../../../lib/gamemap/ZoomLevels";
import Properties from "../widgets/Properties";
import {C} from "../../../lib/ui/constructors";
import {Clues} from "../../../lib/runescape/clues";
import {GameMap} from "../../../lib/gamemap/GameMap";

export namespace ClueEntities {

  import interactionMarker = RenderingUtility.interactionMarker;
  import activate = TileArea.activate;
  import npc = C.npc;
  import staticentity = C.staticentity;
  import digSpotRect = Clues.digSpotRect;
  import TalkTo = Clues.Solution.TalkTo;
  import Solution = Clues.Solution;
  import item = C.item;
  import hbox = C.hbox;

  export class NpcEntity extends MapEntity {

    floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }> = FloorLevels.none

    constructor(protected name: string, protected range: TileArea) {
      super();

      this.floor_sensitivity_layers = FloorLevels.special(range.origin.level)
    }

    bounds(): Rectangle {
      return TileArea.toRect(this.range)
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const floor_group = this.floor_sensitivity_layers.get(props.floor_group_index)

      if (props.highlight) {
        const range = areaPolygon(this.range)
          .setStyle({
            color: floor_group.value.correct_level ? "yellow" : "gray",
            interactive: false,
            opacity: 0.5,
            fillOpacity: 0.1
          }).addTo(this)
      }

      const marker = interactionMarker(activate(this.range).center(), "talk", props.highlight ? 1.5 : 1, true,
        floor_group.value.correct_level ? undefined : "ctr-entity-wrong-level"
      )
        .addTo(this)

      return marker.getElement()
    }
  }

  export class ObjectEntity extends MapEntity {

    floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }> = FloorLevels.none

    constructor(protected name: string,
                protected box: TileRectangle,
                protected cursor: CursorType | undefined) {
      super();

      this.floor_sensitivity_layers = FloorLevels.special(box.level)
    }

    bounds(): Rectangle {
      return this.box
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const floor_group = this.floor_sensitivity_layers.get(props.floor_group_index)

      const range = boxPolygon(this.box)
        .setStyle({
          color: "cyan",
          interactive: this.cursor == null,
          weight: props.highlight ? 4.5 : 3,
          opacity: 1,
          fillOpacity: 0.1,
          pane: GameMap.objectPane
        }).addTo(this)

      if (this.cursor) {
        const marker = interactionMarker(TileRectangle.center(this.box), this.cursor, props.highlight ? 1.5 : 1, true,
          floor_group.value.correct_level ? undefined : "ctr-entity-wrong-level"
        )
          .addTo(this)

        return marker.getElement()
      }

      return range.getElement()
    }
  }

  export class TalkSolutionNpcEntity extends NpcEntity {

    constructor(protected name: string, protected spot: TalkTo["spots"][number]) {
      super(name, spot.range);

      this
        .setTooltip(() => {
          const layout = new Properties()

          layout.header(hbox("Talk to", C.space(), npc(name), C.space(), "to solve the clue"))

          if (spot.note) {
            layout.named("Note", spot.note)
          }

          return layout
        })
    }
  }

  export class SearchSolutionEntity extends ObjectEntity {
    constructor(protected sol: Solution.Search) {
      super(sol.entity, sol.spot, "search");

      this.setTooltip(() => {
        const layout = new Properties()

        layout.header(hbox("Search", C.space(), staticentity(sol.entity), C.space(), "to solve the clue"))

        if (sol.key) {
          layout.named("Key", "If you do not have 'way of the footshaped key' unlocked, you will need to get a key.")

          layout.named("Instructions", sol.key.instructions)
          layout.named("Solution", sol.key.answer)
        }

        return layout
      })
    }
  }

  export class DigSolutionEntity extends MapEntity {
    floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }> = FloorLevels.none

    constructor(protected sol: Solution.Dig) {
      super();

      this.floor_sensitivity_layers = FloorLevels.special(sol.spot.level)

      this.setTooltip(() => {
        const layout = new Properties()

        if (sol.description) {
          layout.header(`Dig ${sol.description} to solve the clue`)
        } else {
          layout.header(`Dig at ${TileCoordinates.toString(this.sol.spot)} to solve the clue`)
        }

        return layout
      })
    }

    bounds(): Rectangle {
      return Rectangle.from(this.sol.spot)
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const floor_group = this.floor_sensitivity_layers.get(props.floor_group_index)

      const range = DigSolutionEntity.areaGraphics(this.sol.spot).addTo(this)

      const marker = interactionMarker(this.sol.spot, "shovel", props.highlight ? 1.5 : 1, true,
        floor_group.value.correct_level ? undefined : "ctr-entity-wrong-level"
      )
        .addTo(this)

      return marker.getElement()
    }
  }

  export namespace DigSolutionEntity {
    export function areaGraphics(spot: TileCoordinates, single_tile: boolean = false) {
      return (single_tile ? tilePolygon(spot) : boxPolygon(digSpotRect(spot)))
        .setStyle({
          color: "gray",
          interactive: false,
          opacity: 0.5,
          fillOpacity: 0.1
        })
    }
  }

  export class EmoteAreaEntity extends MapEntity {
    floor_sensitivity_layers: FloorLevels<{ correct_level: boolean }> = FloorLevels.none

    constructor(protected clue: Clues.Emote) {
      super();

      this.floor_sensitivity_layers = FloorLevels.special(clue.area.origin.level)

      this.setTooltip(() => {
        const layout = new Properties()

        layout.header("Emote area")

        if (clue.double_agent) {
          layout.paragraph(`Perform the ${clue.emotes.length > 1 ? "emotes" : "emote"} here. Kill the double agent to summon and talk to Uri.`)
        } else {
          layout.paragraph(`Perform the ${clue.emotes.length > 1 ? "emotes" : "emote"} here summon and talk to Uri.`)
        }

        {
          let row = c()

          for (let i = 0; i < clue.items.length; i++) {
            const itm = clue.items[i]

            if (i > 0) {
              if (i == clue.items.length - 1) row.append(", and ")
              else row.append(", ")
            }

            row.append(item(itm))
          }

          layout.named("Items", row)
        }

        {
          let row = c()

          for (let i = 0; i < clue.emotes.length; i++) {
            const emote = clue.emotes[i]

            if (i > 0) {
              if (i == clue.emotes.length - 1) row.append(", then ")
              else row.append(", ")
            }

            row.append(emote)
          }

          layout.named(clue.emotes.length != 1 ? "Emotes" : "Emote", row)
        }

        if (clue.double_agent) {
          layout.header("Spawns double agent", "left", 1)
        }

        return layout
      })
    }

    bounds(): Rectangle {
      return TileArea.toRect(this.clue.area)
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const floor_group = this.floor_sensitivity_layers.get(props.floor_group_index)

      const scale = props.highlight ? 2 : 1

      const range = areaPolygon(this.clue.area)
        .setStyle({
          color: "#914183",
          weight: scale * 2,
          pane: GameMap.areaPane
          //interactive: false,
        })
        .addTo(this)


      /*const marker = leaflet.marker(Vector2.toLatLong(Rectangle.center(TileArea.toRect(this.clue.area))), {
        icon: leaflet.icon({
          iconUrl: "/assets/icons/emotes.png",
          iconSize: [scale * 24, scale * 30],
          iconAnchor: [scale * 12, scale * 15],
          className: floor_group.value.correct_level ? "" : "ctr-entity-wrong-level"
        })
      }).addTo(this)*/

      return range.getElement()
    }
  }

  export class HideyHoleEntity extends ObjectEntity {

    constructor(protected clue: Clues.Emote, with_cursor: boolean) {
      super(clue.hidey_hole.name, clue.hidey_hole.location, with_cursor ? "equip" : undefined);

      this.setTooltip(() => {
        const layout = new Properties()

        layout.header(staticentity(this.clue.hidey_hole.name))

        layout.paragraph("Hidey-holes are used to store the items needed for an emote clue.")

        return layout
      })
    }
  }
}