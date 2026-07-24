import {GameMapControl} from "../GameMapControl";
import {floor_t} from "../../runescape/coordinates";
import {GameMap} from "../GameMap";
import {GameMapKeyboardEvent} from "../MapEvents";
import Widget from "../../ui/Widget";

export default class FloorControl extends GameMapControl {
  private up: Widget
  private down: Widget
  private current: Widget

  constructor() {
    super({
      position: "bottom-right",
      type: "floating"
    }, c("<div style='display: flex' class='nis-map-control'>"));

    this.down = c("<div style='cursor: pointer'><img src='assets/icons/stairdown.png' style='width: 20px; padding: 4px'></div>")
      .tooltip("Go down (PageDown)")
      .tapRaw(r => r.on("click", (e) => {
        e.stopPropagation()
        this.goDown()
      }))
      .appendTo(this.content.container)
    this.current = c("<div style='border-left: 1px solid rgb(5, 56, 66); border-right: 1px solid rgb(5, 56, 66); padding-left: 4px; padding-right: 4px; line-height: 20px'>Floor 0</div>").appendTo(this.content.container)
    this.up = c("<div style='cursor: pointer'><img src='assets/icons/stairup.png' style='width: 20px; padding: 4px'></div>")
      .tooltip("Go up (PageUp)")
      .tapRaw(r => r.on("click", (e) => {
        e.stopPropagation()
        this.goUp()
      }))
      .appendTo(this.content.container)

    this.content.container.on("click", (e) => e.stopPropagation())
  }

  private goUp(): void {
    this.parent.getMap().floor.set(floor_t.clamp((this.parent.getMap().floor.value() + 1)))
  }

  private goDown(): void {
    this.parent.getMap().floor.set(floor_t.clamp((this.parent.getMap().floor.value() - 1)))
  }

  override onAdd(map: GameMap) {
    map.floor.subscribe((f) => this.current.text(`Floor ${f}`))

    return super.onAdd(map)
  }

  override eventKeyDown(event: GameMapKeyboardEvent) {

    event.onPre(() => {
      if (event.leaflet.originalEvent.key == "PageUp") {
        this.goUp()
      } else if (event.leaflet.originalEvent.key == "PageDown") {
        this.goDown()
      }
    })
  }
}