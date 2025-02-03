import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken} from "../../../../../lib/alt1/capture";
import {CapturedScan} from "../../cluereader/capture/CapturedScan";
import {LegacyOverlayGeometry} from "../../../../../lib/alt1/LegacyOverlayGeometry";
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import {util} from "../../../../../lib/util/util";
import {Vector2} from "../../../../../lib/math";
import {EwentHandler, observe} from "../../../../../lib/reactive";
import {Alt1Color} from "../../../../../lib/alt1/Alt1Color";
import {Alt1} from "../../../../../lib/alt1/Alt1";
import {ScanSolving} from "./ScanSolving";
import {Alt1OverlayDrawCalls} from "../../../../../lib/alt1/overlay/Alt1OverlayDrawCalls";
import {Alt1Overlay} from "../../../../../lib/alt1/overlay/Alt1Overlay";
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;

export class ScanCaptureService extends DerivedCaptureService<ScanCaptureService.Options, CapturedScan> {
  private debug: boolean = false
  private debug_overlay: LegacyOverlayGeometry = new LegacyOverlayGeometry()

  private capture_interest: AbstractCaptureService.InterestToken<ScanCaptureService.UpstreamOptions, CapturedImage>
  private interface_finder: Finder<CapturedScan>
  public readonly initialization: AsyncInitialization

  private state = observe<ScanCaptureService.ScanState>({
    triple: false, meerkats: true, different_level: false
  }).structuralEquality()

  private last_successful_capture: {
    capture: CapturedScan,
    time: number
  } = null

  constructor(private original_captured_interface: CapturedScan | null) {
    super()

    if (original_captured_interface) {
      this.last_successful_capture = {
        capture: original_captured_interface,
        time: Date.now()
      }
    }

    this.capture_interest = this.addDataSource<ScanCaptureService.UpstreamOptions, CapturedImage>(Alt1.instance().capturing as any/*The types are fine, but the signature of addDataSource isn't accurate*/, () => {
      const should_refind = this.last_successful_capture == null || this.last_successful_capture.time < (Date.now() - 5000)

      return {
        is_refind: should_refind,
        area: should_refind ? null : this.last_successful_capture.capture.relevantTextAreaForRecapture(),
        interval: should_refind ? CaptureInterval.fromApproximateInterval(1000) : null,
      }
    })

    this.initialization = async_init(async () => {
      this.interface_finder = await CapturedScan.finder.get()
    })
  }

  private shouldRefind(): boolean {
    return this.last_successful_capture == null || this.last_successful_capture.time < (Date.now() - 5000)
  }

  processNotifications(interested_tokens: InterestedToken<ScanCaptureService.Options, CapturedScan>[]): CapturedScan {
    const capture = this.capture_interest.lastNotification()

    if (capture.options.is_refind) {
      const ui = this.interface_finder.find(capture.value)

      if (ui) {
        this.last_successful_capture = {
          capture: ui,
          time: Date.now()
        }
      }

      return ui
    } else {
      const updated = this.last_successful_capture.capture.updated(capture.value)

      if (!updated.isValid()) return null

      if (this.debug) {
        console.log(updated.text())

        this.debug_overlay.clear()

        updated.body.setName("Scan").debugOverlay(this.debug_overlay)

        this.debug_overlay.render()
      }

      this.last_successful_capture = {
        capture: updated,
        time: Date.now()
      }

      this.state.update2(state => {
        state.triple = updated.isTriple() ?? state.triple
        state.meerkats = updated.hasMeerkats() ?? state.meerkats
        state.different_level = updated.isDifferentLevel() ?? state.different_level
      })

      return updated
    }
  }

  public getState(): ScanCaptureService.ScanState {
    return this.state.value()
  }

  public onStateChange(f: (_: ScanCaptureService.ScanState) => void): EwentHandler<any> {
    return this.state.subscribe2(f)
  }

  public lastValidInterface(): CapturedScan {
    if (!this.last_successful_capture) return null

    return this.last_successful_capture.capture
  }

  public lastSuccessfulReadTime(): number {
    return this.last_successful_capture?.time ?? -1
  }
}

export namespace ScanCaptureService {
  export type ScanState = {
    triple: boolean,
    meerkats: boolean,
    different_level: boolean
  }

  export type Options = AbstractCaptureService.Options

  export type UpstreamOptions = AbstractCaptureService.Options & {
    is_refind: boolean
  }
}

export class ScanPanelOverlay extends Alt1Overlay {
  private scan_capture_interest: AbstractCaptureService.InterestToken<ScanCaptureService.Options, CapturedScan>

  constructor(private service: ScanCaptureService) {
    super();
  }

  protected override renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) {
    const scaninterface = this.service.lastValidInterface()

    const state = this.service.getState()

    if (!scaninterface) return

    const center = Vector2.add(scaninterface.center_of_text.get(), {x: 0, y: 100})

    // TODO: Decide whether to gray out status indicators for 'false' or hide them completely

    // TODO: Maybe replace 'DL' with an appropriate icon
    builder.text("DL", Vector2.add(center, {x: -25, y: 0}), {
      centered: true,
      color: state.different_level ? ScanSolving.PulseColors.different_level : Alt1Color.gray,
      width: 15,
    })

    {
      const options: Alt1OverlayDrawCalls.StrokeOptions = {
        color: state.triple ? ScanSolving.PulseColors.triple
          : Alt1Color.gray,
        width: 2
      }

      const triple_center = Vector2.add(center, {x: 22, y: 0})

      builder
        .circle({center: triple_center, radius: 12}, 16, options)
        .circle({center: triple_center, radius: 8}, 16, options)
        .circle({center: triple_center, radius: 4}, 16, options)
    }

    if (!state.meerkats) {
      builder.text("No Meerkats", Vector2.add(center, {x: 0, y: 30}), {
        centered: true,
        color: Alt1Color.red,
        width: 15,
      })
    }
  }

  protected begin() {
    super.begin()

    this.lifetime_manager.bind(
      this.scan_capture_interest = this.service.subscribe({
        options: () => ({interval: CaptureInterval.fromApproximateInterval(100)}),
        handle: s => {
          this.setVisible(this.service.lastSuccessfulReadTime() > Date.now() - 1000)
        }
      }),
      this.service.onStateChange(() => this.rerender())
    )
  }
}