import {GameMapControl} from "../../../lib/gamemap/GameMapControl";
import TextField from "../../../lib/ui/controls/TextField";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import {Rectangle} from "../../../lib/math";
import LightButton from "../widgets/LightButton";
import {C} from "../../../lib/ui/constructors";
import ControlWithHeader from "../map/ControlWithHeader";
import hbox = C.hbox;
import vbox = C.vbox;


export class NavigationControl extends GameMapControl {
  chunk_in: TextField
  coords_in: TextField

  constructor() {
    super({
      position: "bottom-right",
      type: "floating"
    }, c());


    this.setContent(new ControlWithHeader("Navigation").setContent(
      vbox(
        hbox(
          this.chunk_in = new TextField()
            .onCommit(() => this.commitChunk())
          ,
          new LightButton("Chunk")
            .css("width", "50px")
            .onClick((v) => this.commitChunk())
        ),
        hbox(
          this.coords_in = new TextField()
            .onCommit((v) => this.commitCoords()),
          new LightButton("Coords")
            .css("width", "50px")
            .onClick((v) => this.commitCoords())
        )
      )
    ))
  }

  commitChunk() {
    const v = this.chunk_in.get() ?? ""

    if (!v) return

    let nums = v.split(new RegExp("[^0-9]"))
      .map(e => e.trim())
      .filter(e => e.length > 0)
      .map(e => Number(e))

    if (nums.length >= 2) {
      this.getMap().fitView(TileRectangle.lift(Rectangle.from({x: nums[0] * 64, y: nums[1] * 64}, {x: nums[0] * 64 + 63, y: nums[1] * 64 + 63}), 0))
    }

    this.chunk_in.setValue("")
  }

  commitCoords() {
    const v = this.coords_in.get() ?? ""

    if (!v) return

    let nums = v.split(new RegExp("[^0-9]"))
      .map(e => e.trim())
      .filter(e => e.length > 0)
      .map(e => Number(e))


    if (nums.length >= 2) {
      this.getMap().fitView(TileRectangle.lift(Rectangle.from({x: nums[0], y: nums[1]}), 0))
    }

    this.coords_in.setValue("")
  }
}