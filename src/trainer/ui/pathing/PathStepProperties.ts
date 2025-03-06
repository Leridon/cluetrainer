import Properties from "../widgets/Properties";
import {Path} from "../../../lib/runescape/pathing";
import {TemplateResolver} from "../../../lib/util/TemplateResolver";
import {C} from "../../../lib/ui/constructors";
import {PathStepHeader} from "./PathStepHeader";
import {TransportData} from "../../../data/transports";
import inlineimg = C.inlineimg;
import cls = C.cls;
import resolveTeleport = TransportData.resolveTeleport;
import {TeleportSpotEntity} from "../map/entities/TeleportSpotEntity";
import TeleportSpotProperties = TeleportSpotEntity.TeleportSpotProperties;

export class PathStepProperties extends Properties {

  constructor(private step: Path.Step,
              private template_resolver: TemplateResolver
  ) {
    super();

    this.render()
  }

  private info(text: string): this {

    return this.row(cls("ctr-step-properties-explanation")
      .append(
        inlineimg("assets/icons/info.png"),
        " ",
        text
      )
    )
  }

  private render(): void {
    this.header(new PathStepHeader(this.step))

    if (this.step.is_arrival_only) {
      this.info("This is the arrival point of the previously used method of transportation.")
    }

    // Include hardcoded info, if any
    switch (this.step.type) {
      case "orientation":
        this.info(
          "Manual orientation is useful when you want to surge directly after teleporting."
        )

        break;
      case "redclick":
        this.info(
          "Targeting an entity (sometimes referred to as 'redclicking') and then clicking a tile to run somewhere causes your character to turn towards that entity when arriving at that tile. "
          + "This is useful to line up surges that would otherwise not be possible or require additional walking."
        )

        break;
      case "ability":

        if (this.step.is_far_dive) {
          this.info(
            "This is a far dive, so you can just click anywhere more than 10 tiles away in that direction to execute it."
          )

        }
        break;
      case "cheat":
        this.info(
          "Cheat steps are used in place of transports like cave entrances or shortcuts that aren't available in the dataset of the path editor yet."
        )
        break
      case "powerburst":
      case "transport":
      case "run":
      case "cosmetic":
      case "teleport":
      default:
    }

    if (this.step.description) {
      this.paragraph(...this.template_resolver.resolve(this.step.description))
    } else if (this.step.type == "cosmetic") {
      this.paragraph(C.italic("The author of this path has not added any further explanation."))
    }

    if (this.step.type == "teleport") {
      TeleportSpotProperties.renderBody(resolveTeleport(this.step.id), this)
    }
  }
}