import {type ClueTrainer} from "./ClueTrainer";
import {ConfirmationModal} from "./ui/widgets/modals/ConfirmationModal";
import {Log} from "../lib/util/Log";

export namespace ClueTrainerMigrations {
  import log = Log.log;

  async function migrate_corrupted_triangulation_spot_fix(cluetrainer: ClueTrainer) {
    let changed: boolean = false

    for (let preset of cluetrainer.settings.settings.solving.compass.custom_triangulation_presets) {
      for (let step_i = 0; step_i < preset.sequence.length; step_i++) {
        const step = preset.sequence[step_i]

        if (step.tile && step.teleport) {
          log().log("Detected corrupted triangulation spot in preset " + preset.name + " at index " + step_i, "Migrations")

          const choice = await new ConfirmationModal<"teleport" | "tile" | null>({
            body: `Your custom triangulation preset ${preset.name} contains a corrupted triangulation spot at index ${step_i}. It has both a teleport, and a specific tile, which is not supposed to be possible and causes issues. Please select an option below.`,
            options: [
              {kind: "neutral", text: "Keep Teleport", value: "teleport"},
              {kind: "neutral", text: "Keep Tile", value: "tile"},
              {kind: "cancel", text: "Ignore for Now", value: null, is_cancel: true},
            ],
            title: "Corrupted Triangulation Preset"
          }, {size: "medium"}).do()

          if (choice != null) {
            log().log(`Migration choice: ${choice}`, "Migrations")
            changed = true
            if (choice === "teleport") step.tile = undefined
            else if (choice === "tile") step.teleport = undefined
          }
        }
      }
    }

    if (changed) {
      cluetrainer.settings.save()
    }
  }

  export async function run_migrations(cluetrainer: ClueTrainer) {
    await migrate_corrupted_triangulation_spot_fix(cluetrainer)
  }
}


