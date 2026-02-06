import {floor_t, TileCoordinates} from "../../lib/runescape/coordinates";
import {Lazy, lazy} from "../../lib/Lazy";

const meta = {
  chunks_per_file: 1,
  chunks_x: 100,
  chunks_z: 200,
  chunk_size: 64
}

const BYTES_PER_TILE = 5

export class TileHeightData {
  chunks: (TileHeightData.ChunkTileHeightData | Promise<TileHeightData.ChunkTileHeightData>)[][]

  private async fetch(file_x: number, file_z: number, level: number): Promise<Uint16Array> {
    //TODO: fix this, for now use npm run proxy to run the terrain data proxy for runeapps, to avoid cors
    const HEIGHT_ENDPOINT = "http://localhost:3001/maps/mapheightrender/";

    try {
      const url = `${HEIGHT_ENDPOINT}height-${level}/${file_x}-${file_z}.bin.gz`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength % 2 !== 0) return null;
      return new Uint16Array(buffer);
    } catch {
      return null;
    }
  }

  private constructor() {
    // For every floor (0 to 3), create enough slots in the data cache.
    this.chunks = [null, null, null, null].map(() => Array(meta.chunks_x * meta.chunks_z / (meta.chunks_per_file * meta.chunks_per_file)))
  }

  private static _instance: Lazy<TileHeightData> = lazy(() => new TileHeightData())

  static instance(): TileHeightData {
    return TileHeightData._instance.get()
  }

  async getTile(coordinate: TileCoordinates, where: TileHeightData.SamplePoint): Promise<number> {
    const file_x = ~~(coordinate.x / (meta.chunk_size * meta.chunks_per_file))
    const file_z = ~~(coordinate.y / (meta.chunk_size * meta.chunks_per_file))
    const file_i = file_z * (meta.chunks_x / meta.chunks_per_file) + file_x

    if (!this.chunks[coordinate.level][file_i]) {
      const promise = this.fetch(file_x, file_z, coordinate.level)
        .then(height_data => height_data
          ? new TileHeightData.ChunkTileHeightData(file_x, file_z, coordinate.level, height_data)
          : null)

      this.chunks[coordinate.level][file_i] = promise

      promise.then((a) => this.chunks[coordinate.level][file_i] = a)
    }

    return (await this.chunks[coordinate.level][file_i]).getSample(coordinate, where)
  }
}

export namespace TileHeightData {
  export type SamplePoint = "ne" | "nw" | "se" | "sw" | "center"

  export class ChunkTileHeightData {
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
        "ne": 3,
        "center": 4
      }

      const relative_x = tile.x - this.file_x * tiles_per_file
      const relative_z = tile.y - this.file_z * tiles_per_file

      const tileIndex = (relative_x + relative_z * tiles_per_file) * BYTES_PER_TILE;


      const i = tileIndex + SAMPLE_POINT_TRANSLATION[what];

      if (i < 0 || i >= this.height_data.length) {
        console.log(`(${relative_x} + ${relative_z} * ${tiles_per_file}) * ${BYTES_PER_TILE}`)
        debugger
      }

      return this.height_data[i]
    }
  }
}