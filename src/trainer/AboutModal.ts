import {NisModal} from "../lib/ui/NisModal";
import Properties from "./ui/widgets/Properties";
import {C} from "../lib/ui/constructors";
import {deps} from "./dependencies";
import {Alt1Modal} from "./Alt1Modal";
import {Changelog} from "./ChangeLog";
import LightButton from "./ui/widgets/LightButton";

export class AboutModal extends NisModal {
  constructor() {
    super();

    this.title.set("About Clue Trainer")
  }

  render() {
    super.render();

    const layout = new Properties().appendTo(this.body)

    layout.header("About Clue Trainer")

    layout.paragraph("Clue Trainer is a new generation clue solver for Alt1 developed by Zyklop Marco in the Clue Chasers discord. Originally intended to provide an interactive way to learn optimal scan routes, the scope has gradually increased and is now a fully-featured clue solver and a test bed for new ways to solve clues in RuneScape 3.")

    layout.paragraph("Visit Clue Trainer at",
      " <a href='https://github.com/Leridon/cluetrainer' target=”_blank”><img class='inline-img' src='assets/icons/github-mark-white.png'> GitHub</a>",
      " or the <a href='https://discord.gg/cluechasers' target=”_blank”><img class='inline-img' src='assets/icons/cluechasers.png'> Clue Chasers </a>discord in the <a href='https://discord.com/channels/332595657363685377/1103737270114209825'>#clue-trainer</a> channel.")

    if (!deps().app.in_alt1) {
      layout.paragraph("Click",
        C.space(),
        C.text_link("here", () => new Alt1Modal().show()),
        C.space(),
        "to learn how to install Clue Trainer for Alt1."
      )
    }

    layout.header("Patch Notes")

    layout.row(new LightButton("View Patch Notes").onClick(() => new Changelog.Modal().show()))

    layout.header("Donations")

    layout.paragraph("You can support development of Clue Trainer by donating at <a href='https://ko-fi.com/I2I4XY829' target=”_blank”>KoFi</a>. Donations contribute to covering the costs associated with hosting Clue Trainer and are a great way to show appreciation for the time and effort that goes into development.")

    layout.row(
      //"<script type='text/javascript' src='https://storage.ko-fi.com/cdn/widget/Widget_2.js'></script><script type='text/javascript'>kofiwidget2.init('Support Me on Ko-fi', '#29abe0', 'I2I4XY829');kofiwidget2.draw();</script> "
      "<div style='text-align: center'><a href='https://ko-fi.com/I2I4XY829' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi3.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a></div>"
    )

    layout.header("Credits")

    layout.paragraph("Clue Trainer is a team effort that requires much more than just the programming and I want to mention a few people specifically that contributed to this journey.")

    layout.paragraph("<strong>Skillbert</strong> for his work on <a href='https://www.runeapps.org'>runeapps.org</a> and the Alt1 toolkit, as well as always helping out with questions about RuneScape's inner workings. Clue Trainer includes code from Alt1's official clue solver with kind permission from Skillbert.")

    layout.paragraph("<strong>Ngis</strong> for being very enthusiastic about Clue Trainer's editor tools and contributing a large majority of the builtin method packs.")

    layout.paragraph("<strong>Fiery</strong> for creating the original scan guide spreadsheet that prompted the original creation of this tool as 'Scan Trainer' and is the basis of many of the included scan routes.")

    layout.paragraph("<strong>Beau</strong> and the rest of the Clue Chasers team for supporting development by providing a space for open discussion around the tool and clue methods.")

    layout.paragraph("<strong>Shao</strong> for their support with the updated slider solving algorithm.")

    layout.paragraph("In no particular order <strong>Pup</strong>, <strong>Xindrjayzda</strong>, <strong>Mr Cob</strong>, <strong>Dongus Bungholius</strong>, <strong>treborsmada</strong>, <strong>Intercal</strong>, <strong>xaj</strong>, as well as everyone else who contributed by reporting issues, expressing thoughts, sharing clue methods and generally being part of this journey.")

    layout.header("Legal disclaimer")
    layout.paragraph("Icons and other assets used are owned by Jagex Ltd. and their use is intended to fall under fair dealing as a fan project.")
  }
}