import {GameLayer} from "../../../lib/gamemap/GameLayer";
import {ClueSpotIndex} from "../../../lib/runescape/clues/ClueIndex";
import {clue_data} from "../../../data/clues";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import {FilterControl} from "./Filtering";
import {ClueOverviewMarker} from "./OverviewMarker";
import {Clues} from "../../../lib/runescape/clues";
import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import {DisplayedRouteFilter, DisplayedRouteFilterEdit} from "./DisplayedRouteFilter";
import TheoryCrafter from "./TheoryCrafter";
import * as leaflet from "leaflet"
import ControlWithHeader from "../map/ControlWithHeader";
import {deps} from "../../dependencies";
import {PathStepEntity} from "../map/entities/PathStepEntity";
import {storage} from "../../../lib/util/storage";
import {SolvingMethods} from "../../model/methods";
import ClueSpot = Clues.ClueSpot;
import Method = SolvingMethods.Method;

export default class OverviewLayer extends GameLayer {
  route_display_options = new storage.Variable<DisplayedRouteFilter>("preferences/overview_route_display", () => ({type: "none"}))

  filter_control: FilterControl
  route_control: DisplayedRouteFilterEdit

  public marker_index: ClueSpotIndex<{
    markers: ClueOverviewMarker[],
    route_display: leaflet.Layer
  }>

  update_promise: Promise<any> = Promise.resolve()

  constructor(private theorycrafter: TheoryCrafter) {
    super();

    this.filter_control = new FilterControl(MethodPackManager.instance(), m => theorycrafter.editMethod(m)).addTo(this)

    new GameMapControl({
        type: "floating", position: "top-right"
      }, new ControlWithHeader("Show routes")
        .setContent(
          this.route_control = new DisplayedRouteFilterEdit()
            .setValue(this.route_display_options.get())
            .onCommit((f) => {
              this.route_display_options.set(f)
              this.updateVisibleRoutes()
            })
        ).css("width", "200px")
    ).addTo(this)

    this.marker_index = clue_data.spot_index.with(() => ({markers: [], route_display: null}))

    this.filter_control.filtered_index_updated.on(() => this.updateVisibleMarkersByFilter())
    this.updateVisibleMarkersByFilter()
  }

  async updateVisibleMarkersByFilter() {
    await this.update_promise

    this.update_promise = Promise.all(this.marker_index.flat().map(async c => {
        let visible = this.filter_control.index.get(ClueSpot.toId(c.for)).visible

        if (!visible && c.markers.length > 0) {
          c.markers.forEach(c => this.removeLayer(c))
          c.markers = []
        }

        if (visible && c.markers.length == 0) {
          c.markers = ClueOverviewMarker.forClue(c.for, MethodPackManager.instance(), m => this.theorycrafter.editMethod(m))
          c.markers.forEach(m => m.addTo(this))
        }
      })
    )

    await this.updateVisibleRoutes()
  }

  private async updateVisibleRoutes() {
    await this.update_promise

    const filter = this.route_control.get()

    this.update_promise = (async () => {
      for (const c of this.marker_index.flat()) {
        let method: AugmentedMethod = null

        if (c.markers.length > 0) {
          switch (filter.type) {
            case "favourites":
              method = await deps().app.favourites.getMethod(ClueSpot.toId(c.for))

              break;
            case "pack":
              if (!filter.local_pack_id) break;

              const methods = await MethodPackManager.instance().get(c.for, [filter.local_pack_id])

              if (methods.length > 0) method = methods[0]

              break;
          }
        }

        if (c.route_display) {
          c.route_display.remove()
          c.route_display = null
        }

        if (method) {
          c.route_display = PathStepEntity.renderPath(Method.allPaths(method.method)).addTo(this)
        }
      }
    })()

    await this.update_promise
  }
}
