import {TileCoordinates} from "./coordinates";
import {ChunkedData} from "../util/ChunkedData";
import * as lodash from "lodash"
import {Rectangle, Transform, Vector2} from "../math";
import pako from "pako";
import {TileArea} from "./coordinates/TileArea";

type TileMovementData = number

namespace TileMovementData {
  export function free(tile: TileMovementData, d: direction): boolean {
    const t = [1, 2, 4, 8, 16, 32, 64, 128]

    return (Math.floor(tile / t[d - 1]) % 2) != 0
  }
}

export type PlayerPosition = {
  tile: TileCoordinates,
  direction: direction
}

export namespace PlayerPosition {
  export function eq(a: PlayerPosition, b: PlayerPosition) {
    return TileCoordinates.eq2(a.tile, b.tile) && a.direction == b.direction
  }
}

interface MapData {
  getTile(coordinate: TileCoordinates): Promise<TileMovementData>

  isAccessible(coordinates: TileCoordinates): Promise<boolean>

  canMove(pos: TileCoordinates, d: direction): Promise<boolean>
}

abstract class AbstractMapData implements MapData {
  async isAccessible(coordinates: TileCoordinates): Promise<boolean> {
    for (const dir of direction.all) {
      if (await this.canMove(
        TileCoordinates.move(coordinates, direction.toVector(dir)),
        direction.invert(dir)
      )) return true
    }

    return false
  }

  abstract getTile(coordinate: TileCoordinates): Promise<TileMovementData>

  async canMove(pos: TileCoordinates, d: direction): Promise<boolean> {
    // Data is preprocessed so for every tile there are 8 bit signalling in which directions the player can move.
    return TileMovementData.free(await this.getTile(pos), d)
  }

}

type file = Uint8Array

export class HostedMapData extends AbstractMapData {

  meta = {
    chunks_per_file: 20,
    chunks_x: 100,
    chunks_z: 200,
    chunk_size: 64
  }

  chunks: (file | Promise<file>)[][]

  private async fetch(file_x: number, file_z: number, floor: number): Promise<Uint8Array> {
    let a = await fetch(`map/collision/collision-${file_x}-${file_z}-${floor}.bin`)

    return new Uint8Array(pako.inflate(await a.arrayBuffer()))
  }

  private constructor() {
    super()
    // For every floor (0 to 3), create enough slots in the data cache.
    this.chunks = [null, null, null, null].map(() => Array(this.meta.chunks_x * this.meta.chunks_z / (this.meta.chunks_per_file * this.meta.chunks_per_file)))
  }

  private static _instance: HostedMapData = new HostedMapData()

  static get() {
    return HostedMapData._instance
  }

  async getTile(coordinate: TileCoordinates): Promise<TileMovementData> {
    let floor = coordinate.level || 0

    let file_x = Math.floor(coordinate.x / (this.meta.chunk_size * this.meta.chunks_per_file))
    let file_y = Math.floor(coordinate.y / (this.meta.chunk_size * this.meta.chunks_per_file))
    let file_i = file_y * this.meta.chunks_per_file + file_x

    if (!this.chunks[floor][file_i]) {
      let promise = this.fetch(file_x, file_y, floor)

      this.chunks[floor][file_i] = promise

      promise.then((a) => this.chunks[floor][file_i] = a)
    }

    let tile_x = coordinate.x % (this.meta.chunk_size * this.meta.chunks_per_file)
    let tile_y = coordinate.y % (this.meta.chunk_size * this.meta.chunks_per_file)
    let tile_i = tile_y * (this.meta.chunk_size * this.meta.chunks_per_file) + tile_x

    return (await this.chunks[floor][file_i])[tile_i]
  }
}

export class ClearMapData extends AbstractMapData {
  getTile(coordinate: TileCoordinates): Promise<TileMovementData> {
    return Promise.resolve(255);
  }
}

export type direction = direction.none | direction.cardinal | direction.ordinal

export namespace direction {

  export type cardinal = 1 | 2 | 3 | 4
  export type ordinal = 5 | 6 | 7 | 8
  export type none = 0

  export const cardinals: cardinal[] = [1, 2, 3, 4]
  export const ordinals: ordinal[] = [5, 6, 7, 8]
  export const all: (cardinal | ordinal)[] = [1, 2, 3, 4, 5, 6, 7, 8]

  const vectors: Vector2[] = [
    {x: 0, y: 0},   // 0 center
    {x: -1, y: 0},  // 1 left
    {x: 0, y: 1},   // 2 top
    {x: 1, y: 0},   // 3 right
    {x: 0, y: -1},  // 4 bottom
    {x: -1, y: 1},  // 5 topleft
    {x: 1, y: 1},   // 6 topright
    {x: 1, y: -1},  // 7 botright
    {x: -1, y: -1}, // 8 botleft
  ]

  export function invert(d: cardinal): cardinal
  export function invert(d: ordinal): ordinal
  export function invert(d: none): none
  export function invert(d: direction): direction
  export function invert(d: direction): direction {
    return [0, 3, 4, 1, 2, 7, 8, 5, 6][d] as direction
  }

  export function isCardinal(dir: direction): dir is cardinal {
    return dir >= 1 && dir <= 4
  }

  export function isOrdinal(dir: direction): dir is ordinal {
    return dir >= 5
  }

  export function toVector(d: direction): Vector2 {
    return vectors[d]
  }

  export function fromDelta(v: Vector2): direction {
    return [
      [8, 4, 7],
      [1, 0, 3],
      [5, 2, 6],
    ][v.y + 1][v.x + 1] as direction
  }

  export function fromVector(v: Vector2): direction {
    // There is most likely a better solution, but this is enough for now
    // It's an 23 by 23 box where real click are clamped into.
    const lookup_table = [
      [5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6],
      [5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6],
      [5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6],
      [5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6],
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      [1, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 3],
      [1, 1, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 3, 3],
      [1, 1, 1, 1, 5, 5, 5, 5, 5, 5, 2, 2, 2, 6, 6, 6, 6, 6, 6, 3, 3, 3, 3],
      [1, 1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 2, 6, 6, 6, 6, 3, 3, 3, 3, 3, 3, 3],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 5, 2, 6, 6, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 4, 7, 7, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 4, 7, 7, 7, 7, 3, 3, 3, 3, 3, 3, 3],
      [1, 1, 1, 1, 8, 8, 8, 8, 8, 8, 4, 4, 4, 7, 7, 7, 7, 7, 7, 3, 3, 3, 3],
      [1, 1, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 3, 3],
      [1, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 3],
      [8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 7],
      [8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7, 7],
      [8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7],
      [8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7, 7],
      [8, 8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7, 7],
      [8, 8, 8, 8, 8, 8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 7, 7, 7, 7, 7, 7],
    ]

    // TODO: Clamping probably isnt correct and also weird.

    // Clamp vector into bounds
    const v2 = Rectangle.clampInto(Vector2.snap(v), {
      topleft: {x: -11, y: 11},
      botright: {x: 11, y: -11},
    })

    if (!lookup_table[11 - v2.y]) debugger

    return lookup_table[11 - v2.y][v2.x + 11] as direction
  }

  export function toString(dir: direction): string {
    return [
      "Center",
      "West",
      "North",
      "East",
      "South",
      "North-West",
      "North-East",
      "South-East",
      "South-West"
    ][dir]
  }

  export function toShortString(dir: direction): string {
    return [
      "C",
      "W",
      "N",
      "E",
      "S",
      "NW",
      "NE",
      "SE",
      "SW"
    ][dir]
  }

  export const center: none = 0
  export const west: cardinal = 1
  export const north: cardinal = 2
  export const east: cardinal = 3
  export const south: cardinal = 4
  export const northwest: ordinal = 5
  export const northeast: ordinal = 6
  export const southeast: ordinal = 7
  export const southwest: ordinal = 8

  export function transform(direction: direction, transform: Transform): direction {
    return fromVector(Vector2.snap(Vector2.transform(toVector(direction), transform)))
  }

  export function split(dir: ordinal): [cardinal, cardinal] {
    return ([
      [north, west],
      [north, east],
      [south, east],
      [south, west]
    ] as [cardinal, cardinal][]) [dir - 5]
  }

  export function rotate(dir: ordinal, quarters: number): ordinal
  export function rotate(dir: cardinal, quarters: number): cardinal
  export function rotate(dir: direction, quarters: number): direction {
    if (dir == center) return center

    return (dir - 1 + quarters) % 4 + 1 + Math.floor(dir / 5) * 4 as direction
  }

  export function continuations(dir: direction): direction[] {
    const direction_continuations: direction[][] = [
      [],
      [west],
      [north],
      [east],
      [south],
      [north, west, northwest],
      [north, east, northeast],
      [south, east, southeast],
      [south, west, southwest]
    ]

    return direction_continuations[dir]
  }
}

export function move(pos: TileCoordinates, off: Vector2) {
  return {
    x: pos.x + off.x,
    y: pos.y + off.y,
    level: pos.level
  }
}

export async function canMove(data: MapData, pos: TileCoordinates, d: direction): Promise<boolean> {
  // Data is preprocessed so for every tile there are 8 bit signalling in which directions the player can move.
  return TileMovementData.free(await data.getTile(pos), d)
}

export namespace PathFinder {
  export type state = {
    data: MapData,
    start: TileCoordinates,
    tiles: ChunkedData<{ parent: ChunkedData.coordinates, unreachable?: boolean }>,
    queue: ChunkedData.coordinates[],
    next: number,
    blocked?: boolean
  }

  export function init_djikstra(start: TileCoordinates, data: MapData = HostedMapData.get()): state {
    let state: state = {
      data: data,
      start: start,
      tiles: new ChunkedData(),
      queue: [ChunkedData.split(start)],
      next: 0
    }

    state.tiles.set(state.queue[0], {parent: null})

    return state
  }

  const movement_direction_priority: direction[] = [
    direction.west, direction.east,
    direction.south, direction.north,
    direction.southwest, direction.southeast,
    direction.northwest, direction.northeast,
  ]

  async function djikstra2(state: state, target: (tile: TileCoordinates) => boolean, step_limit: number): Promise<TileCoordinates | null> {
    // This is a typical djikstra algorithm
    // To improve it to A*, it still needs to prefer ortogonal pathing before diagonal pathing like ingame, but I'm not sure how to do that yet.
    // Possibly with a stable priority queue and tile distance as an estimator

    while (state.blocked) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    state.blocked = true

    // Abstraction to push elements into the queue. Filters out of bounds tiles and tiles that already have a path
    function push(tile: TileCoordinates, parent: ChunkedData.coordinates) {
      let i = ChunkedData.split(tile)

      if (state.tiles.get(i) == null) {
        state.tiles.set(i, {parent: parent})
        state.queue.push(i)
      }
    }

    while (state.queue.length < step_limit && state.next < state.queue.length) {
      let e = state.queue[state.next++]

      for (let i of movement_direction_priority) {
        if (await canMove(state.data, e.coords, i)) push(move(e.coords, direction.toVector(i)), e)
      }

      if (target(e.coords)) {
        state.blocked = false
        return e.coords
      }
    }

    state.blocked = false

    return null
  }

  function get(state: state, tile: ChunkedData.coordinates): TileCoordinates[] {
    function helper(i: ChunkedData.coordinates): ChunkedData.coordinates[] {
      let parent = state.tiles.get(i)?.parent

      if (state.tiles.get(i)?.parent == null) return [i]

      let p = helper(parent)
      p.push(i)
      return p
    }

    let p = helper(tile).map((c) => lodash.clone(c.coords as TileCoordinates))

    p.forEach(l => l.level = state.start.level)

    return cleanWaypoints(p)
  }

  export async function find(state: state, target: TileArea): Promise<TileCoordinates[] | null> {
    if (target.origin.level != state.start.level) return null

    // Check if the target tile can be reached from any of its direct neighbours
    // If not, do not even search for a path.
    if (TileArea.isSingleTile(target)) {
      let target_i = ChunkedData.split(target.origin)

      let reachable_at_all = direction.cardinals.some((d) => canMove(state.data, move(target.origin, direction.toVector(d)), direction.invert(d)))

      if (!reachable_at_all) {
        state.tiles.set(target_i, {parent: null, unreachable: true})

        return null
      }
    }

    let target_area = TileArea.activate(target)

    // Check for existing routes to any tile inside the area
    {
      let size = target_area.size

      for (let delta_x = 0; delta_x < size.x; delta_x++) {
        for (let delta_y = 0; delta_y < size.y; delta_y++) {
          const tile = {x: target.origin.x + delta_x, y: target.origin.y + delta_y, level: target.origin.level}

          if (target_area.query(tile)) {
            let target_i = ChunkedData.split(tile)

            // Check the cache for existing result
            let existing = state.tiles.get(target_i)

            if (existing != null) {
              if (existing.unreachable) return null
              else return get(state, target_i)
            }
          }

        }
      }
    }

    let end_tile = await djikstra2(state, (tile) => {

      // return TileCoordinates.eq2(target_area.origin, tile)

      return target_area.query(tile)
    }, 5000)

    // Cache whether the target is unreachable to prevent endless search
    if (!end_tile) {

      let size = TileArea.size(target)

      for (let delta_x = 0; delta_x < size.x; delta_x++) {
        for (let delta_y = 0; delta_y < size.y; delta_y++) {
          const tile = {x: target.origin.x + delta_x, y: target.origin.y + delta_y, level: target.origin.level}

          if (target_area.query(tile)) {
            state.tiles.set(ChunkedData.split(tile), {parent: null, unreachable: true})
          }
        }
      }

      return null
    }

    return get(state, ChunkedData.split(end_tile))
  }

  export function idealPath(from: TileCoordinates, to: TileCoordinates): TileCoordinates[] {
    if (from.level != to.level) return null

    let delta = Vector2.sub(to, from)
    let abs_delta = Vector2.abs(delta)

    let checkpoint = Vector2.add(from,
      abs_delta.x >= abs_delta.y
        ? {x: Math.sign(delta.x) * (abs_delta.x - abs_delta.y), y: 0}
        : {x: 0, y: Math.sign(delta.y) * (abs_delta.y - abs_delta.x)}
    )


    return [from, TileCoordinates.lift(checkpoint, from.level), to]
  }

  export function cleanWaypoints(s: TileCoordinates[]): TileCoordinates[] {
    let new_waypoints: TileCoordinates[] = []

    let last_dir: direction = direction.center
    let last_non_committed: TileCoordinates = s[0]

    for (let i = 1; i < s.length; i++) {
      let dir = direction.fromDelta(Vector2.sign(Vector2.sub(s[i], last_non_committed)))

      if (dir != last_dir) {
        new_waypoints.push(last_non_committed)
        last_non_committed = s[i]
        last_dir = dir
      }

      last_non_committed = s[i]
    }

    new_waypoints.push(last_non_committed)

    return new_waypoints
  }

  export function pathLength(s: TileCoordinates[]): number {
    let distance = 0

    for (let i = 0; i < s.length - 1; i++) {
      distance += TileCoordinates.distance(s[i], s[i + 1])
    }

    return distance
  }
}


export namespace MovementAbilities {
  export type movement_ability = "surge" | "dive" | "escape" | "barge"

  /*
  type r = {
      origin: TileCoordinates,
      raster: Raster<{
          reachable?: boolean
      }>
  }*/

  export async function possibility_raster(origin: TileCoordinates, surge_escape_for: direction[] = []): Promise<{
    targets: {
      direction: direction,
      surge: TileCoordinates,
      escape: TileCoordinates
    }[],
    data: TileArea.ActiveTileArea // Raster<boolean>
  }> {
    const range = 10

    const raster = TileArea.activate(TileArea.init(TileCoordinates.move(origin, {x: -range, y: -range}), {x: 21, y: 21}, false))

    type actor = {
      position: TileCoordinates,
      movement: direction.ordinal | direction.cardinal
    }

    async function handle(actor: actor): Promise<void> {
      raster.set(actor.position, true)

      let delta = Vector2.abs(Vector2.sub(actor.position, origin))

      let movement_in_range = {
        x: delta.x < range,
        y: delta.y < range
      }
      // TODO: Potentially replace direct recursions with loops

      if (direction.isCardinal(actor.movement)) {

        if (movement_in_range.y && movement_in_range.x && await canMove(HostedMapData.get(), actor.position, actor.movement)) {
          await handle({
            position: TileCoordinates.move(actor.position, direction.toVector(actor.movement)),
            movement: actor.movement
          })
        }
      } else {
        let [north_south, east_west] = direction.split(actor.movement)

        if (movement_in_range.x && movement_in_range.y && await canMove(HostedMapData.get(), actor.position, actor.movement)) {
          await handle({
            position: TileCoordinates.move(actor.position, direction.toVector(actor.movement)),
            movement: actor.movement
          })

          // Create vertical mirror actor
          if (await canMove(HostedMapData.get(), actor.position, north_south)) {
            await handle({
              position: TileCoordinates.move(actor.position, direction.toVector(north_south)),
              movement: north_south
            })
          }

          // Create horizontal mirror actor
          if (await canMove(HostedMapData.get(), actor.position, east_west)) {
            await handle({
              position: TileCoordinates.move(actor.position, direction.toVector(east_west)),
              movement: east_west
            })
          }
        } else if (movement_in_range.x && await canMove(HostedMapData.get(), actor.position, east_west)) {
          await handle({
            position: TileCoordinates.move(actor.position, direction.toVector(east_west)),
            movement: actor.movement
          })

          // Create vertical mirror actor
          if (await canMove(HostedMapData.get(), actor.position, north_south)) {
            await handle({
              position: TileCoordinates.move(actor.position, direction.toVector(north_south)),
              movement: north_south
            })
          }

        } else if (movement_in_range.y && await canMove(HostedMapData.get(), actor.position, north_south)) {
          await handle({
            position: TileCoordinates.move(actor.position, direction.toVector(north_south)),
            movement: actor.movement
          })
        }
      }
    }

    for (let dir of direction.ordinals) {
      await handle({
        position: origin,
        movement: dir
      })
    }

    function findFurthest(dir: direction, max_distance: number): TileCoordinates {
      if (max_distance == 0) return origin

      const current = TileCoordinates.move(origin, Vector2.scale(max_distance, direction.toVector(dir)))

      if (raster.query(current)) return current
      else return findFurthest(dir, max_distance - 1)
    }

    return {
      targets: surge_escape_for.map(dir => {
        return {
          direction: dir,
          surge: findFurthest(dir, 10),
          escape: findFurthest(direction.invert(dir), 7)
        }
      }),
      data: raster
    }
  }

  export async function dive_internal(data: MapData, position: TileCoordinates, target: TileCoordinates): Promise<PlayerPosition | null> {
    // This function does not respect any max distances and expects the caller to handle that.

    if (position.level != target.level) return null

    let dia = Vector2.sign(Vector2.sub(target, position))

    let bound = Rectangle.from(position, target)

    let choices: { delta: Vector2, dir: direction }[] = []

    /* Repeat until tile found or out of bounds, only consider if not out of bounds:
        1. Move towards the target tile diagonally. Only if diagonal walk is permitted.
        (E.g. in an attempt to move 1 tile north-east, you actually move 1 tile east, then north due to a wall = doesn't count.)
        2. Move towards the target tile on X-axis.
        3. Move towards the target tile on Y-axis.
     */
    if (dia.x != 0 && dia.y != 0) choices.push({delta: dia, dir: direction.fromDelta(dia)})
    if (dia.x != 0) choices.push({delta: {x: dia.x, y: 0}, dir: direction.fromDelta({x: dia.x, y: 0})})
    if (dia.y != 0) choices.push({delta: {x: 0, y: dia.y}, dir: direction.fromDelta({x: 0, y: dia.y})})

    while (true) {
      if (Vector2.eq(position, target)) return {
        tile: position,
        direction: direction.fromVector(Vector2.sub(target, position))
      }

      let next: TileCoordinates = null

      for (let choice of choices) {
        let candidate = move(position, choice.delta)

        if (Rectangle.containsTile(bound, candidate) && (await canMove(data, position, choice.dir))) {
          next = candidate
          break
        }
      }

      if (!next) return null

      position = next
    }
  }

  export async function dive_far_internal(data: MapData, start: TileCoordinates, dir: direction, max_distance: number): Promise<PlayerPosition | null> {
    let d = direction.toVector(dir)

    /*
        If clicked more than max distance:
        Check each tile, take the maximum
     */
    // Is there a way to optimize this so not every tile has to be checked?
    for (let i = max_distance; i > 0; i--) {
      let t = await dive_internal(data, start, move(start, Vector2.scale(i, d)))

      if (t) return t
    }

    return null
  }

  export async function dive(position: TileCoordinates, target: TileCoordinates, data: MapData = HostedMapData.get()): Promise<PlayerPosition | null> {

    const delta = Vector2.sub(target, position)

    if (Vector2.max_axis(delta) > 10) {
      let dir = direction.fromVector(delta)

      // This ignores the fact that dive is always consumed, even if diving a distance of 0 tiles.
      return await dive_far_internal(data, position, dir, 10)
    } else return dive_internal(data, position, target);
  }

  export async function barge(position: TileCoordinates, target: TileCoordinates, data: MapData = HostedMapData.get()): Promise<PlayerPosition | null> {
    return dive(position, target, data) // Barge is the same logic as dive
  }

  export async function surge(position: PlayerPosition, data: MapData = HostedMapData.get()): Promise<PlayerPosition | null> {
    return dive_far_internal(data, position.tile, position.direction, 10)
  }

  export async function escape(position: PlayerPosition, data: MapData = HostedMapData.get()): Promise<PlayerPosition | null> {
    let res = await dive_far_internal(data, position.tile, direction.invert(position.direction), 7)

    if (!res) return null
    else return {
      tile: res.tile,
      direction: position.direction
    }
  }

  export async function generic(data: MapData, ability: movement_ability, position: TileCoordinates, target: TileCoordinates): Promise<PlayerPosition | null> {
    switch (ability) {
      case "surge":
        return surge({tile: position, direction: direction.fromVector(Vector2.sub(target, position))}, data);
      case "dive":
        return dive(position, target, data);
      case "escape":
        return escape({tile: position, direction: direction.fromVector(Vector2.sub(position, target))}, data);
      case "barge":
        return barge(position, target, data);
    }
  }

  export function cooldown(ability: MovementAbilities.movement_ability, powerburst: boolean, mobile: boolean): number {
    switch (ability) {
      case "surge":
        return (powerburst ? 2 : (mobile ? 17 : 34))
      case "dive":
        return (powerburst ? 2 : (mobile ? 17 : 34))
      case "escape":
        return mobile ? 17 : 34 // Powerburst does not affect escape
      case "barge":
        return 34;
    }
  }

  export async function isFarDive(from: TileCoordinates, to: TileCoordinates): Promise<boolean> {
    const offset = Vector2.sub(to, from)

    if (offset.y != 0 && offset.x != 0 && Math.abs(offset.x) != Math.abs(offset.y)) return false

    const dist = Vector2.max_axis(offset)

    if (dist == 10 && (offset.y == 0 || offset.x == 0 || Math.abs(offset.x) == Math.abs(offset.y))) return true

    const dir = direction.fromVector(offset)

    const far_target = (await dive_far_internal(HostedMapData.get(), from, dir, 10))?.tile

    return TileCoordinates.equals(far_target, to)
  }
}