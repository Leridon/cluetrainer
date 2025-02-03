import {NeoSolvingSubBehaviour} from "../../NeoSolvingSubBehaviour";
import NeoSolvingBehaviour from "../../NeoSolvingBehaviour";
import {Clues} from "../../../../../lib/runescape/clues";
import {CapturedScan} from "../../cluereader/capture/CapturedScan";
import {Scans} from "../../../../../lib/runescape/clues/scans";
import {deps} from "../../../../dependencies";
import {ScanSolving} from "./ScanSolving";
import {TileArea} from "../../../../../lib/runescape/coordinates/TileArea";
import {TileCoordinates, TileRectangle} from "../../../../../lib/runescape/coordinates";
import {ScanMinimapOverlay} from "./ScanMinimapOverlay";
import {GameLayer} from "../../../../../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../../../../../lib/gamemap/MapEvents";
import {ScanEditLayer} from "../../../theorycrafting/scanedit/ScanEditor";
import digSpotArea = Clues.digSpotArea;
import {MinimapReader} from "../../../../../lib/alt1/readers/MinimapReader";
import {ScanCaptureService, ScanPanelOverlay} from "./ScanPanelReader";

export class SimpleScanSolving extends NeoSolvingSubBehaviour {
  settings: ScanSolving.Settings
  private minimap_overlay: ScanMinimapOverlay

  private scan_panel_capture_service: ScanCaptureService
  private scan_panel_overlay: ScanPanelOverlay

  constructor(parent: NeoSolvingBehaviour,
              private clue: Clues.Scan,
              private original_interface_capture: CapturedScan
  ) {
    super(parent, "clue");

    this.settings = deps().app.settings.settings.solving.scans

    if (this.original_interface_capture) {
      this.minimap_overlay = this.withSub(new ScanMinimapOverlay(MinimapReader.instance(), parent.app.settings.observable_settings.map(s => s.solving.scans).structuralEquality(), "manual").setRange(Scans.range(clue, this.original_interface_capture.hasMeerkats())))
    }

    this.scan_panel_capture_service = new ScanCaptureService(this.original_interface_capture)
    this.scan_panel_overlay = this.withSub(new ScanPanelOverlay(this.scan_panel_capture_service))
  }

  private selected_solution: TileCoordinates = null

  private handling_layer: GameLayer = null

  protected begin() {
    this.registerSolution(
      TileArea.fromRect(
        TileRectangle.extend(TileRectangle.from(...this.clue.spots), 1)
      )
    )

    const self = this

    this.parent.layer.scan_layer.marker.add(new class extends GameLayer {
      eventClick(event: GameMapMouseEvent) {
        event.onPre(() => {
          if (event.active_entity instanceof ScanEditLayer.SpotMarker) {
            event.stopAllPropagation()

            if (TileCoordinates.equals(self.selected_solution, event.active_entity.spot)) {
              self.selected_solution = null

              self.parent.layer.scan_layer.setActiveCandidates(self.clue.spots)

              self.registerSolution(
                TileArea.fromRect(
                  TileRectangle.extend(TileRectangle.from(...self.clue.spots), 1)
                )
              )
            } else {
              self.selected_solution = event.active_entity.spot

              self.parent.layer.scan_layer.setActiveCandidates([event.active_entity.spot])

              self.registerSolution(digSpotArea(event.active_entity.spot))
            }
          }
        })
      }
    })
  }

  protected end() {
    this.handling_layer?.remove()
  }
}