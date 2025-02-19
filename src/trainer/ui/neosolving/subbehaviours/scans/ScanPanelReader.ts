import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken} from "../../../../../lib/alt1/capture";
import {CapturedScan} from "../../cluereader/capture/CapturedScan";
import {LegacyOverlayGeometry} from "../../../../../lib/alt1/LegacyOverlayGeometry";
import {Finder} from "../../../../../lib/alt1/capture/Finder";
import {util} from "../../../../../lib/util/util";
import {Vector2} from "../../../../../lib/math";
import {EwentHandler, Observable, observe} from "../../../../../lib/reactive";
import {Alt1Color} from "../../../../../lib/alt1/Alt1Color";
import {Alt1} from "../../../../../lib/alt1/Alt1";
import {ScanSolving} from "./ScanSolving";
import {Alt1OverlayDrawCalls} from "../../../../../lib/alt1/overlay/Alt1OverlayDrawCalls";
import {Alt1Overlay} from "../../../../../lib/alt1/overlay/Alt1Overlay";
import {ScreenRectangle} from "../../../../../lib/alt1/ScreenRectangle";
import {Alt1OverlayButton} from "../../../../../lib/alt1/overlay/Alt1OverlayButton";
import {SettingsModal} from "../../../settings/SettingsEdit";
import {ClueTrainerWiki} from "../../../../wiki";
import lodash from "lodash";
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import observe_combined = Observable.observe_combined;

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
  private position_center = observe<Vector2>(null).structuralEquality()
  private state = observe<ScanCaptureService.ScanState>(null).structuralEquality()

  private triple_indicator: ScanPanelOverlay.TriplePulseOverlay = new ScanPanelOverlay.TriplePulseOverlay().addTo(this)
  private different_level_indicator: ScanPanelOverlay.DifferentLevelIndicator = new ScanPanelOverlay.DifferentLevelIndicator().addTo(this)
  private meerkat_indicator: ScanPanelOverlay.MeerkatIndicator = new ScanPanelOverlay.MeerkatIndicator().addTo(this)

  private info_button: Alt1OverlayButton = new Alt1OverlayButton(null, Alt1OverlayButton.white("i")).addTo(this)
  private settings_button: Alt1OverlayButton = new Alt1OverlayButton(null, Alt1OverlayButton.white("⚙"))
    .setVisible(false) // Disable button for now, configuration is not implemented
    .addTo(this)

  private has_successful_read = observe(false)
  public readonly enabled = observe(false)

  constructor() {
    super();

    this.visible.bindTo(
      observe_combined({read: this.has_successful_read, enabled: this.enabled}, this.lifetime_manager).map(v => v.enabled && v.read, this.lifetime_manager)
    )

    this.position_center.subscribe2(center_of_text => {
      if (center_of_text) {
        this.different_level_indicator.setPosition(Vector2.add(center_of_text, {x: -50, y: 100}))
        this.triple_indicator.setPosition(Vector2.add(center_of_text, {x: 0, y: 100}))
        this.meerkat_indicator.setPosition(Vector2.add(center_of_text, {x: 60, y: 100}))

        this.settings_button.setPosition(ScreenRectangle.centeredOn(Vector2.add(center_of_text, {x: 60, y: -77}), 10))
        this.info_button.setPosition(ScreenRectangle.centeredOn(Vector2.add(center_of_text, {x: -60, y: -77}), 10))
      }
    })

    this.state.subscribe2(s => {
      if (s) {
        this.triple_indicator.setState(s.triple)
        this.different_level_indicator.setState(s.different_level)
        this.meerkat_indicator.setState(s.meerkats)
      }

      this.rerender()
    })

    this.settings_button.interactivity()
      .setTooltip("(Alt+1) Configure this overlay")
      .main_hotkey_pressed.on(() => {
      SettingsModal.openOnPage("scans")
    })

    this.info_button.interactivity()
      .setTooltip("(Alt+1) Learn more about scans.")
      .main_hotkey_pressed.on(() => {
      ClueTrainerWiki.openOnPage("scans")
    })
  }

  public connect(service: ScanCaptureService): this {
    const interest = service.subscribe({
      options: () => ({interval: CaptureInterval.fromApproximateInterval(100)}),
      handle: s => {
        this.has_successful_read.set(service.lastSuccessfulReadTime() > Date.now() - 1000)

        this.setState(lodash.cloneDeep(service.getState()))

        this.setPosition(s.value?.center_of_text?.get())
      }
    })

    this.lifetime_manager.bind(interest)

    return this
  }

  public setState(state: ScanCaptureService.ScanState) {
    this.state.set(state)

    return this
  }

  private setPosition(pos: Vector2): this {
    this.position_center.set(pos)
    return this
  }

  protected override renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) {
    const position = this.position_center.value()

    if (!position) return
  }
}

export namespace ScanPanelOverlay {
  export type Config = {}

  export class TriplePulseOverlay extends Alt1Overlay {
    private position = observe<Vector2>(null).structuralEquality()
    private state = observe<boolean>(null)

    constructor() {
      super()

      this.position.subscribe2(pos => {
        if (pos) {
          this.interactivity().setBounds({
            type: "circle",
            area: {center: pos, radius: 20}
          })
        }

        this.rerender()
      })
      this.state.subscribe2(s => {
        this.interactivity().setTooltip(s ? "Triple Pulse" : "No triple pulse")

        this.rerender()
      })

      this.interactivity().refreshTooltip()
    }

    setPosition(p: Vector2): this {
      this.position.set(p)

      return this
    }

    setState(state: boolean): this {
      this.state.set(state)
      return this
    }

    override renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) {
      const is_triple = this.state.value()
      const position = this.position.value()

      if (!position) return

      const options: Alt1OverlayDrawCalls.StrokeOptions = {
        color: is_triple ? ScanSolving.PulseColors.triple : Alt1Color.gray,
        width: 2
      }

      const triple_center = position

      builder
        .circle({center: triple_center, radius: 12}, 16, options)
        .circle({center: triple_center, radius: 8}, 16, options)
        .circle({center: triple_center, radius: 4}, 16, options)
    }
  }

  export class DifferentLevelIndicator extends Alt1Overlay {

    private position = observe<Vector2>(null).structuralEquality()
    private state = observe<boolean>(null)

    constructor() {
      super();

      this.position.subscribe2(pos => {
        if (pos) {
          this.interactivity().setBounds({
            type: "rectangle",
            area: ScreenRectangle.centeredOn(pos, 20)
          })
        } else this.interactivity().setBounds(null)

        this.rerender()
      })
      this.state.subscribe2(s => {
        this.interactivity().setTooltip(
          s
            ? "Try scanning a different level.\n(Alt+1) to learn more"
            : "You are on the correct level.\n(Alt+1) to learn more"
        )

        this.rerender()
      })

      this.interactivity().main_hotkey_pressed.on(() => {
        ClueTrainerWiki.openOnPage("toofardifferentlevel")
      })
    }

    setPosition(p: Vector2): this {
      this.position.set(p)

      return this
    }

    setState(state: boolean): this {
      this.state.set(state)
      return this
    }

    override renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) {
      const center = this.position.value()
      if (!center) return

      const is_dl = this.state.value()

      builder.text("DL", center, {
        centered: true,
        color: is_dl ? ScanSolving.PulseColors.different_level : Alt1Color.gray,
        width: 15,
      })
    }
  }

  export class MeerkatIndicator extends Alt1Overlay {

    private position = observe<Vector2>(null).structuralEquality()
    private state = observe<boolean>(null)

    constructor() {
      super();

      this.position.subscribe2(pos => {
        if (pos) {
          this.interactivity().setBounds({
            type: "rectangle",
            area: ScreenRectangle.centeredOn(pos, 20)
          })
        } else this.interactivity().setBounds(null)

        this.rerender()
      })

      this.state.subscribe2(s => {
        this.interactivity().setTooltip(
          s
            ? "Meerkats are active."
            : "Meerkats are NOT active."
        )

        this.rerender()
      })
    }

    setPosition(p: Vector2): this {
      this.position.set(p)

      return this
    }

    setState(state: boolean): this {
      this.state.set(state)
      return this
    }

    override renderWithBuilder(builder: Alt1OverlayDrawCalls.GeometryBuilder) {
      const center = this.position.value()
      if (!center) return

      const is_active = this.state.value()

      builder.text("MK", center, {
        centered: true,
        color: is_active ? MeerkatIndicator.active_color : Alt1Color.gray,
        width: 15,
      })
    }
  }

  export namespace MeerkatIndicator {
    export const active_color = Alt1Color.fromHex("#00ffff")
  }
}