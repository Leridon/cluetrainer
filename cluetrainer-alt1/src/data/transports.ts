import teleport_data from "./teleport_data";
import {Transportation} from "../lib/runescape/transportation";
import {Lazy, lazy} from "../lib/Lazy";

export namespace TransportData {
  import TeleportGroup = Transportation.TeleportGroup;

  const cached_data: {
    cache_extracted?: Transportation.EntityTransportation[],
    all_transports?: Transportation.Transportation[]
  } = {}

  export const teleports = teleport_data

  export async function getCacheTransports(): Promise<Transportation.EntityTransportation[]> {
    if (!cached_data.cache_extracted) {
      cached_data.cache_extracted = await (await fetch(`map/cache_transportation.json`, {cache: "no-store"})).json()
    }

    return cached_data.cache_extracted
  }

  export async function getAll(): Promise<Transportation.Transportation[]> {
    if (!cached_data.all_transports) {
      cached_data.all_transports = [].concat(
        await getCacheTransports(),
        teleports
      )
    }

    return cached_data.all_transports
  }

  export function getTeleportGroup(id: string): TeleportGroup {
    return teleports.find(g => g.id == id)
  }

  const _teleport_spots: Lazy<Transportation.TeleportGroup.Spot[]> = lazy(() => {
    return teleports.filter(TeleportGroup.canBeAccessedAnywhere).flatMap(group => {
      return group.spots.map(spot => {
        return new Transportation.TeleportGroup.Spot(group, spot, undefined)
      })
    })
  })

  export function getAllTeleportSpots(): Transportation.TeleportGroup.Spot[] {
    return _teleport_spots.get()
  }

  export function resolveTeleport(id: Transportation.TeleportGroup.SpotId): Transportation.TeleportGroup.Spot {
    const group = teleports.find(g => g.id == id.group)
    const spot = group?.spots?.find(s => s.id == id.spot)
    const access = id.access ? group?.access?.find(a => a.id == id.access) : undefined

    if (!group || !spot || (id.access && !access)) {
      debugger
      return undefined
    }

    return new Transportation.TeleportGroup.Spot(group, spot, access)
  }
}