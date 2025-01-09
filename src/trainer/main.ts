import {Path} from "../lib/runescape/pathing";
import {TileArea} from "../lib/runescape/coordinates/TileArea";
import {ScanTree} from "../lib/cluetheory/scans/ScanTree";
import * as lodash from "lodash"
import {HostedMapData, MovementAbilities} from "../lib/runescape/movement";
import {angleDifference, Rectangle, Vector2} from "../lib/math";
import {Compasses} from "../lib/cluetheory/Compasses";
import {clue_data} from "../data/clues";
import {Process} from "../lib/Process";
import {CompassReader} from "./ui/neosolving/cluereader/CompassReader";
import {util} from "../lib/util/util";
import {GameLayer} from "../lib/gamemap/GameLayer";
import {deps} from "./dependencies";
import {TileMarker} from "../lib/gamemap/TileMarker";
import {TileCoordinates} from "../lib/runescape/coordinates";
import {MapEntity} from "../lib/gamemap/MapEntity";
import Properties from "./ui/widgets/Properties";
import {GameMapControl} from "../lib/gamemap/GameMapControl";
import gielinor_compass = clue_data.gielinor_compass;
import index = util.index;

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

function min_index_by<T>(array: T[], f: (_: T) => number): number {
  let min_index = -1
  let min_value = Number.MAX_VALUE

  for (let i = 0; i < array.length; i++) {
    const val = f(array[i])
    if (val < min_value) {
      min_index = i
      min_value = val
    }
  }

  return min_index
}

function entity(spot: Vector2,
                value: number) {
  return new class extends MapEntity {
    constructor() {
      super();

      this.setTooltip(() => {
        const props = new Properties()

        props.named("Spot", Vector2.toString(spot))
        props.named("Value", `${value.toFixed(2)} bit`)

        return props
      })
    }

    bounds(): Rectangle {
      return Rectangle.from(spot)
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const marker = new TileMarker(TileCoordinates.lift(spot, 0))
        .withMarker()
        .addTo(this)

      return marker.marker.getElement()
    }
  }
}

export async function makeshift_main(): Promise<void> {


  const area: TileArea = {
    origin: {"x": 2048, "y": 2496, "level": 0},
    size: {x: 28 * 64, y: 26 * 64}
  }

  const results: {
    spot: Vector2,
    value: number,
    marker?: MapEntity
  }[] = new Array(50).fill(null).map(() => ({spot: null, value: 0}))


  function informationValue(position: Vector2): number {

    let information = 0

    const angles = gielinor_compass.spots.map(s => Compasses.getExpectedAngle(position, s))

    angles.sort()

    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i]

      let possibilities = 1

      for (let j = i - 1; angleDifference(angle, index(angles, j)) < CompassReader.EPSILON; j--) possibilities++
      for (let j = i + 1; angleDifference(angle, index(angles, j)) < CompassReader.EPSILON; j++) possibilities++

      information += Math.log2(gielinor_compass.spots.length / possibilities)
    }

    return information / gielinor_compass.spots.length
  }

  const total = area.size.x * area.size.y
  let progress = 0

  let worst = 0

  const map = HostedMapData.get()

  const status = c();

  deps().app.map.addControl(new GameMapControl({no_default_styling: false, position: "top-center", type: "gapless"}, status))

  const layer = new GameLayer().addTo(deps().app.map)

  const process = new class extends Process {
    async implementation(): Promise<void> {
      this.withInterrupt(50, 1)

      const rect = TileArea.toRect(area)

      for (let x = rect.topleft.x; x < rect.botright.x && !this.should_stop; ++x) {
        for (let y = rect.botright.y; y < rect.topleft.y; ++y) {
          progress++

          await this.checkTime()

          const tile: TileCoordinates = {x, y, level: 0}

          if (await map.getTile(tile) == 0) continue

          const value = informationValue(tile)

          if (value > results[worst].value) {
            const w = results[worst]

            w.marker?.remove()

            results[worst] = {spot: tile, value: value, marker: entity(tile, value).addTo(layer)}

            worst = min_index_by(results, r => r.value)
          }

          status.text(`${progress}/${total} checked, ${(100 * progress / total).toFixed(1)}%`)
        }
      }
    }
  }

  await process.run()
}