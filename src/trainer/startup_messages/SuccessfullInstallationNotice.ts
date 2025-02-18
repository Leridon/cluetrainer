import {NisModal} from "../../lib/ui/NisModal";
import Properties from "../ui/widgets/Properties";
import {BigNisButton} from "../ui/widgets/BigNisButton";

export class SuccessfullInstallationNotice extends NisModal {
  render() {
    super.render();

    this.title.set("Welcome to Clue Trainer")

    const layout = new Properties().appendTo(this.body)
    layout.paragraph("You have successfully installed Clue Trainer! If you want, check out the video tutorial made by <b>Ngis</b> embedded below. It teaches you how to setup Clue Trainer according to your preferences and how its solving features are used. For additional info, open the 'About' page linked in the left sidebar.")

    layout.row(c("<iframe width=\"560\" height=\"315\" src=\"https://www.youtube-nocookie.com/embed/EGDHM4USIp8?si=YLcuCoqZnAUAjI8s\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe>"))
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Dismiss", "cancel").onClick(() => this.hide())
    ]
  }
}