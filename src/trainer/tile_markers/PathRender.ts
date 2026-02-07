import {chunksize} from "../../lib/alt1gl/ts/overlays/tilemarkers";
import {tilesize} from "../../lib/alt1gl/ts/render/reflect3d";
import {floor_t, TileCoordinates} from "../../lib/runescape/coordinates";
import {Path} from "../../lib/runescape/pathing";
import {TileHeightData} from "./TileHeightData";
import {MeshBuilder} from "./MeshBuilder";
import ColorRGBA = MeshBuilder.ColorRGBA;
import Vector3 = MeshBuilder.Vector3;
import Vertex = MeshBuilder.Vertex;

type AbilityName = "surge" | "escape" | "dive" | "barge" | "run" | "teleport" | "transport" | "powerburst" | "redclick";

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;
const TILE_EDGE_OFFSET = 0.55;
const ARROW_OVERLAP = 0.25;
const ARROW_HEAD_LENGTH = 0.3;
const LINE_HEIGHT = 0.1;
const ARROW_HEAD_HEIGHT = 0.12;

const FLOOR_OVERLAY_VERTICAL_OFFSET = 1 / 16;
const TILE_MARKER_HEIGHT = 0.08;
const TILE_MARKER_BORDER = 0.08;

export const ABILITY_COLORS: Record<AbilityName, MeshBuilder.ColorRGBA> = {
  surge: [0, 100, 255, 255],
  escape: [255, 100, 0, 255],
  dive: [255, 220, 0, 255],
  barge: [150, 0, 255, 255],
  run: [100, 255, 100, 255],
  teleport: [255, 0, 255, 255],
  transport: [0, 255, 200, 255],
  powerburst: [255, 215, 0, 255],
  redclick: [255, 50, 50, 255],
};

function stepHasCoordinates(step: Path.Step | undefined): boolean {
  if (!step) return false;
  switch (step.type) {
    case "teleport":
      return !!step.spot;
    case "ability":
      return !!(step.from || step.to);
    case "run":
      return !!(step.waypoints && step.waypoints.length > 0);
    case "transport":
      return !!step.assumed_start;
    case "powerburst":
      return !!step.where;
    case "redclick":
      return !!step.where;
    case "cheat":
      return !!(step.assumed_start || step.target);
    default:
      return false;
  }
}

export function getPathLevels(path: Path): Set<floor_t> {
  const levels = new Set<floor_t>();

  for (const step of path) {
    switch (step.type) {
      case "teleport":
        if (step.spot) levels.add(step.spot.level);
        break;
      case "ability":
        if (step.from) levels.add(step.from.level);
        if (step.to) levels.add(step.to.level);
        break;
      case "run":
        if (step.waypoints) {
          for (const wp of step.waypoints) levels.add(wp.level);
        }
        break;
      case "transport":
        if (step.assumed_start) levels.add(step.assumed_start.level);
        break;
      case "powerburst":
        if (step.where) levels.add(step.where.level);
        break;
      case "redclick":
        if (step.where) levels.add(step.where.level);
        break;
      case "cheat":
        if (step.assumed_start) levels.add(step.assumed_start.level);
        if (step.target) levels.add(step.target.level);
        break;
    }
  }
  return levels;
}

function isRunStep(step: Path.Step | undefined): step is Path.step_run {
  return !!step && step.type === "run";
}

function isAbilityStep(step: Path.Step | undefined): step is Path.step_ability {
  return !!step && step.type === "ability";
}

function isTeleportStep(step: Path.Step | undefined): step is Path.step_teleport {
  return !!step && step.type === "teleport";
}

function tilesMatch(a: TileCoordinates, b: TileCoordinates): boolean {
  return a.x === b.x && a.y === b.y;
}


export async function buildPathMesh(
  builder: MeshBuilder,
  path: Path
): Promise<void> {
  const height_data = TileHeightData.instance();

  const drawLine = async (
    from: TileCoordinates,
    to: TileCoordinates,
    color: ColorRGBA,
    thickness: number,
    showArrow: boolean,
    startHasTile: boolean,
    endHasTile: boolean
  ): Promise<void> => {
    let fx = from.x + 0.5;
    let fz = from.y + 0.5;
    const tx = to.x + 0.5;
    const tz = to.y + 0.5;

    let dx = tx - fx;
    let dz = tz - fz;
    let len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return;

    const dirX = dx / len;
    const dirZ = dz / len;

    if (startHasTile) {
      fx += dirX * TILE_EDGE_OFFSET;
      fz += dirZ * TILE_EDGE_OFFSET;
      dx = tx - fx;
      dz = tz - fz;
      len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.01) return;
    }

    const perpX = -dirZ * thickness;
    const perpZ = dirX * thickness;

    const endOffset = endHasTile ? -TILE_EDGE_OFFSET : ARROW_OVERLAP;
    const effectiveLen = len + endOffset;

    const bodyLen = showArrow
      ? Math.max(0, effectiveLen - ARROW_HEAD_LENGTH)
      : (endHasTile ? Math.max(0, effectiveLen) : len);

    const segments = Math.max(1, Math.ceil(2 * bodyLen));

    let control_points: Vector3[] = [];

    // Get all control points along the line
    for (let seg = 0; seg <= segments; seg++) {
      const t0 = (seg / segments) * (bodyLen / len);

      control_points.push(await height_data.resolve({
        x: fx + dx * t0,
        y: fz + dz * t0,
        level: from.level
      }, FLOOR_OVERLAY_VERTICAL_OFFSET))
    }

    function convexHull(points: Vector3[]): Vector3[] {
      // TODO: I don't think this is the most efficient algorithm.
      //       It's O(n^2), but there should be an O(n) solution.
      const hull: Vector3[] = [];
      hull.push(points[0]);

      let next_unhandled = 1;

      while (next_unhandled < points.length) {
        const last_control = hull[hull.length - 1];

        let highest_inclination = Number.MIN_VALUE
        let best_next_spot: number = -1;

        for (let j = next_unhandled + 1; j < points.length; j++) {
          const inclination = (points[j].y - last_control.y) / Math.sqrt((points[j].x - last_control.x) ** 2 + (points[j].z - last_control.z) ** 2);

          if (inclination > highest_inclination) {
            highest_inclination = inclination;
            best_next_spot = j;
          }
        }
        if (best_next_spot != -1) {
          hull.push(points[best_next_spot]);
          next_unhandled = best_next_spot + 1;
        } else {
          break;
        }
      }

      hull.push(points[points.length - 1]);

      return hull;
    }

    control_points = convexHull(control_points);

    for (let i = 1; i < control_points.length; i++) {
      const segment_start = control_points[i - 1];
      const segment_end = control_points[i];

      const v0 = builder.createVertex(Vector3.add(segment_start, {x: -perpX, y: 0, z: -perpZ}), color);
      const v1 = builder.createVertex(Vector3.add(segment_start, {x: +perpX, y: 0, z: +perpZ}), color);
      const v2 = builder.createVertex(Vector3.add(segment_end, {x: -perpX, y: 0, z: -perpZ}), color);
      const v3 = builder.createVertex(Vector3.add(segment_end, {x: +perpX, y: 0, z: +perpZ}), color);

      builder.quad(v0, v1, v2, v3);
    }

    if (showArrow && len > ARROW_HEAD_LENGTH * 0.5) {
      const arrowWidth = thickness * 3;
      const arrowBodyLen = Math.max(0, effectiveLen - ARROW_HEAD_LENGTH);
      const arrowStart = arrowBodyLen / len;

      const ax = fx + dx * arrowStart;
      const az = fz + dz * arrowStart;

      const base1x = ax - dirZ * arrowWidth;
      const base1z = az + dirX * arrowWidth;
      const base2x = ax + dirZ * arrowWidth;
      const base2z = az - dirX * arrowWidth;

      const tipX = fx + dirX * effectiveLen;
      const tipZ = fz + dirZ * effectiveLen;

      const v0 = builder.createVertex(await height_data.resolve({x: base1x, y: base1z, level: to.level}, FLOOR_OVERLAY_VERTICAL_OFFSET), color);
      const v1 = builder.createVertex(await height_data.resolve({x: base2x, y: base2z, level: to.level}, FLOOR_OVERLAY_VERTICAL_OFFSET), color);
      const v2 = builder.createVertex(await height_data.resolve({x: tipX, y: tipZ, level: to.level}, FLOOR_OVERLAY_VERTICAL_OFFSET), color);

      builder.triangle(v0, v1, v2);
    }
  };

  const drawTileMarker = async (tile: TileCoordinates, color: ColorRGBA): Promise<void> => {
    const lx = tile.x;
    const lz = tile.y;

    const drawBorderQuad = async (x0: number, z0: number, x1: number, z1: number): Promise<void> => {
      const v0 = builder.createVertex(await height_data.resolve({x: lx + x0, y: lz + z0, level: tile.level}, TILE_MARKER_HEIGHT), color);
      const v1 = builder.createVertex(await height_data.resolve({x: lx + x1, y: lz + z0, level: tile.level}, TILE_MARKER_HEIGHT), color);
      const v2 = builder.createVertex(await height_data.resolve({x: lx + x1, y: lz + z1, level: tile.level}, TILE_MARKER_HEIGHT), color);
      const v3 = builder.createVertex(await height_data.resolve({x: lx + x0, y: lz + z1, level: tile.level}, TILE_MARKER_HEIGHT), color);

      builder.quad(v0, v1, v2, v3)
    };

    const t = TILE_MARKER_BORDER;
    await drawBorderQuad(0, 0, 1, t);
    await drawBorderQuad(0, 1 - t, 1, 1);
    await drawBorderQuad(0, 0, t, 1);
    await drawBorderQuad(1 - t, 0, 1, 1);
  };


  const drawBeamMarker = async (tile: TileCoordinates, color: ColorRGBA): Promise<void> => {
    const lx = tile.x;
    const lz = tile.y;

    const beamHeight = 15.0;
    const bottomRadius = 0.8;
    const topRadius = 0.02;
    const segments = 12;

    const tiltX = 0.15;
    const tiltZ = 0.08;

    const centerX = 0.5;
    const centerZ = 0.5;

    const topCenterX = centerX + tiltX;
    const topCenterZ = centerZ + tiltZ;

    const bottomColor: ColorRGBA = [255, 20, 20, 80];
    const topColor: ColorRGBA = [255, 100, 100, 0];

    const bottomVerts: Vertex[] = [];
    const topVerts: Vertex[] = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const bottomV = builder.createVertex(
        await height_data.resolve({
          x: lx + centerX + cos * bottomRadius,
          y: centerZ + sin * bottomRadius,
          level: tile.level
        }, FLOOR_OVERLAY_VERTICAL_OFFSET), bottomColor);

      const topV = builder.createVertex(await height_data.resolve({
        x: topCenterX + cos * topRadius,
        y: topCenterZ + sin * topRadius,
        level: tile.level
      }, 0), topColor);

      bottomVerts.push(bottomV);
      topVerts.push(topV);
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      builder.quad(bottomVerts[i], bottomVerts[next], topVerts[next], topVerts[i]);
    }

    const bottomCenter = builder.createVertex(await height_data.resolve({x: lx + centerX, y: lz + centerZ, level: tile.level}, beamHeight), [255, 0, 0, 100]);

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      builder.triangle(bottomCenter, bottomVerts[next], bottomVerts[i]);
    }
  };

  const getSurgeStartHasTile = (
    surgeStep: Path.step_ability,
    prevStep: Path.Step | undefined
  ): boolean => {
    if (!prevStep) return false;

    // Check run step end tile
    if (isRunStep(prevStep) && prevStep.waypoints.length > 0) {
      const runEnd = prevStep.waypoints[prevStep.waypoints.length - 1];
      if (tilesMatch(runEnd, surgeStep.from)) return true;
    }

    // Check teleport spot
    if (isTeleportStep(prevStep) && prevStep.spot) {
      if (tilesMatch(prevStep.spot, surgeStep.from)) return true;
    }

    // Check non-surge ability end tile (dive, escape, barge draw tiles at 'to')
    if (isAbilityStep(prevStep) && prevStep.ability !== "surge" && prevStep.to) {
      if (tilesMatch(prevStep.to, surgeStep.from)) return true;
    }

    return false;
  };

  const getSurgeEndHasTile = (nextStep: Path.Step | undefined): boolean => {
    // No end tile if next step is run (seamless transition)
    if (isRunStep(nextStep)) return false;
    // Draw end tile if there's a concrete next step or this is the last step
    return stepHasCoordinates(nextStep) || !nextStep;
  };

  for (let i = 0; i < path.length; i++) {
    const step = path[i];
    const prevStep = path[i - 1];
    const nextStep = path[i + 1];

    switch (step.type) {
      case "ability": {
        const color = ABILITY_COLORS[step.ability] ?? ABILITY_COLORS.surge;
        const isSurge = step.ability === "surge";

        const prevStepDrewStartTile = isSurge && getSurgeStartHasTile(step, prevStep);

        const endHasTile = isSurge
          ? getSurgeEndHasTile(nextStep)
          : true;

        const startHasTile = isSurge ? true : true;

        await drawLine(step.from, step.to, color, 0.05, true, startHasTile, endHasTile);

        if (isSurge) {
          if (!prevStepDrewStartTile) {
            await drawTileMarker(step.from, color);
          }
          if (endHasTile) {
            await drawTileMarker(step.to, color);
          }
        } else {
          await drawTileMarker(step.from, color);
          await drawTileMarker(step.to, color);
        }
        break;
      }

      case "run": {
        if (step.waypoints.length < 2) break;

        const prevWasSurge = isAbilityStep(prevStep) && prevStep.ability === "surge";
        const nextIsSurge = isAbilityStep(nextStep) && nextStep.ability === "surge";

        for (let j = 0; j < step.waypoints.length - 2; j++) {
          const segStartHasTile = j === 0 && !prevWasSurge;
          await drawLine(step.waypoints[j], step.waypoints[j + 1], ABILITY_COLORS.run, 0.04, false, segStartHasTile, false);
        }

        const lastSegStart = step.waypoints.length === 2 && !prevWasSurge;
        await drawLine(
          step.waypoints[step.waypoints.length - 2],
          step.waypoints[step.waypoints.length - 1],
          ABILITY_COLORS.run, 0.04, true, lastSegStart, true
        );

        if (!prevWasSurge) {
          await drawTileMarker(step.waypoints[0], ABILITY_COLORS.run);
        }

        const endColor = nextIsSurge ? ABILITY_COLORS.surge : ABILITY_COLORS.run;
        await drawTileMarker(step.waypoints[step.waypoints.length - 1], endColor);
        break;
      }

      case "teleport": {
        if (step.spot) {
          await drawTileMarker(step.spot, ABILITY_COLORS.teleport);
        }
        break;
      }

      case "transport": {
        if (!step.assumed_start) break;

        await drawTileMarker(step.assumed_start, ABILITY_COLORS.transport);

        const action = step.internal?.actions?.[0];
        const movement = action?.movement?.[0];
        if (movement?.offset) {
          const dest: TileCoordinates = {
            x: step.assumed_start.x + movement.offset.x,
            y: step.assumed_start.y + movement.offset.y,
            level: (step.assumed_start.level + (movement.offset.level ?? 0)) as TileCoordinates["level"]
          };
          await drawLine(step.assumed_start, dest, ABILITY_COLORS.transport, 0.05, true, true, true);
          await drawTileMarker(dest, ABILITY_COLORS.transport);
        }
        break;
      }

      case "powerburst": {
        if (step.where) {
          await drawTileMarker(step.where, ABILITY_COLORS.powerburst);
        }
        break;
      }

      case "redclick": {
        if (step.where) {
          await drawBeamMarker(step.where, ABILITY_COLORS.redclick);
        }
        break;
      }

      case "orientation":
      case "cheat":
      case "cosmetic":
        break;
    }
  }
}