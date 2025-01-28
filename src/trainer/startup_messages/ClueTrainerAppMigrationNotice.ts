import {FormModal} from "../../lib/ui/controls/FormModal";
import Properties from "../ui/widgets/Properties";
import {C} from "../../lib/ui/constructors";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import {Alt1Modal} from "../Alt1Modal";
import {ClueTrainer} from "../ClueTrainer";

export class ClueTrainerAppMigrationNotice extends FormModal<number> {
  constructor(private app: ClueTrainer) {super();}

  render() {
    super.render();

    this.setTitle("Please Migrate")

    const layout = new Properties().appendTo(this.body)

    let first_paragraph = ""

    if (this.app.in_alt1) {
      first_paragraph += "Your installation of Clue Trainer is still using 'leridon.github.io/rs3scantrainer'. "
    } else {
      first_paragraph += "You are currently on leridon.github.io/rs3scantrainer. "
    }

    first_paragraph += "This version of Clue Trainer is hosted using GitHub pages on the Clue Trainer repository, which is currently blocking me from renaming the repository to something more fitting of the current state. When the rename happens, your current installation of Clue Trainer will stop to work."

    layout.paragraph(first_paragraph)

    layout.paragraph(
      `Clue Trainer has been available on the custom domain <a href="https://cluetrainer.app">cluetrainer.app</a> since June 6th. Please migrate to that URL before 2024-10-31, at which point the repository will be renamed and Clue Trainer becoming unavailable on the 'leridon.github.io/rs3scantrainer' URL without further notice. Please also take note of the option to export your current data/settings to make migration less painful.`
    )

    layout.paragraph(C.bold(`You have ${ClueTrainerAppMigrationNotice.daysLeft()} days left to migrate.`))

    if (this.app.in_alt1) {
      layout.row(
        new BigNisButton("Install cluetrainer.app", "confirm").onClick(() => new Alt1Modal("https://cluetrainer.app").show())
      )
    }

    layout.divider()

    layout.paragraph("If you have any relevant local data or settings on this URL, you can export all of your data using the button below. On the new version, please visit the 'Data' page in settings to restore your data.")

    layout.row(new BigNisButton("Export Data", "confirm").onClick(() => this.app.data_dump.dump()))
  }

  protected getValueForCancel(): number {
    return null
  }

  getButtons(): BigNisButton[] {
    const daysleft = ClueTrainerAppMigrationNotice.daysLeft()

    if (daysleft >= 14) {
      return [
        new BigNisButton("Remind me in a week", "confirm")
          .onClick(() => this.confirm(6 * 24 * 60 * 60 * 1000))
      ]
    } else {
      return [
        new BigNisButton("Remind me tomorrow", "confirm")
          .onClick(() => this.confirm(1 * 24 * 60 * 60 * 1000))
      ]
    }
  }
}

export namespace ClueTrainerAppMigrationNotice {
  export const deadline = new Date(2024, 9, 31)

  export function daysLeft(): number {
    const now = Date.now()

    const DAY = 24 * 60 * 60 * 1000

    return Math.max(0, Math.floor((deadline.getTime() - now) / DAY))
  }

  export async function maybeRemind(app: ClueTrainer) {
    if (window.location.host == "leridon.github.io" && window.location.pathname.startsWith("/rs3scantrainer")) {
      const next_notice = app.startup_settings.value().earliest_next_cluetrainer_dot_app_migration_notice

      if (!next_notice || next_notice < Date.now()) {
        const remind_later = await new ClueTrainerAppMigrationNotice(app).do()

        if (remind_later != null) {
          app.startup_settings.update(s => s.earliest_next_cluetrainer_dot_app_migration_notice = Date.now() + remind_later)
        }
      }
    }
  }
}