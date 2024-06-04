import {NisModal} from "../lib/ui/NisModal";
import Properties from "./ui/widgets/Properties";
import {C} from "../lib/ui/constructors";
import {deps} from "./dependencies";
import {Alt1Modal} from "./Alt1Modal";

export class AboutModal extends NisModal {
  constructor() {
    super();

    this.title.set("About Clue Trainer")
  }

  render() {
    super.render();

    const layout = new Properties().appendTo(this.body)

    layout.header("About Clue Trainer")

    layout.paragraph("Clue Trainer is a new generation clue solver for Alt1 and developed by Zyklop Marco in the Clue Chasers discord. Originally intended to provide an interactive way to learn optimal scan routes, the scope has gradually increased and is now on-route to be a fully-featured clue solver and a test bed for new ways to solve clues in Runescape 3.")

    layout.paragraph("Visit Clue Trainer at",
      " <a href='https://github.com/Leridon/rs3scantrainer' target=”_blank”><img class='inline-img' src='assets/icons/github-mark-white.png'> GitHub</a>",
      " or the <a href='https://discord.gg/cluechasers' target=”_blank”><img class='inline-img' src='assets/icons/cluechasers.png'> Clue Chasers </a>discord in the <a href='https://discord.com/channels/332595657363685377/1103737270114209825'>#clue-trainer</a> channel.")

    if (!deps().app.in_alt1) {
      layout.paragraph("Click",
        C.space(),
        C.text_link("here", () => new Alt1Modal().show()),
        C.space(),
        "to learn how to install Clue Trainer for Alt1."
      )
    }

    layout.header("Credits")

    layout.paragraph("Clue Trainer is a team effort that requires much more than just the programming and I want to mention a few people specifically that contributed to this journey.")

    layout.paragraph("<strong>Skillbert</strong> for his work on <a href='https://www.runeapps.org'>runeapps.org</a> and the Alt1 toolkit. Clue Trainer includes code from Alt1's official clue solver with kind permission from Skillbert.")

    layout.paragraph("<strong>Ngis</strong> for being very enthusiastic about Clue Trainer's editor tools and contributing the builtin method packs for easy, medium and hard clues.")

    layout.paragraph("<strong>Fiery</strong> for creating the original scan guide spreadsheet that prompted the original creation of this tool as 'Scan Trainer' and is the basis of many of the included scan routes.")

    layout.paragraph("<strong>Beau</strong> and the rest of the Clue Chasers team for supporting development by providing a space for open discussion around the tool and clue methods.")

    layout.paragraph("And everyone else who contributed by reporting issues, expressing their thoughts and generally ")

    layout.header("Legal disclaimer")
    layout.paragraph("Icons and other assets used are owned by Jagex Ltd. and their use is intended to fall under fair dealing as a fan project.")
  }
}