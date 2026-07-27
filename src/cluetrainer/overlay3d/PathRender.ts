import {floor_t, TileCoordinates} from "../../lib/runescape/coordinates";
import {Path} from "../../lib/runescape/pathing";
import {TileHeightData} from "./TileHeightData";
import {MutableMesh} from "./meshes/MutableMesh";
import {MovementAbilities} from "../../lib/runescape/movement";
import {Vector2} from "../../lib/math";
import {Mesh} from "./meshes/Mesh";
import {TileArea} from "../../lib/runescape/coordinates/TileArea";
import ColorRGBA = Mesh.ColorRGBA;
import Vector3 = Mesh.Vector3;

const ARROW_HEAD_LENGTH = 0.3;

const FLOOR_OVERLAY_VERTICAL_OFFSET = 0.12;
const TILE_MARKER_VERTICAL_OFFSET = 0.15;
const TILE_MARKER_BORDER = 0.08;

const ABILITY_COLORS: Record<MovementAbilities.movement_ability, Mesh.ColorRGBA> = {
  surge: [0, 100, 255, 255],
  escape: [33, 110, 4, 255],
  dive: [255, 220, 0, 255],
  barge: [150, 0, 255, 255],
}

const COLORS: Record<Path.Step["type"] | "redclicked_run", Mesh.ColorRGBA> = {
  run: [255, 255, 255, 255],
  redclicked_run: [255, 0, 0, 255],
  teleport: [255, 0, 255, 255],
  transport: [0, 255, 200, 255],
  powerburst: [255, 215, 0, 255],
  redclick: [255, 50, 50, 255],
  ability: [255, 255, 255, 255],
  cheat: [0, 255, 200, 255],
  cosmetic: [0, 0, 0, 0],
  orientation: [0, 0, 0, 0],
}

export async function drawTileArea(area: TileArea,
                                   height_data = TileHeightData.instance()
): Promise<MutableMesh> {
  const builder = new MutableMesh()

  const polygons = TileArea.activate(area).asMultipolygon()

  const lines = polygons.flatMap(p => [p.outer])

  for (let line of lines) {

    for (let i = 1; i < line.length; i++) {
      const from = line[i - 1]
      const to = line[i]

      builder.add(
        await drawLine(
          TileCoordinates.lift(from, area.origin.level),
          TileCoordinates.lift(to, area.origin.level),
          0.02,
          false,
          -.01, -.01, false,
          height_data
        )
      )
    }
  }

  return builder
}

async function drawTileMarker(tile: TileCoordinates,
                              inset: number = 0,
                              height_data = TileHeightData.instance()
): Promise<MutableMesh> {
  const mesh = new MutableMesh()

  const outer00 = mesh.createVertex(Vector3.add(await height_data.resolveTileCorner(tile, "sw", TILE_MARKER_VERTICAL_OFFSET), {x: inset, y: 0, z: inset}))
  const outer01 = mesh.createVertex(Vector3.add(await height_data.resolveTileCorner(tile, "nw", TILE_MARKER_VERTICAL_OFFSET), {x: inset, y: 0, z: -inset}))
  const outer11 = mesh.createVertex(Vector3.add(await height_data.resolveTileCorner(tile, "ne", TILE_MARKER_VERTICAL_OFFSET), {x: -inset, y: 0, z: -inset}))
  const outer10 = mesh.createVertex(Vector3.add(await height_data.resolveTileCorner(tile, "se", TILE_MARKER_VERTICAL_OFFSET), {x: -inset, y: 0, z: inset}))

  const inner00 = mesh.createVertex(Vector3.add(outer00.vertex.pos, {x: TILE_MARKER_BORDER, y: 0, z: TILE_MARKER_BORDER}))
  const inner01 = mesh.createVertex(Vector3.add(outer01.vertex.pos, {x: TILE_MARKER_BORDER, y: 0, z: -TILE_MARKER_BORDER}))
  const inner11 = mesh.createVertex(Vector3.add(outer11.vertex.pos, {x: -TILE_MARKER_BORDER, y: 0, z: -TILE_MARKER_BORDER}))
  const inner10 = mesh.createVertex(Vector3.add(outer10.vertex.pos, {x: -TILE_MARKER_BORDER, y: 0, z: TILE_MARKER_BORDER}))

  mesh.quad(outer00, outer01, inner01, inner00)
  mesh.quad(outer01, outer11, inner11, inner01)
  mesh.quad(outer11, outer10, inner10, inner11)
  mesh.quad(outer10, outer00, inner00, inner10)

  return mesh
}

export function squareCrossSectionVector(dir: Vector2): Vector2 {
  const m = Math.max(Math.abs(dir.x), Math.abs(dir.y));
  if (m === 0) return {x: 0, y: 0};

  return {
    x: dir.x / m,
    y: dir.y / m,
  };
}

/**
 * Draw a line marker on top of the terrain.
 * @param from Origin of the line in tile coordinates
 * @param to Target of the line in tile coordinates
 * @param thickness Stroke width
 * @param showArrow Whether the line should have an arrow tip
 * @param startTileSize Size of the tile marker at the start tile to adjust the line start position
 * @param endTileSize Size of the tile marker at the target tile to adjust the line start position
 * @param upper_hull If true, the line does not strictly hug the terrain but skips pits.
 * @param height_data The source of terrain height data.
 */
async function drawLine(
  from: TileCoordinates,
  to: TileCoordinates,
  thickness: number,
  showArrow: boolean,
  startTileSize: number,
  endTileSize: number,
  upper_hull: boolean,
  height_data = TileHeightData.instance()
): Promise<MutableMesh> {
  const builder = new MutableMesh()

  const direction = Vector2.normalize(Vector2.sub(to, from));
  const cross_section = squareCrossSectionVector(direction);

  const modified_start = Vector2.add(
    from,
    Vector2.scale(0.5 * startTileSize, cross_section)
  );

  const modified_end = Vector2.add(
    to,
    Vector2.scale(-0.5 * endTileSize, cross_section),
    showArrow ? Vector2.scale(-ARROW_HEAD_LENGTH, direction) : Vector2.ZERO
  )

  const length = Vector2.length(Vector2.sub(modified_end, modified_start));

  if (length < 0.001) return;

  const perpendicular = {
    x: -direction.y,
    y: direction.x,
  }

  const segment_count = Math.max(1, Math.ceil(4 * length));

  let control_points: Vector3[] = [];

  // Get all control points along the line
  for (let seg = 0; seg <= segment_count; seg++) {
    const t = seg / segment_count;

    control_points.push(await height_data.resolve(TileCoordinates.lift(
      Vector2.add(
        Vector2.scale(1 - t, modified_start),
        Vector2.scale(t, modified_end)
      ), from.level
    ), FLOOR_OVERLAY_VERTICAL_OFFSET))
  }

  function upperHull(points: Vector3[]): Vector3[] {
    if (points.length <= 2) return [...points];

    const hull: number[] = [];

    function slope(i: number, j: number): number {
      // Equidistant, ordered points on a line => use index as horizontal distance
      return (points[j].y - points[i].y) / (j - i);
    }

    for (let i = 0; i < points.length; i++) {
      hull.push(i);

      while (hull.length >= 3) {
        const n = hull.length;
        const a = hull[n - 3];
        const b = hull[n - 2];
        const c = hull[n - 1];

        // Upper hull requires non-increasing slopes
        if (slope(a, b) < slope(b, c)) {
          hull.splice(n - 2, 1); // remove b
        } else {
          break;
        }
      }
    }

    return hull.map(i => points[i]);
  }

  if (upper_hull) control_points = upperHull(control_points);

  const vertex_pairs = control_points.map((point): [MutableMesh.VertexRef, MutableMesh.VertexRef] => {
    const v1 = builder.createVertex(Vector3.add(point, Vector3.scale(thickness, {x: -perpendicular.x, y: 0, z: -perpendicular.y})));
    const v2 = builder.createVertex(Vector3.add(point, Vector3.scale(thickness, {x: +perpendicular.x, y: 0, z: +perpendicular.y})));

    return [v1, v2]
  })

  for (let i = 1; i < vertex_pairs.length; i++) {
    const [v0, v3] = vertex_pairs[i - 1];
    const [v1, v2] = vertex_pairs[i];

    builder.quad(v0, v1, v2, v3);
  }

  if (showArrow) {
    const arrowWidth = thickness * 3;

    const base1 = Vector2.add(modified_end, Vector2.scale(arrowWidth, perpendicular));
    const base2 = Vector2.add(modified_end, Vector2.scale(-arrowWidth, perpendicular));

    const tip = Vector2.add(modified_end, Vector2.scale(ARROW_HEAD_LENGTH, direction));

    const v0 = builder.createVertex(await height_data.resolve(TileCoordinates.lift(base1, to.level), FLOOR_OVERLAY_VERTICAL_OFFSET));
    const v1 = builder.createVertex(await height_data.resolve(TileCoordinates.lift(base2, to.level), FLOOR_OVERLAY_VERTICAL_OFFSET));
    const v2 = builder.createVertex(await height_data.resolve(TileCoordinates.lift(tip, to.level), FLOOR_OVERLAY_VERTICAL_OFFSET));

    builder.triangle(v0, v1, v2);
  }

  return builder
}

async function drawRedClickMarker(builder: MutableMesh,
                                  tile: TileCoordinates,
                                  color: ColorRGBA,
                                  height_data: TileHeightData = TileHeightData.instance(),
                                  markerHeightOffset: number = 5
): Promise<void> {
  const lx = tile.x;
  const lz = tile.y;

  // Center of the tile
  const cx = lx + 0.5;
  const cz = lz + 0.5;

  // Arrow Dimensions
  const shaftRadius = 0.12;
  const headRadius = 0.30;
  const totalHeight = 0.9;
  const headHeight = 0.35;

  // Vertical positioning
  const baseOffsetY = TILE_MARKER_VERTICAL_OFFSET + markerHeightOffset;
  const tipY = baseOffsetY;
  const junctionY = baseOffsetY + headHeight;
  const topY = baseOffsetY + totalHeight;

  // --- Colors ---
  const cBright: ColorRGBA = [255, 0, 0, 255];
  const cMid: ColorRGBA = [140, 0, 0, 255];
  const cDark: ColorRGBA = [60, 0, 0, 255];
  const cDeep: ColorRGBA = [20, 0, 0, 255];

  // Pre-calculated trigonometric offsets for an 8-sided circle (45-degree increments)
  // Indices: 0: +X, 1: +X+Z, 2: +Z, 3: -X+Z, 4: -X, 5: -X-Z, 6: -Z, 7: +X-Z
  const cos8 = [1.0, 0.7071, 0.0, -0.7071, -1.0, -0.7071, 0.0, 0.7071];
  const sin8 = [0.0, 0.7071, 1.0, 0.7071, 0.0, -0.7071, -1.0, -0.7071];

  // Color palette assignment for each of the 8 directions to simulate depth/shading
  const sideColors: ColorRGBA[] = [cMid, cBright, cBright, cMid, cMid, cDark, cDark, cDeep];

  // Arrow Tip (Single point at the very bottom)
  const tip = builder.createVertex(await height_data.resolve({x: cx, y: cz, level: tile.level}, tipY), cBright);

  // Arrays to hold the ring vertices
  const headBaseVertices: MutableMesh.VertexRef[] = [];
  const shaftBottomVertices: MutableMesh.VertexRef[] = [];
  const shaftTopVertices: MutableMesh.VertexRef[] = [];

  // Generate the 3 rings of 8 vertices each
  for (let i = 0; i < 8; i++) {
    const cos = cos8[i];
    const sin = sin8[i];
    const color = sideColors[i];

    // Arrow Head Outer Rim
    const hx = cx + headRadius * cos;
    const hz = cz + headRadius * sin;
    headBaseVertices.push(builder.createVertex(await height_data.resolve({x: hx, y: hz, level: tile.level}, junctionY), color));

    // Shaft Bottom (Where shaft meets the cone head)
    const sbx = cx + shaftRadius * cos;
    const sbz = cz + shaftRadius * sin;
    shaftBottomVertices.push(builder.createVertex(await height_data.resolve({x: sbx, y: sbz, level: tile.level}, junctionY), cDeep));

    // Shaft Top (The flat back end of the arrow)
    const stx = cx + shaftRadius * cos;
    const stz = cz + shaftRadius * sin;
    shaftTopVertices.push(builder.createVertex(await height_data.resolve({x: stx, y: stz, level: tile.level}, topY), color));
  }


  for (let i = 0; i < 8; i++) {
    const next = (i + 1) % 8; // Wrap around to close the circle

    // Cone Tip (Connects Tip to the Outer Head Ring)
    // Reversed order compared to your code if backface culling issues occur: (tip, headBaseVertices[next], headBaseVertices[i])
    builder.triangle(tip, headBaseVertices[next], headBaseVertices[i]);

    // Inner Collar Rim (The flat lip under the arrow head connecting outer head to inner shaft)
    builder.triangle(headBaseVertices[i], shaftBottomVertices[i], headBaseVertices[next]);
    builder.triangle(shaftBottomVertices[i], shaftBottomVertices[next], headBaseVertices[next]);

    // Shaft Walls (The cylinder bodies)
    builder.triangle(shaftBottomVertices[i], shaftTopVertices[i], shaftTopVertices[next]);
    builder.triangle(shaftBottomVertices[i], shaftTopVertices[next], shaftBottomVertices[next]);
  }

  // Flat Top Cap (Polygon fan closing the top back of the shaft)
  // Uses vertex 0 as the root anchor for the triangle fan
  for (let i = 1; i < 7; i++) {
    builder.triangle(shaftTopVertices[0], shaftTopVertices[i], shaftTopVertices[i + 1]);
  }
}

export async function buildPathMesh(
  path: Path,
  builder: MutableMesh = new MutableMesh()
): Promise<MutableMesh> {
  const MARKER_INSET = 0.1
  const MARKER_SIZE = 1 - 2 * MARKER_INSET

  let current_tile_marker_size = 0;

  for (let i = 0; i < path.length; i++) {
    const step = path[i];

    switch (step.type) {
      case "ability": {
        const color = ABILITY_COLORS[step.ability];

        const draw_target_tile = step.ability == "dive" && !step.is_far_dive

        builder.add(
          (await drawLine(step.from, step.to, 0.05, true, current_tile_marker_size, draw_target_tile ? MARKER_SIZE : 0, true))
            .recolor(color)
        )

        // Mark target tile if it's a precise dive
        if (draw_target_tile) {
          builder.add(
            (await drawTileMarker(step.to, MARKER_INSET))
              .recolor(color)
          )
        }

        current_tile_marker_size = draw_target_tile ? MARKER_SIZE : 0

        break;
      }

      case "run": {
        if (step.waypoints.length < 2) break;

        const previous = path[i - 1]

        const line_color = previous?.type == "redclick" && previous.target.kind == "npc" ? COLORS.redclicked_run : COLORS.run
        const tile_color = previous?.type == "redclick" ? COLORS.redclicked_run : COLORS.run

        for (let j = 0; j < step.waypoints.length - 1; j++) {
          const is_last = j === step.waypoints.length - 2;

          builder.add(
            (await drawLine(step.waypoints[j], step.waypoints[j + 1], 0.04, is_last, j === 0 ? current_tile_marker_size : 0, is_last ? MARKER_SIZE : 0, false))
              .recolor(line_color)
          )
        }

        builder.add(
          (await drawTileMarker(step.waypoints[step.waypoints.length - 1], MARKER_INSET)).recolor(tile_color)
        )

        current_tile_marker_size = MARKER_SIZE
        break;
      }

      case "teleport": {
        /*if (step.spot) {
          await drawTileMarker(builder, step.spot, COLORS.teleport);
        }
        current_position_has_marker = !!step.spot*/
        current_tile_marker_size = 0
        break;
      }

      case "transport": {
        current_tile_marker_size = step.is_arrival_only ? MARKER_SIZE : 0

        if (!step.is_arrival_only) break;

        builder.add(
          (await drawTileMarker(step.assumed_start, MARKER_INSET))
            .recolor(COLORS.transport)
        )

        const dest = Path.ends_up([step])

        // TODO: Highlight the thing that needs to be clicked.

        builder.add(
          (await drawLine(step.assumed_start, dest, 0.05, true, 0, MARKER_SIZE, true))
            .recolor(COLORS.transport)
        )

        break;
      }

      case "powerburst": {
        builder.add(
          (await drawTileMarker(step.where, MARKER_INSET))
            .recolor(COLORS.powerburst)
        )

        current_tile_marker_size = MARKER_SIZE

        break;
      }

      case "redclick": {
        await drawRedClickMarker(builder, step.where, COLORS.redclick);

        break;
      }

      case "orientation":
      case "cheat":
      case "cosmetic":
        break;
    }
  }

  return builder
}

export async function buildPathsMesh(
  paths: Path[],
  builder: MutableMesh = new MutableMesh()
): Promise<MutableMesh> {
  for (let path of paths) {
    await buildPathMesh(path, builder)
  }
  return builder
}