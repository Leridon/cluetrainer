import {Path} from "../../../lib/runescape/pathing";
import {ValueInteraction} from "../../../lib/gamemap/interaction/ValueInteraction";
import {PathStepEntity} from "../../ui/map/entities/PathStepEntity";
import {SelectTileInteraction} from "../../../lib/gamemap/interaction/SelectTileInteraction";
import InteractionTopControl from "../../ui/map/InteractionTopControl";


export class DrawCosmeticInteraction extends ValueInteraction<Path.step_cosmetic> {
  constructor(private prototype: Path.step_cosmetic = {type: "cosmetic", icon: "notes", position: {x: 0, y: 0, level: 0}}) {
    super({
      preview_render: step => new PathStepEntity({...step, hide_when_not_hovered: false}).setInteractive(false)
    });

    this.attachTopControl(new InteractionTopControl({name: "Place Path Annotation"}).setContent(
      c("<div style='font-family: monospace; white-space:pre'></div>")
        .append(c().text(`Hold [Shift] to disable tile-snapping`))
    ))

    new SelectTileInteraction({}, {snap: 0.5, shift_snap: 0}).addTo(this)
      .onChange(v => {
        const t: Path.step_cosmetic = {
          ...this.prototype,
          position: v.value,
        }

        if (v.committed) this.commit(t)
        else this.preview(t)
      })
  }
}