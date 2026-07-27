import {CacheTypes} from "../CacheTypes";
import {CursorType} from "../../../../../lib/runescape/CursorType";
import {Rectangle} from "../../../../../lib/math";

export namespace LocUtil {
  import LocWithUsages = CacheTypes.LocWithUsages;
  import objects = CacheTypes.objects;
  import LocInstance = CacheTypes.LocInstance;
  const transportation_rectangle_blacklists: Rectangle[] = [
    {topleft: {"x": 3904, "y": 4991}, botright: {"x": 5951, "y": 4032}}, // Clan Citadel
    {topleft: {"x": 64, "y": 5583}, botright: {"x": 255, "y": 4992}}, // Dungeoneering
    {topleft: {"x": 64, "y": 4863}, botright: {"x": 639, "y": 4224}}, // Dungeoneering
    {topleft: {"x": 64, "y": 3711}, botright: {"x": 703, "y": 1920}}, // Dungeoneering
    {topleft: {"x": 960, "y": 6847}, botright: {"x": 1151, "y": 6720}}, // Sagas
    {topleft: {"x": 1856, "y": 5119}, botright: {"x": 1983, "y": 5056}}, // PoH
  ]



  export function getInstances(loc: LocWithUsages): LocInstance[] {
    if (!loc) return []

    return loc.uses
      .filter(use =>
        !transportation_rectangle_blacklists.some(blacklist => Rectangle.contains(blacklist, use.origin)),
      )
      .map(use => {
        return {
          loc_with_usages: loc,
          prototype: loc.location,
          loc_id: loc.id,
          ...use
        }
      })
  }

  export function getActions(loc: objects): {
    cache_id: number,
    name: string,
    cursor: CursorType
  }[] {
    return [0, 1, 2, 3, 4].map(i => getAction(loc, i)).filter(a => a != null).map(a => a!)
  }

  export function getNthAction(loc: objects, cache_id: number) {
    return getActions(loc).find(a => a.cache_id == cache_id)
  }

  export function getAction(loc: objects, index: number = 0): {
    cache_id: number,
    name: string,
    cursor: CursorType
  } | undefined {
    const action = loc[`actions_${index}`] ?? loc[`members_action_${index}`]

    let exists = !!action

    if (!exists) return undefined

    return {
      cache_id: index,
      name: action as string,
      cursor: CursorType.fromCacheCursor(loc[`action_cursors_${index}`]),
    }
  }
}