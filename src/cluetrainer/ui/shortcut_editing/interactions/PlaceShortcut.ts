import {ValueInteraction} from "lib/gamemap/interaction/ValueInteraction";
import {Transportation} from "../../../../lib/runescape/transportation";
import {Transform, Vector2} from "lib/math";
import {TileCoordinates} from "lib/runescape/coordinates";
import {TileTransform} from "lib/runescape/coordinates/TileTransform";
import {GameMapKeyboardEvent, GameMapMouseEvent} from "../../../../lib/gamemap/MapEvents";
import {ShortcutViewLayer} from "../ShortcutView";
import InteractionTopControl from "../../map/InteractionTopControl";
import {observe} from "../../../../lib/reactive";

export class PlaceShortcut extends ValueInteraction<Transportation.EntityTransportation> {

  private transform: TileTransform
  private final_translation_transform: TileTransform

  constructor(private original: Transportation.EntityTransportation,
              private origin: TileCoordinates,
              private copy_handler: (copy: Transportation.EntityTransportation) => void = null
  ) {
    super({
      preview_render: (s) => new ShortcutViewLayer.ShortcutPolygon(observe(s))
    });

    this.transform = TileTransform.translation(Vector2.neg(this.origin), -this.origin.level)
    this.final_translation_transform = TileTransform.translation(this.origin, this.origin.level)

    this.updatePreview()

    this.attachTopControl(new InteractionTopControl().setName("Placing Shortcut")
      .setContent(
        c("<div style='font-family: monospace; white-space:pre'></div>")
          .append(c().text(`[R] - Rotate clockwise  | [Shift + R] - Rotate counterclockwise`))
          .append(c().text(`[F] - Flip Horizontally | [Shift + F] - Flip vertically`))
          .append(c().text(`[Click] - Place         ` + (this.copy_handler ? "| [Shift + Click] - Place copy" : "")))
      )
    )
  }

  eventHover(event: GameMapMouseEvent) {
    event.onPre(() => {
      this.final_translation_transform = TileTransform.translation(event.tile(), event.tile().level)
      this.updatePreview()
    })
  }

  private updatePreview() {
    this.preview(Transportation.transform(this.original,
      TileTransform.chain(
        this.final_translation_transform,
        this.transform
      )
    ))
  }

  eventKeyDown(event: GameMapKeyboardEvent) {
    event.onPost(() => {
      if (event.original.key.toLowerCase() == "r") {
        this.transform = TileTransform.chain(
          Transform.rotation(event.original.shiftKey ? 1 : 3),
          this.transform
        )
        this.updatePreview()
      } else if (event.original.key.toLowerCase() == "f") {
        this.transform = TileTransform.chain(
          event.original.shiftKey ? Transform.mirror_y() : Transform.mirror_x(),
          this.transform
        )
        this.updatePreview()
      }
    })
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPre(() => {
      event.stopAllPropagation()

      this.final_translation_transform = TileTransform.translation(event.tile(), event.tile().level)

      if (event.original.shiftKey) {
        this.copy_handler(Transportation.transform(this.original,
          TileTransform.chain(
            this.final_translation_transform,
            this.transform
          )
        ))
      } else {
        this.commit(Transportation.transform(this.original,
          TileTransform.chain(
            TileTransform.translation(event.tile(), event.tile().level),
            this.transform
          )
        ))
      }
    })
  }
}