import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken, ScreenCaptureService} from "../../../../lib/alt1/capture";
import {CapturedScan} from "../cluereader/capture/CapturedScan";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import {Finder} from "../../../../lib/alt1/capture/Finder";
import {util} from "../../../../lib/util/util";
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import Behaviour from "../../../../lib/ui/Behaviour";
import A1Color = util.A1Color;
import {Vector2} from "../../../../lib/math";
import {EwentHandler, observe} from "../../../../lib/reactive";


export class ScanCaptureService extends DerivedCaptureService<ScanCaptureService.Options, CapturedScan> {
  private debug: boolean = false
  private debug_overlay: OverlayGeometry = new OverlayGeometry()

  private capture_interest: AbstractCaptureService.InterestToken<ScreenCaptureService.Options, CapturedImage>
  private interface_finder: Finder<CapturedScan>
  public readonly initialization: AsyncInitialization

  private state = observe<ScanCaptureService.ScanState>({
    triple: false, meerkats: true, different_level: false
  }).structuralEquality()

  constructor(private capture_service: ScreenCaptureService, private original_captured_interface: CapturedScan | null) {
    super()

    this.capture_interest = this.addDataSource(capture_service, () => {
      return {
        area: this.original_captured_interface.relevantTextAreaForRecapture(),
        interval: null,
      }
    })

    this.initialization = async_init(async () => {
      this.interface_finder = await CapturedScan.finder.get()
    })
  }

  processNotifications(interested_tokens: InterestedToken<ScanCaptureService.Options, CapturedScan>[]): CapturedScan {
    const capture = this.capture_interest.lastNotification()

    if (this.original_captured_interface) {
      const updated = this.original_captured_interface.updated(capture.value)

      if (this.debug) {
        console.log(updated.text())

        this.debug_overlay.clear()

        updated.body.setName("Scan").debugOverlay(this.debug_overlay)

        this.debug_overlay.render()
      }

      this.state.update2(state => {
        state.triple = updated.isTriple() ?? state.triple
        state.meerkats = updated.hasMeerkats() ?? state.meerkats
        state.different_level = updated.isDifferentLevel() ?? state.different_level
      })

      return updated
    } else if (this.initialization.isInitialized()) {
      const ui = this.interface_finder.find(capture.value)

      if (ui) this.original_captured_interface = ui

      return ui
    }
  }

  public getState(): ScanCaptureService.ScanState {
    return this.state.value()
  }

  public onStateChange(f: (_: ScanCaptureService.ScanState) => void): EwentHandler<any> {
    return this.state.subscribe2(f)
  }
}

export namespace ScanCaptureService {
  export type ScanState = {
    triple: boolean,
    meerkats: boolean,
    different_level: boolean
  }

  export type Options = AbstractCaptureService.Options & {
    show_overlay?: boolean
  }
}

export class ScanPanelOverlay extends Behaviour {
  private scan_capture_interest: AbstractCaptureService.InterestToken<ScanCaptureService.Options, CapturedScan>
  private scan_interface_overlay: OverlayGeometry = new OverlayGeometry()
    .withTime(10000)

  private last_refresh = -1

  constructor(
    private service: ScanCaptureService,
  ) {
    super();
  }

  private refreshOverlay(state: ScanCaptureService.ScanState) {
    this.scan_interface_overlay.clear()

    const center = Vector2.add(this.scan_capture_interest.lastNotification().value.center_of_text.get(), {x: 0, y: 100})

    // TODO: Decide whether to gray out status indicators for 'false' or hide them completely


    // TODO: Maybe replace 'DL' with an appropriate icon
    this.scan_interface_overlay.text("DL", Vector2.add(center, {x: -25, y: 0}), {
      centered: true,
      color: state.different_level ? A1Color.fromHex("#8adc13") : A1Color.fromHex("#888888"),
      width: 15,
    })

    {
      const options: OverlayGeometry.StrokeOptions = {
        color: state.triple ? A1Color.fromHex("#E00000") : A1Color.fromHex("#888888"),
        width: 2
      }

      const triple_center = Vector2.add(center, {x: 22, y: 0})

      this.scan_interface_overlay
        .circle(triple_center, 12, 16, options)
        .circle(triple_center, 8, 16, options)
        .circle(triple_center, 4, 16, options)
    }

    if (!state.meerkats) {
      this.scan_interface_overlay.text("No Meerkats", Vector2.add(center, {x: 0, y: 30}), {
        centered: true,
        color: A1Color.fromHex("FF0000"),
        width: 15,
      })
    }

    this.scan_interface_overlay.render()

    this.last_refresh = Date.now()
  }

  protected begin() {
    this.lifetime_manager.bind(
      this.scan_capture_interest = this.service.subscribe({
        options: () => ({interval: CaptureInterval.fromApproximateInterval(100)}),
        handle: () => {
          if (Date.now() > this.last_refresh + 5000) this.refreshOverlay(this.service.getState())
        }
      }),
      this.service.onStateChange(s => this.refreshOverlay(s))
    )
  }

  protected end() {
    this.scan_interface_overlay?.clear()?.render()
  }
}