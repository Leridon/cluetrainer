import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken} from "../../../../../lib/alt1/capture";
import {CapturedScan} from "../../cluereader/capture/CapturedScan";
import {OverlayGeometry} from "../../../../../lib/alt1/OverlayGeometry";
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import {util} from "../../../../../lib/util/util";
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import Behaviour from "../../../../../lib/ui/Behaviour";
import A1Color = util.A1Color;
import {Vector2} from "../../../../../lib/math";
import {EwentHandler, observe} from "../../../../../lib/reactive";
import {Alt1Color} from "../../../../../lib/alt1/Alt1Color";
import {Alt1ScreenCaptureService} from "../../../../../lib/alt1/capture/Alt1ScreenCaptureService";
import {Alt1} from "../../../../../lib/alt1/Alt1";


export class ScanCaptureService extends DerivedCaptureService<ScanCaptureService.Options, CapturedScan> {
  private debug: boolean = false
  private debug_overlay: OverlayGeometry = new OverlayGeometry()

  private capture_interest: AbstractCaptureService.InterestToken<ScanCaptureService.UpstreamOptions, CapturedImage>
  private interface_finder: Finder<CapturedScan>
  public readonly initialization: AsyncInitialization

  private state = observe<ScanCaptureService.ScanState>({
    triple: false, meerkats: true, different_level: false
  }).structuralEquality()

  private last_successfull_capture: {
    capture: CapturedScan,
    time: number
  } = null

  constructor(private original_captured_interface: CapturedScan | null) {
    super()

    if (original_captured_interface) {
      this.last_successfull_capture = {
        capture: original_captured_interface,
        time: Date.now()
      }
    }

    this.capture_interest = this.addDataSource<ScanCaptureService.UpstreamOptions, CapturedImage>(Alt1.instance().capturing as any/*The types are fine, but the signature of addDataSource isn't accurate*/, () => {
      const should_refind = this.last_successfull_capture == null || this.last_successfull_capture.time < (Date.now() - 5000)

      return {
        is_refind: should_refind,
        area: should_refind ? null : this.last_successfull_capture.capture.relevantTextAreaForRecapture(),
        interval: should_refind ? CaptureInterval.fromApproximateInterval(1000) : null,
      }
    })

    this.initialization = async_init(async () => {
      this.interface_finder = await CapturedScan.finder.get()
    })
  }

  private shouldRefind(): boolean {
    return this.last_successfull_capture == null || this.last_successfull_capture.time < (Date.now() - 5000)
  }

  processNotifications(interested_tokens: InterestedToken<ScanCaptureService.Options, CapturedScan>[]): CapturedScan {
    const capture = this.capture_interest.lastNotification()

    if (capture.options.is_refind) {
      const ui = this.interface_finder.find(capture.value)

      if (ui) {
        this.last_successfull_capture = {
          capture: ui,
          time: Date.now()
        }
      }

      return ui
    } else {
      const updated = this.last_successfull_capture.capture.updated(capture.value)

      if (!updated.isValid()) return null

      if (this.debug) {
        console.log(updated.text())

        this.debug_overlay.clear()

        updated.body.setName("Scan").debugOverlay(this.debug_overlay)

        this.debug_overlay.render()
      }

      this.last_successfull_capture = {
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
    if (!this.last_successfull_capture) return null

    return this.last_successfull_capture.capture
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

    const scaninterface = this.service.lastValidInterface()

    if (!scaninterface) return

    const center = Vector2.add(scaninterface.center_of_text.get(), {x: 0, y: 100})

    this.scan_interface_overlay.clear()

    // TODO: Decide whether to gray out status indicators for 'false' or hide them completely

    // TODO: Maybe replace 'DL' with an appropriate icon
    this.scan_interface_overlay.text("DL", Vector2.add(center, {x: -25, y: 0}), {
      centered: true,
      color: state.different_level ? Alt1Color.fromHex("#8adc13") : Alt1Color.fromHex("#888888"),
      width: 15,
    })

    {
      const options: OverlayGeometry.StrokeOptions = {
        color: state.triple ? Alt1Color.fromHex("#E00000") : Alt1Color.fromHex("#888888"),
        width: 2
      }

      const triple_center = Vector2.add(center, {x: 22, y: 0})

      this.scan_interface_overlay
        .circle({center: triple_center, radius: 12}, 16, options)
        .circle({center: triple_center, radius: 8}, 16, options)
        .circle({center: triple_center, radius: 4}, 16, options)
    }

    if (!state.meerkats) {
      this.scan_interface_overlay.text("No Meerkats", Vector2.add(center, {x: 0, y: 30}), {
        centered: true,
        color: Alt1Color.red,
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