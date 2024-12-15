import {NisModal} from "../lib/ui/NisModal";
import Properties from "../trainer/ui/widgets/Properties";
import LightButton from "../trainer/ui/widgets/LightButton";
import {SliderBenchmarkModal, SliderDataEntry} from "./SliderBenchmarking";
import {PDBGeneratorModal, RegionIndexingModal} from "./sliderdb/RegionEditor";
import {CompassReader} from "../trainer/ui/neosolving/cluereader/CompassReader";
import {clue_trainer_test_set} from "../test/tests";
import {PDBManager} from "../trainer/ui/neosolving/subbehaviours/SliderSolving";
import {makeshift_main} from "../trainer/main";
import {ImportModal} from "../trainer/ui/widgets/modals/ImportModal";
import {LogViewer} from "./LogViewer";
import {Log} from "../lib/util/Log";
import {deps} from "../trainer/dependencies";
import {SliderShuffleAnalysis} from "./SliderShuffleAnalysis";
import {Notification} from "../trainer/ui/NotificationBar";
import notification = Notification.notification;


export class DevelopmentModal extends NisModal {


  constructor() {
    super();

    this.setTitle("Super Secret Development Menu")
  }

  render() {
    super.render();

    const layout = new Properties().appendTo(this.body)

    layout.paragraph("Welcome to the super secret development menu! If you're not a developer, you probably won't find anything useful here, but feel free to take a look around. Important note: Some options may mess up your local data/settings without warning you about it before doing so!")

    layout.header("General")
    layout.row(new LightButton("Log Viewer", "rectangle")
      .onClick(() => {
        ImportModal.json<Log.LogBuffer>(txt => txt as Log.LogBuffer,
          buffer => {new LogViewer(buffer).show()},
        )
      })
    )

    layout.header("Slider Puzzles")

    layout.row(new LightButton("Benchmark Solvers", "rectangle")
      .onClick(() => {
        new SliderBenchmarkModal().show()
      })
    )

    layout.row(new LightButton("Generate PDB", "rectangle")
      .onClick(() => {
        new PDBGeneratorModal().show()
      })
    )

    layout.row(new LightButton("Benchmark Region Indexing", "rectangle")
      .onClick(() => {
        new RegionIndexingModal().show()
      })
    )

    layout.row(new LightButton("Delete local pdbs", "rectangle")
      .onClick(() => {
        PDBManager.instance.get().clearCache()
      })
    )

    layout.row(new LightButton("Analyze sliders", "rectangle")
      .onClick(() => {
        ImportModal.json(p => p as SliderDataEntry[],
          data => {
            new SliderShuffleAnalysis(data).show()
          }
        )
      })
    )

    layout.header("Compass")
    layout.row(new LightButton("Calibration Tool", "rectangle")
      .onClick(() => {
        new CompassReader.CalibrationTool().show()
      })
    )

    layout.header("Tests")

    layout.row(new LightButton("Run Tests", "rectangle")
      .onClick(() => {
        clue_trainer_test_set.run()
      })
    )
    layout.row(new LightButton("Run makeshift Main", "rectangle")
      .onClick(async () => {
        await makeshift_main()

        notification("Finished running makeshift main").show()
      })
    )

    layout.header("Other")

    layout.row(new LightButton("Open Development Utility Layer", "rectangle")
      .onClick(() => {
        deps().app.menu_bar.switchToTab("utility")
      })
    )

  }
}