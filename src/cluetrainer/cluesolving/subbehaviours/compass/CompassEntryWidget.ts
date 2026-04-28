import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {ewent} from "../../../../lib/reactive";
import {CompassSolving} from "./CompassSolving";
import {C} from "../../../../lib/ui/constructors";
import Widget from "../../../../lib/ui/Widget";
import {Angles} from "../../../../lib/math/Angles";
import {PathGraphics} from "../../../ui/path_graphics";
import {Transportation} from "../../../../lib/runescape/transportation";
import {Vector2} from "../../../../lib/math";
import cls = C.cls;
import UncertainAngle = Angles.UncertainAngle;
import span = C.span;
import TeleportGroup = Transportation.TeleportGroup;
import italic = C.italic;

export class CompassEntryWidget extends Widget {
  selection_requested = ewent<this>()
  position_discard_requested = ewent<this>()
  discard_requested = ewent<this>()
  commit_requested = ewent<this>()

  constructor(public entry: CompassSolving.Entry) {
    super(cls("ctr-compass-solving-entry"));

    this.tooltip("Select")
      .on("click", () => {
        this.selection_requested.trigger(this)
      })

    this.render()
  }

  setSelected(value: boolean): this {
    this.toggleClass("selected", value)
    return this
  }

  private _preview_angle: UncertainAngle | null = null

  setPreviewAngle(angle: UncertainAngle | null): this {
    this._preview_angle = angle

    if (this.entry.information == null) {
      if (angle != null) {
        this.angle_container?.text(UncertainAngle.toAngleString(angle))

        this.angle_container?.tooltip(UncertainAngle.toUncertaintyString(angle))
      } else {
        this.angle_container?.text(`???°`)
        this.angle_container?.tooltip(null)
      }
    }

    return this
  }

  private angle_container: Widget = null

  render(): void {
    this.empty()

    const row = this

    {
      const discard_button = cls("ctr-neosolving-compass-entry-button")
        .setInnerHtml("&times;")
        .tooltip("Discard")
        .appendTo(row)
        .on("click", () => {
          this.position_discard_requested.trigger(this)
        })
    }

    {
      const position = cls("ctr-neosolving-compass-entry-position").appendTo(row)

      if (this.entry.position) {
        if (this.entry.position instanceof TeleportGroup.Spot) {
          position.append(
            PathGraphics.Teleport.asSpan(this.entry.position),
            span(this.entry.position.spot.name)
          )

          position.tooltip(TileArea.toString(this.entry.position.targetArea()))
        } else {
          position.append(span(Vector2.toString(this.entry.position.center())))

          position.tooltip(TileArea.toString(this.entry.position.parent))
        }
      } else {
        position.append(italic("No location selected"))
      }
    }

    if (this.entry.position) {
      const isCommited = this.entry.information != null

      const angle = this.angle_container = cls("ctr-compass-solving-angle")
        .toggleClass("committed", isCommited)
        .text(isCommited
          ? UncertainAngle.toAngleString(this.entry.information.angle_radians)
          : (this._preview_angle != null ? UncertainAngle.toAngleString(this._preview_angle) : "???°")
        )
        .appendTo(row)

      if (isCommited) {
        angle.tooltip(UncertainAngle.toUncertaintyString(this.entry.information.angle_radians))
      }

      const angle_button = cls("ctr-neosolving-compass-entry-button")
        .appendTo(row)
        .text(isCommited ? "×" : "✓")
        .tooltip(isCommited ? "Click to discard" : "Click to commit (Alt + 1)")
        .on("click", (e) => {
          e.stopPropagation()

          if (isCommited) {
            this.discard_requested.trigger(this)
          } else {
            this.commit_requested.trigger(this)
          }
        })
    }
  }
}