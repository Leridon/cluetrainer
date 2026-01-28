import {Path} from "../lib/runescape/pathing";
import {TileArea} from "../lib/runescape/coordinates/TileArea";
import {ScanTree} from "../lib/cluetheory/scans/ScanTree";
import * as lodash from "lodash"
import {MovementAbilities} from "../lib/runescape/movement";
import {FontSheets} from "../devtools/FontSheets";
import {ImageDetect} from "alt1";
import {clue_data} from "../data/clues";

async function fix_path(p: Path): Promise<number> {
  if (!p) return

  let removed = 0

  for (let i = 0; i < p.length; i++) {
    const step = p[i]

    const next = p[i + 1]

    if (next) {
      if (step.type == "ability" && step.ability == "dive" && next.type == "cosmetic" && next.icon == "ability-dive-combined") {
        step.target_area = next.area
        p.splice(i + 1, 1)
        removed++
      }

      if (step.type == "run" && !step.target_area && next.type == "cosmetic" && next.icon == "run") {
        step.target_area = next.area
        p.splice(i + 1, 1)
        removed++
      }

      if (step.type == "cosmetic" && step.icon == "run" && next.type == "run" && !next.target_area && TileArea.activate(step.area).query(next.waypoints[next.waypoints.length - 1])) {
        next.target_area = step.area
        p.splice(i, 1)
        removed++
      }
    }

    if (step.type == "ability" && step.ability == "dive") {
      const is = await MovementAbilities.isFarDive(step.from, step.to)

      if (is != !!step.is_far_dive) {
        step.is_far_dive = is

        if (!step.is_far_dive) step.is_far_dive = undefined

        removed++
      }

    }
  }

  return removed
}

async function fix_tree(tree: ScanTree.ScanTreeNode) {
  return await fix_path(tree.path) +
    (tree.children
      ? lodash.sum(await Promise.all(tree.children.map(async c => await fix_tree(c.value))))
      : 0)
}

export async function makeshift_main(): Promise<void> {

  console.log(Array.from(
    new Set(
      clue_data.all
        .flatMap(c => c.text)
        .flatMap(t => t.split(""))
    ).keys()
  ).sort());

  return
}