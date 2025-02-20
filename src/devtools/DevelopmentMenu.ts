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
import {ClueReader} from "../trainer/ui/neosolving/cluereader/ClueReader";
import notification = Notification.notification;
import {CapturedImage} from "../lib/alt1/capture";


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
    layout.row(new LightButton("Log Viewer")
      .onClick(() => {
        ImportModal.json<Log.LogBuffer>(txt => txt as Log.LogBuffer,
          buffer => {new LogViewer(buffer).show()},
        )
      })
    )

    layout.header("Slider Puzzles")

    layout.row(new LightButton("Benchmark Solvers")
      .onClick(() => {
        new SliderBenchmarkModal().show()
      })
    )

    layout.row(new LightButton("Generate PDB")
      .onClick(() => {
        new PDBGeneratorModal().show()
      })
    )

    layout.row(new LightButton("Benchmark Region Indexing")
      .onClick(() => {
        new RegionIndexingModal().show()
      })
    )

    layout.row(new LightButton("Delete local pdbs")
      .onClick(() => {
        PDBManager.instance.get().clearCache()
      })
    )

    layout.row(new LightButton("Analyze sliders")
      .onClick(() => {
        ImportModal.json(p => p as SliderDataEntry[],
          data => {
            new SliderShuffleAnalysis(data).show()
          }
        )
      })
    )

    layout.header("Compass")
    layout.row(new LightButton("Calibration Tool")
      .onClick(() => {
        new CompassReader.CalibrationTool().show()
      })
    )

    layout.header("Readers")

    layout.row(new LightButton("Test Screenshot")
      .onClick(async () => {
        const reader = new ClueReader(false)

        await reader.initialization.wait()

        ImportModal.img(img => {
          console.log(reader.read(CapturedImage.bind(img)))
        })
      })
    )

    layout.header("Tests")

    layout.row(new LightButton("Run Tests")
      .onClick(() => {
        clue_trainer_test_set.run()
      })
    )
    layout.row(new LightButton("Run makeshift Main")
      .onClick(async () => {
        await makeshift_main()

        notification("Finished running makeshift main").show()
      })
    )

    layout.header("Other")

    layout.row(new LightButton("Open Development Utility Layer")
      .onClick(() => {
        deps().app.menu_bar.switchToTab("utility")
      })
    )

  }
}