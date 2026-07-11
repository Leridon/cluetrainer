import {floor_t, TileCoordinates} from "../../lib/runescape/coordinates";
import {Lazy, lazy} from "../../lib/Lazy";
import Vector3 = Mesh.Vector3;
import {Mesh} from "./meshes/Mesh";

const meta = {
  chunks_per_file: 1,
  chunks_x: 100,
  chunks_z: 200,
  chunk_size: 64
}

const BYTES_PER_TILE = 5

export class TileHeightData {
  chunks: (TileHeightData.ChunkTileHeightData | Promise<TileHeightData.ChunkTileHeightData>)[][]

  private async fetch(file_x: number, file_z: number, level: floor_t): Promise<TileHeightData.ChunkTileHeightData> {
    type url_function = (file_x: number, file_z: number, level: floor_t) => string

    const runeapps_url: url_function = (file_x, file_z, level) => `https://runeapps.org/s3/map4/live/heightmesh-${level}/${file_x}-${file_z}.bin`
    const legacy: url_function = (file_x, file_z, level) => `https://runeapps.org/maps/mapheightrender/height-${level}/${file_x}-${file_z}.bin.gz`

    try {
      for (const url_f of [runeapps_url, legacy]) {
        const url = url_f(file_x, file_z, level);
        const res = await fetch(url);
        if (!res.ok) continue;
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength === 0 || buffer.byteLength % 2 !== 0) continue

        return new TileHeightData.FetchedChunkTileHeightData(file_x, file_z, level, new Uint16Array(buffer));
      }
    } catch (e) {

    }

    return TileHeightData.ChunkTileHeightData.ZERO.get();
  }

  private constructor() {
    // For every floor (0 to 3), create enough slots in the data cache.
    this.chunks = [null, null, null, null].map(() => Array(meta.chunks_x * meta.chunks_z / (meta.chunks_per_file * meta.chunks_per_file)))
  }

  private static _instance: Lazy<TileHeightData> = lazy(() => new TileHeightData())

  static instance(): TileHeightData {
    return TileHeightData._instance.get()
  }

  async getInterpolated(coordinate: TileCoordinates, offset: number = 0): Promise<number> {
    const rounded = TileCoordinates.snap(coordinate)

    const dx = coordinate.x - rounded.x + 0.5;
    const dz = coordinate.y - rounded.y + 0.5;

    return (
      await TileHeightData.instance().getTile(rounded, "sw") * (1 - dx) * (1 - dz) +
      await TileHeightData.instance().getTile(rounded, "se") * dx * (1 - dz) +
      await TileHeightData.instance().getTile(rounded, "nw") * (1 - dx) * dz +
      await TileHeightData.instance().getTile(rounded, "ne") * dx * dz
    ) + offset
  }

  async resolveTileCorner(coordinate: TileCoordinates, corner: TileHeightData.SamplePoint, vertical_offset: number = 0): Promise<Vector3> {
    return Vector3.add({
      x: coordinate.x,
      z: coordinate.y,
      y: await this.getTile(coordinate, corner) + vertical_offset
    }, TileHeightData.SamplePoint.coordinate_offset(corner))
  }

  async resolve(coordinate: TileCoordinates, offset: number = 0): Promise<Vector3> {
    return {
      x: coordinate.x + 0.5,
      z: coordinate.y + 0.5,
      y: await this.getInterpolated(coordinate, offset)
    }
  }

  async getTile(coordinate: TileCoordinates, where: TileHeightData.SamplePoint): Promise<number> {
    const file_x = ~~(coordinate.x / (meta.chunk_size * meta.chunks_per_file))
    const file_z = ~~(coordinate.y / (meta.chunk_size * meta.chunks_per_file))
    const file_i = file_z * (meta.chunks_x / meta.chunks_per_file) + file_x

    if (!this.chunks[coordinate.level][file_i]) {
      const promise = this.fetch(file_x, file_z, coordinate.level)

      this.chunks[coordinate.level][file_i] = promise

      promise.then((a) => this.chunks[coordinate.level][file_i] = a)
    }

    return (await this.chunks[coordinate.level][file_i])?.getSample(coordinate, where) ?? 0
  }
}

export namespace TileHeightData {
  export type SamplePoint = "ne" | "nw" | "se" | "sw"

  export namespace SamplePoint {
    export function coordinate_offset(point: SamplePoint): Vector3 {
      return {
        "ne": {x: 1, y: 0, z: 1},
        "nw": {x: 0, y: 0, z: 1},
        "sw": {x: 0, y: 0, z: 0},
        "se": {x: 1, y: 0, z: 0},
      }[point]
    }
  }

  const DATA_SCALE = 32

  export interface ChunkTileHeightData {
    getSample(tile: TileCoordinates, what: SamplePoint): number
  }

  export class FetchedChunkTileHeightData implements ChunkTileHeightData {
    constructor(
      public readonly file_x: number,
      public readonly file_z: number,
      public readonly floor: floor_t,
      private readonly height_data: Uint16Array
    ) {}

    getSample(tile: TileCoordinates, what: SamplePoint): number {
      if (!this.height_data) return 0

      const tiles_per_file = meta.chunk_size * meta.chunks_per_file

      const SAMPLE_POINT_TRANSLATION: Record<SamplePoint, number> = {
        "sw": 0,
        "se": 1,
        "nw": 2,
        "ne": 3
      }

      const relative_x = tile.x - this.file_x * tiles_per_file
      const relative_z = tile.y - this.file_z * tiles_per_file

      const tileIndex = (relative_x + relative_z * tiles_per_file) * BYTES_PER_TILE;

      const i = tileIndex + SAMPLE_POINT_TRANSLATION[what];

      if (i < 0 || i >= this.height_data.length) {
        console.log(`(${relative_x} + ${relative_z} * ${tiles_per_file}) * ${BYTES_PER_TILE}`)
        debugger
      }

      return this.height_data[i] / DATA_SCALE
    }
  }

  export namespace ChunkTileHeightData {
    import ChunkTileHeightData = TileHeightData.ChunkTileHeightData;
    export const ZERO = lazy<ChunkTileHeightData>(() => new class implements ChunkTileHeightData {
      constructor() {}

      getSample(tile: TileCoordinates, what: TileHeightData.SamplePoint): number {
        return 0;
      }
    })
  }
}