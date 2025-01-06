import Widget from "../../../../lib/ui/Widget";
import * as leaflet from "leaflet"
import LightButton from "../../widgets/LightButton";
import {Vector2} from "../../../../lib/math";
import {C} from "../../../../lib/ui/constructors";
import {observe} from "../../../../lib/reactive";
import ScanEditor from "./ScanEditor";
import ButtonRow from "../../../../lib/ui/ButtonRow";
import {Checkbox} from "../../../../lib/ui/controls/Checkbox";
import hboxc = C.hboxc;
import centered = C.centered;
import span = C.span;

export default class ScanTools extends Widget {
  normal = observe(false)
  complement = observe(false)

  expected_timing_display: Widget

  constructor(private editor: ScanEditor) {
    super();

    centered(
      c("<div style='font-weight: bold'>Center On</div>"),
      new ButtonRow({align: "center", sizing: "100px", max_center_spacer_width: "20px"}).buttons(
        new LightButton("Spots")
          .onClick(() => {
            let bounds = leaflet.latLngBounds([])

            this.editor.value.clue.clue.spots.forEach((c) => bounds.extend(Vector2.toLatLong(c)))

            bounds.pad(0.1)

            this.editor.app.map.fitBounds(bounds)
          }),
        new LightButton("Complement")
          .onClick(() => {
            let bounds = leaflet.latLngBounds([])

            this.editor.value.clue.clue.spots.forEach((c) => {
              bounds.extend(Vector2.toLatLong({
                x: c.x,
                y: (c.y < 6400 ? c.y + 6400 : c.y - 6400)
              }))
            })
            bounds.pad(0.1)

            this.editor.app.map.fitBounds(bounds)
          })
      ).addClass("ctr-button-container"),
      c("<div style='font-weight: bold'>Show Equivalence Classes</div>"),

      hboxc(
        new Checkbox("Spots").onCommit((v) => {
          this.normal.set(v)
        }),
        new Checkbox("Complement").onCommit((v) => {
          this.complement.set(v)
        })
      ),

      c("<div style='font-weight: bold'>Expected Average Time</div>"),
      this.expected_timing_display = c().css("text-align", "center").css("font-family", "monospace"),
    ).appendTo(this)

    this.editor.builder.augmented.subscribe(t => {
      const avg = span(t.state.timing_analysis.average.toFixed(2) + " ticks")

      const any_incomplete = t.state.timing_analysis.spots.some(s => s.timings.some(t => t.incomplete))

      if (any_incomplete) avg.css("color", "yellow").tooltip("Incomplete path")

      this.expected_timing_display.empty().append(avg)
    })

  }
}