import {FormModal} from "../../lib/ui/controls/FormModal";
import Properties from "../ui/widgets/Properties";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import {storage} from "../../lib/util/storage";
import {C} from "../../lib/ui/constructors";
import img = C.img;
import link = C.link;
import {util} from "../../lib/util/util";
import renderTimespan = util.renderTimespan;

export class GoldenGnomeAdvert2026 extends FormModal<number> {
  constructor() {super({size: "medium"});}

  override render() {
    super.render();

    this.setTitle("Golden Gnome Nomination")

    const layout = new Properties().appendTo(this.body)

    layout.paragraph("Thanks to your incredible support, we (Zyklop Marco and Ngis) are nominated for a Golden Gnome in the Unsung Hero category for developing Clue Trainer! It's a surreal mix of disbelief and pride to read our names in the list of nominees.")

    layout.paragraph(`If Clue Trainer brought you some enjoyment in the game, we would be incredibly grateful if you could <a target='_blank' href='https://survey.alchemer.eu/s3/91158355/2026-Golden-Gnome-Award-Finalist-Vote'>go and vote for us in the Unsung Hero category</a>. The competition is fierce, so any vote counts. <strong>There are ${renderTimespan(GoldenGnomeAdvert2026.VOTING_DEADLINE - Date.now())} left to vote.</strong>`)

    layout.paragraph("We also want to take this opportunity to let you know that we've been working on some exciting new features for the upcoming <strong>Alt1 1.7.0 update</strong>. The future of Clue Trainer looks bright!")

    layout.paragraph("Lastly, a huge shoutout to <a target='_blank' href='https://x.com/rsnevergreen'>Evergreen</a>, who created the incredible collaboration artwork below. You can vote for her in the <strong>Best Artist</strong> and <strong>Best Digital Artistic Creation</strong> categories.")

    layout.row(link("https://survey.alchemer.eu/s3/91158355/2026-Golden-Gnome-Award-Finalist-Vote").append(img("media/golden_gnome_voting_1.png")
      .css("width", "100%")
    ))
  }

  protected override getValueForCancel(): number {
    return null
  }

  override getButtons(): BigNisButton[] {
    return [
      new BigNisButton("I have voted!", "confirm")
        .onClick(() => this.confirm(14 * 24 * 60 * 60 * 1000)),
      new BigNisButton(`Remind me again. (${renderTimespan(GoldenGnomeAdvert2026.VOTING_DEADLINE - Date.now())} left)`, "neutral")
        .onClick(() => this.confirm(12 * 60 * 60 * 1000)),
    ]
  }
}

export namespace GoldenGnomeAdvert2026 {
  export const VOTING_DEADLINE = 1786690800000

  const earliest_reminder_time = new storage.Variable<number>("preferences/earliestgoldengnomereminder2026", () => Date.now())

  export async function maybeShow() {
    if (Date.now() > VOTING_DEADLINE) return

    if (earliest_reminder_time.get() < Date.now()) {
      const reminder = await new GoldenGnomeAdvert2026().do()

      if (reminder != null) {
        earliest_reminder_time.set(Date.now() + reminder)
      }
    }
  }
}