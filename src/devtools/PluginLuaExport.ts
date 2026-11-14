import {LuaUtils} from "./lua_utils";
import {Clues} from "../cluetrainer/model/Clues";
import {MethodPack} from "../cluetrainer/model/MethodPack";
import {Transportation} from "../lib/runescape/transportation";

/**
 * The Lua data files of the Clue Trainer plugin for the RuneScape client, as found in its cluetrainer/cluetrainer/data.
 *
 * Game configs are written by their config name, such as id.NPC.GENERAL_BENTNOZE_RED instead of 4493; in game the
 * client's own id tables turn the names back into ids. A config without a known name is written as its number, which
 * the plugin's packaging check rejects.
 */
export namespace PluginLuaExport {
  import Expression = LuaUtils.Expression;
  import Layout = LuaUtils.Layout;

  type ConfigKind = "NPC" | "Loc" | "Obj"

  /** Clue fields that only feed clue_target_ids.lua and are left out of clues.lua. */
  const TARGET_FIELDS = ["npc_configs", "entity_configs", "target"]

  /** Plugin pack name of each default method pack, as listed in the plugin's data/method_packs.lua. */
  const PACK_NAMES: Record<string, string> = {
    "default:ngiseasy": "easy",
    "default:ngismedium": "medium",
    "default:ngishard": "hard",
    "default:ngismaster": "master",
    "default:ngiscompass": "compass",
    "default:scanmethods": "scan",
    "default:ngistetra": "tetracompass",
  }

  const MAX_LINE_LENGTH = 120 // From the plugin's .editorconfig

  function config(kind: ConfigKind, config: Clues.Config): Expression {
    if (!config.name) return new Expression(String(config.id))

    return new Expression(/^[A-Za-z_][A-Za-z0-9_]*$/.test(config.name)
      ? `id.${kind}.${config.name}`
      : `id.${kind}[${JSON.stringify(config.name)}]`)
  }

  function without<T extends object>(value: T, keys: string[]): T {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key))) as T
  }

  /** clues.lua: the clues without their entity configs. Ingredient configs become ids. */
  export function clues(steps: Clues.Step[]): string {
    const lua_steps = steps.map(step => {
      const result: any = without(step, TARGET_FIELDS)

      if ("solution" in step && step.solution) result.solution = without(step.solution, TARGET_FIELDS)

      if (step.type == "skilling" && step.ingredients) {
        result.ingredients = step.ingredients.map(ingredient => Object.fromEntries(Object.entries(ingredient).map(
          ([key, value]) => key == "configs"
            ? ["ids", (value as Clues.Config[]).map(c => config("Obj", c))]
            : [key, value]
        )))
      }

      return result
    })

    return LuaUtils.asTypedFile(lua_steps, "clues", "Step[]")
  }

  type Target = { clue_id: number, name: string, ids: Expression[], parent_ids: Expression[] }

  /** One clue_target_ids.lua entry: on one line when it fits, else one field per line and one config per line where needed. */
  function formatTarget(target: Target): string {
    const fields: [string, Expression[]][] = [["ids", target.ids]]
    if (target.parent_ids.length) fields.push(["parent_ids", target.parent_ids])

    const parts = fields.map(([name, values]) =>
      `${name} = ${values.length ? `{ ${values.map(v => v.code).join(", ")} }` : "{}"}`)
    const suffix = ` -- ${target.name}`

    const line = `  [${target.clue_id}] = { ${parts.join(", ")} },${suffix}`
    if (line.length <= MAX_LINE_LENGTH) return line

    const lines = [`  [${target.clue_id}] = {${suffix}`]
    fields.forEach(([name, values], i) => {
      const one_line = `    ${parts[i]},`
      if (one_line.length <= MAX_LINE_LENGTH) lines.push(one_line)
      else lines.push(`    ${name} = {`, ...values.map(v => `      ${v.code},`), "    },")
    })
    lines.push("  },")

    return lines.join("\n")
  }

  /** clue_target_ids.lua: the NPC or object each clue points to, from the npc_configs and entity_configs of the clues. */
  export function clueTargetIds(steps: Clues.Step[]): string {
    const targets: Target[] = []

    for (const step of steps as any[]) {
      const sources: [any, string, ConfigKind, string][] = [
        [step.solution, "npc_configs", "NPC", step.solution?.npc],
        [step.solution, "entity_configs", "Loc", step.solution?.entity],
        [step, "npc_configs", "NPC", step.target],
        [step, "entity_configs", "Loc", step.target],
      ]

      for (const [holder, field, kind, name] of sources) {
        const configs: Clues.EntityConfig[] = holder?.[field]
        if (!configs) continue

        targets.push({
          clue_id: step.id,
          name: name ?? "?",
          ids: configs.filter(c => !c.parent).map(c => config(kind, c)),
          parent_ids: configs.filter(c => c.parent).map(c => config(kind, c)),
        })
      }
    }

    targets.sort((a, b) => a.clue_id - b.clue_id)

    return [
      "-- The NPC (talk-to, master skilling) or object (search, master skilling) that each clue points to, by game config",
      "-- name, keyed by clue id.",
      "-- ids: configs the entity can have (configID). Objects that can be opened also list their opened state.",
      "-- parent_ids: parent configs of multi NPCs and multi objects at the clue spot (parentConfigID).",
      "-- Exported by Alt1 Clue Trainer from the npc_configs / entity_configs in src/data/clues.ts.",
      "return {",
      ...targets.map(formatTarget),
      "}",
      "",
    ].join("\n")
  }

  /** teleports.lua: the teleport data as-is. */
  export function teleports(data: Transportation.TeleportGroup[]): string {
    return LuaUtils.asTypedFile(data, "teleports", "TeleportGroup[]")
  }

  /** A copy of a value with each source_loc written by its config name, and without source_loc_config_name. */
  function nameSourceLocs(value: any): any {
    if (Array.isArray(value)) return value.map(nameSourceLocs)
    if (value === null || typeof value !== "object") return value

    const result: any = {}

    for (const [key, v] of Object.entries(value)) {
      if (key == "source_loc_config_name") continue

      if (key == "source_loc") {
        const tuple = Array.isArray(v)
        const loc = config("Loc", {id: tuple ? v[1] : v as number, name: value.source_loc_config_name})
        result[key] = tuple ? [v[0], loc] : loc
      } else {
        result[key] = nameSourceLocs(v)
      }
    }

    return result
  }

  /** The file name of a method pack in the plugin, such as easy_methods.lua. */
  export function methodPackFileName(pack: MethodPack): string {
    const name = PACK_NAMES[pack.local_id]

    return name ? `${name}_methods.lua` : "pack.lua"
  }

  /** methods/<name>_methods.lua: a method pack, with each source_loc by its config name. */
  export function methodPack(pack: MethodPack): string {
    return `-- ${methodPackFileName(pack)}\n--- @type MethodPack\nlocal pack = ${LuaUtils.toLua(nameSourceLocs(pack), Layout.compact)}\n\nreturn pack\n`
  }
}
