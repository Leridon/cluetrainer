import {NisModal} from "../lib/ui/NisModal";
import Properties from "../cluetrainer/ui/widgets/Properties";
import {crowdsourcedSliderData, SliderDataEntry} from "./SliderBenchmarking";
import lodash from "lodash";
import Widget from "../lib/ui/Widget";
import {Sliders} from "../cluetrainer/cluetheory/Sliders";
import {C} from "../lib/ui/constructors";
import SliderState = Sliders.SliderState;
import hbox = C.hbox;
import spacer = C.spacer;
import hgrid = C.hgrid;

export class SliderShuffleAnalysis extends NisModal {
  layout: Properties

  constructor(private dataset: SliderDataEntry[]) {
    super({size: "fullscreen"});

    this.title.set("Slider Analysis Modal")
  }

  override render() {
    super.render();

    this.layout = new Properties().appendTo(this.body)

    this.run()
  }

  async run() {
    this.layout.empty()

    type SliderAnalysis = {
      original: DataSet
      tile_frequency: number[][],
      counts: [SliderState, SliderDataEntry[]][]
    }

    type DataSet = {
      states: SliderDataEntry[],
      name: string
    }

    const ANALYSE_UNIQUENSS = false

    function analyse(dataset: DataSet): SliderAnalysis {
      const data = new Array(25).fill(0).map(() => new Array(25).fill(0))
      const counts: [SliderState, SliderDataEntry[]][] = []

      for (let state of dataset.states) {
        if (!state) debugger

        state.state.forEach((tile_id, position_id) => {
          data[tile_id][position_id]++ // First index: The tile id, i.e., where the tile should be. Second index: Where the tile currently is
        })

        if (ANALYSE_UNIQUENSS) {
          const c_tuple = counts.find(([key, value]) => SliderState.equals(key, state.state))

          if (c_tuple) c_tuple[1].push(state)
          else counts.push([state.state, [state]])
        }
      }

      return {
        original: dataset,
        tile_frequency: data,
        counts: ANALYSE_UNIQUENSS ? counts : undefined
      }
    }

    function heatMapColorforValue(value: number) {
      const r_value = lodash.clamp((1 - value) * 510, 0, 255)
      const g_value = lodash.clamp(value * 510, 0, 255)

      return `rgb(${r_value.toFixed(0)}, ${g_value.toFixed(0)}, 0)`

      var h = (1.0 - value) * 240
      return "hsl(" + h + ", 100%, 50%)";
    }

    function render(layout: Properties, analysis: SliderAnalysis): Widget {
      const container = c()


      const INVERTED = false

      layout.header(analysis.original.name)
      if (analysis.counts) {
        layout.paragraph(`Analysis based on ${analysis.original.states.length} initial slider states containing ${analysis.counts?.length} unique states.`)
      } else {
        layout.paragraph(`Analysis based on ${analysis.original.states.length} initial slider states.`)
      }

      layout.paragraph(`The outer 5 by 5 grid refers to where the respective tile belongs. The inner 5 by 5 grid shows where this tile is most likely to spawn.`)

      if (analysis.counts && analysis.counts.length != analysis.original.states.length) {
        for (let [state, duplicates] of analysis.counts.filter(c => c[1].length > 1)) {
          layout.header(state.toString(), "left", 1)

          layout.row(duplicates.map((entry, i) => {
            return `${new Date(entry.timestamp).toString()} (${entry.theme}, ${entry.id})`
          }).join(", "))
        }
      }

      layout.row(hbox(spacer(), container, spacer()))

      for (let should_y = 0; should_y < 5; should_y++) {

        const outer_row = hgrid().appendTo(container)

        for (let should_x = 0; should_x < 5; should_x++) {
          const should_tile = should_y * 5 + should_x

          const spawn_distribution = INVERTED
            ? analysis.tile_frequency.map(t => t[should_tile])
            : analysis.tile_frequency[should_tile]

          const outer_tile = c()
            .css2({
              "border": "1px solid white",
              "padding": "5px",
              "margin": "10px"
            })
            .appendTo(outer_row)

          const frequencies = spawn_distribution.map(count => count / analysis.original.states.length)

          const max_frequency = Math.max(...frequencies, 1 / 12)

          for (let is_y = 0; is_y < 5; is_y++) {
            const inner_row = hgrid().appendTo(outer_tile)

            for (let is_x = 0; is_x < 5; is_x++) {

              const is_tile = is_y * 5 + is_x

              const frequency = frequencies[is_tile]

              function scale(f: number): number {
                if (f <= (1 / 24)) return 0.5 * f / (1 / 24)
                else return 0.5 + 0.5 * (f - (1 / 24)) / (max_frequency - (1 / 24))
              }

              const tile = c()
                .css2({
                  "margin": "2px",
                  "border": is_tile == should_tile ? "2px solid blue" : "2px solid white",
                  "border-radius": "3px",
                  "max-width": "40px",
                  "max-height": "40px",
                  "min-width": "40px",
                  "min-height": "40px",
                  "line-height": "40px",
                  "text-align": "center",
                  "background-color": frequency == 0 ? "none" : heatMapColorforValue(scale(frequency)),
                  "text-shadow": "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                  "font-weight": "bold",
                  "mix-blend-mode": "difference"
                })
                .text(`${(100 * frequency).toFixed(1)}%`)
                .tooltip(
                  (INVERTED
                    ? analysis.tile_frequency[is_tile][should_tile]
                    : analysis.tile_frequency[should_tile][is_tile]).toString() + " samples"
                )
                .appendTo(inner_row)
            }
          }
        }
      }

      return container
    }

    const crowdsourced_data: SliderDataEntry[] = await crowdsourcedSliderData.get()

    /*
    const datasets: DataSet[] = [
      {
        name: "Truly shuffled", states: new Array(10000).fill(0).map((_, i) => ({
          state: SliderState.createRandom(),
          id: i,
          theme: null,
          timestamp: Date.now()
        }))
      },
      {name: "Crowdsourced", states: crowdsourced_data},
    ]*/

    render(this.layout, analyse({
      name: "Loaded file",
      states: this.dataset
    }))
  }
}