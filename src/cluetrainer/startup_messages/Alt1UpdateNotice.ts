import {FormModal} from "../../lib/ui/controls/FormModal";
import Properties from "../ui/widgets/Properties";
import {List} from "../../lib/ui/List";
import {ClickToCopy} from "../../lib/ui/ClickToCopy";
import {BigNisButton} from "../ui/widgets/BigNisButton";
import {storage} from "../../lib/util/storage";
import {ClueTrainer} from "../ClueTrainer";

export class Alt1UpdateNotice extends FormModal<number> {
  constructor(private app: ClueTrainer) {super();}

  render() {
    super.render();

    this.setTitle("You should update your Alt 1")

    const layout = new Properties().appendTo(this.body)

    layout.paragraph("You are currently on the outdated Alt 1 version 1.5.6. The newest version is 1.6.0. This can potentially lead to issues while using Clue Trainer and other plugins. For example, you will notice that Clue Trainer will re-download databases for slider puzzles on every session instead of caching them locally. Other possible issues include performance problems or crashes.")

    layout.paragraph("Unfortunately, at the current time you can not automatically update from 1.5.6 to 1.6.0. To update manually, you will need to follow these steps:")

    layout.row(
      new List(true)
        .item("Backup any important data. Unfortunately you will lose all of your local data and settings, as well as all installed third party plugins such as Clue Trainer. Make a backup of everything that's possible to backup. See below to export Clue Trainer data and also remember to save your custom AfkWarden presets!",
          new List(false)
            .item("Alt 1 stores installed apps and their data in ",
              new ClickToCopy("%localappdata%/alt1toolkit"),
              ". Backup the ",
              new ClickToCopy("config.json"),
              " file and the ",
              new ClickToCopy("chromecache"),
              " folder to easily save all of your data."
            )
        )
        .item("Uninstall your current Alt 1 version.")
        .item("Download the current Alt 1 installer from <a href='https://runeapps.org/alt1'>https://runeapps.org</a>. This is the only official source of Alt 1!")
        .item("Install the downloaded version of Alt 1. Make sure that your game is closed while you do it or the setup will fail!")
        .item("Install any required third party plugins such as Clue Trainer and restore your data backups.")
    )

    layout.divider()

    layout.paragraph("You can save your Clue Trainer data before you update by clicking the button below. On the new version, please visit the 'Data' page in settings to restore your data.")

    layout.row(new BigNisButton("Export Data", "confirm").onClick(() => this.app.data_dump.dump()))
  }

  protected getValueForCancel(): number {
    return null
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Remind me another time", "confirm")
        .onClick(() => this.confirm(21 * 24 * 60 * 60 * 1000))
    ]
  }
}

export namespace Alt1UpdateNotice {
  const earliest_reminder_time = new storage.Variable<number>("preferences/dontremindtoupdatealt1until", () => null)

  export async function maybeRemind(app: ClueTrainer) {
    if (window.alt1?.permissionInstalled && alt1.version == "1.5.6") {
      if (earliest_reminder_time.get() < Date.now()) {
        const reminder = await new Alt1UpdateNotice(app).do()

        if (reminder != null) {
          earliest_reminder_time.set(Date.now() + reminder)
        }
      }
    }
  }
}