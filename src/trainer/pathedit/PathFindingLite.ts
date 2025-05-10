import {TileCoordinates} from "../../lib/runescape/coordinates";
import {direction, HostedMapData, MovementAbilities, PlayerPosition} from "../../lib/runescape/movement";
import {Vector2} from "../../lib/math";
import {Path} from "../../lib/runescape/pathing";
import movement_ability = MovementAbilities.movement_ability;
import dive_internal = MovementAbilities.dive_internal;


export function withoutFirst<T>(array: T[], value: T): T[] {
  const index = array.indexOf(value);
  return index === -1
    ? array
    : array.slice(0, index).concat(array.slice(index + 1));
}

export function distinct<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export namespace PathFindingLite {
  export type AbilityPath = Path.step_ability[]

  export type PathGroup = {
    origin: TileCoordinates,
    paths: AbilityPath[]
  }

  export function group(raw: AbilityPath[]): PathGroup[] {
    const grouped: {
      origin: TileCoordinates,
      paths: Path.step_ability[][]
    }[] = []

    raw.forEach(path => {
      if (path.length == 0) return

      const group = grouped.find(g => TileCoordinates.eq(g.origin, path[0].from))

      if (!group) grouped.push({origin: path[0].from, paths: [path]})
      else {
        if (group.paths[0].length > path.length) group.paths = [path]
        else if (group.paths[0].length == path.length) group.paths.push(path)
      }
    })

    return grouped
  }

  async function litePathFindingImplementation(target: PlayerPosition, abilities: movement_ability[],): Promise<Path.step_ability[][]> {
    if (abilities.length == 0) return [[]]

    const possible_origins: {
      pos: PlayerPosition,
      ability: movement_ability,
      rest: movement_ability[]
    }[] = await (async (): Promise<typeof possible_origins> => {
      return (await Promise.all(distinct(abilities).map(async (ability) => {
        const rest = withoutFirst(abilities, ability)

        const origins: PlayerPosition[] = await (async (): Promise<typeof origins> => {
          switch (ability) {
            case "surge":
            case "escape":
            case "dive": {
              const target_directions = target.direction ? [target.direction] : direction.all

              const distance = ability == "escape" ? 7 : -10

              return (await Promise.all(target_directions.map(async dir => {
                const from: PlayerPosition = {
                  direction: ability == "dive" ? undefined : dir,
                  tile: TileCoordinates.move(target.tile, Vector2.scale(distance, direction.toVector(dir)))
                }

                const arrival = await dive_internal(HostedMapData.get(), from.tile, target.tile)

                if (arrival && TileCoordinates.eq(target.tile, arrival.tile)) return from

                return null
              }))).filter(v => v)
            }
          }

          return []
        })()

        return origins.map(o => ({pos: o, rest, ability: ability}))
      }))).flat()

    })()

    return [...(await Promise.all(possible_origins.map(async ({pos, rest, ability}) => {
      const step: Path.step_ability = {
        type: "ability",
        ability: ability,
        from: pos.tile,
        to: target.tile,
        is_far_dive: ability == "dive" ? true : undefined
      }

      const recur = await litePathFindingImplementation(pos, rest)

      return recur.map(r => [...r, step])
    }))).flat(), []]
  }

  export async function litePathFinding(target: TileCoordinates[], ability_combinations: movement_ability[][]): Promise<PathGroup[]> {
    const raw = (await Promise.all(ability_combinations.flatMap(comb => target.map(t => litePathFindingImplementation({tile: t, direction: undefined}, comb))))).flat()

    return group(raw)
  }
}
