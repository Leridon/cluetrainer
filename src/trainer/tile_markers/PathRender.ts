import { GL_FLOAT, GL_UNSIGNED_BYTE, UniformSnapshotBuilder } from "../../lib/alt1gl/ts/overlays";
import { chunksize, fragshadermouse, vertshadermousealpha } from "../../lib/alt1gl/ts/overlays/tilemarkers";
import { tilesize } from "../../lib/alt1gl/ts/render/reflect3d";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import { TileCoordinates } from "../../lib/runescape/coordinates";
import { Path } from "../../lib/runescape/pathing";

type AbilityName = "surge" | "escape" | "dive" | "barge" | "run" | "teleport" | "transport" | "powerburst" | "redclick";
type ColorRGBA = [number, number, number, number];

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;
const TILE_EDGE_OFFSET = 0.55;
const ARROW_OVERLAP = 0.25;
const ARROW_HEAD_LENGTH = 0.3;
const LINE_HEIGHT = 0.1;
const ARROW_HEAD_HEIGHT = 0.12;
const TILE_MARKER_HEIGHT = 0.08;
const TILE_MARKER_BORDER = 0.08;

export const ABILITY_COLORS: Record<AbilityName, ColorRGBA> = {
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
        case "teleport": return !!step.spot;
        case "ability": return !!(step.from || step.to);
        case "run": return !!(step.waypoints && step.waypoints.length > 0);
        case "transport": return !!step.assumed_start;
        case "powerburst": return !!step.where;
        case "redclick": return !!step.where;
        case "cheat": return !!(step.assumed_start || step.target);
        default: return false;
    }
}

export function getPathLevels(path: Path): Set<number> {
    const levels = new Set<number>();

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

export interface MeshData {
    pos: Uint8Array;
    color: Uint8Array;
    index: Uint8Array;
}

interface MeshBuilder {
    pos: number[];
    color: number[];
    index: number[];
    vertexIndex: number;
}

export function buildPathMesh(
    path: Path,
    heightData: Uint16Array,
    chunkX: number,
    chunkZ: number,
    level: number = 0
): MeshData | null {
    if (!path || path.length === 0) return null;

    const mesh: MeshBuilder = { pos: [], color: [], index: [], vertexIndex: 0 };
    const rootX = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootZ = -CHUNK_SIZE / 2 * TILE_SIZE;
    const heightScaling = TILE_SIZE / 32;

    const getTerrainHeight = (x: number, z: number): number => {
        const tile_x = Math.floor(x);
        const tile_z = Math.floor(z)

        const dx = x - tile_x;
        const dz = z - tile_z;

        const tileIndex = (tile_x + tile_z * CHUNK_SIZE) * 5;

        const y00 = heightData[tileIndex + 0] * heightScaling * (1 - dx) * (1 - dz);
        const y01 = heightData[tileIndex + 1] * heightScaling * dx * (1 - dz);
        const y10 = heightData[tileIndex + 2] * heightScaling * (1 - dx) * dz;
        const y11 = heightData[tileIndex + 3] * heightScaling * dx * dz;

        return y00 + y01 + y10 + y11
    }

    const writeVertex = (
        tileX: number,
        tileZ: number,
        dx: number,
        dy: number,
        dz: number,
        color: ColorRGBA | number[]
    ): number => {
        if (tileX < 0 || tileZ < 0 || tileX >= CHUNK_SIZE || tileZ >= CHUNK_SIZE) {
            return -1;
        }

        const tileIndex = (tileX + tileZ * CHUNK_SIZE) * 5;
        const y00 = heightData[tileIndex + 0] * heightScaling * (1 - dx) * (1 - dz);
        const y01 = heightData[tileIndex + 1] * heightScaling * dx * (1 - dz);
        const y10 = heightData[tileIndex + 2] * heightScaling * (1 - dx) * dz;
        const y11 = heightData[tileIndex + 3] * heightScaling * dx * dz;

        mesh.pos.push(
            (tileX + dx) * TILE_SIZE + rootX,
            y00 + y01 + y10 + y11 + dy * TILE_SIZE,
            (tileZ + dz) * TILE_SIZE + rootZ
        );
        mesh.color.push(...color);
        return mesh.vertexIndex++;
    };


    const pushQuad = (v0: number, v1: number, v2: number, v3: number): void => {
        if (v0 >= 0 && v1 >= 0 && v2 >= 0 && v3 >= 0) {
            mesh.index.push(v0, v1, v2, v0, v2, v3);
            mesh.index.push(v0, v2, v1, v0, v3, v2);
        }
    };

    const pushTriangle = (v0: number, v1: number, v2: number): void => {
        if (v0 >= 0 && v1 >= 0 && v2 >= 0) {
            mesh.index.push(v0, v1, v2);
            mesh.index.push(v0, v2, v1);
        }
    };

    const drawLine = (
        from: TileCoordinates,
        to: TileCoordinates,
        color: ColorRGBA,
        thickness: number,
        showArrow: boolean,
        startHasTile: boolean,
        endHasTile: boolean
    ): void => {
        if (from.level !== level || to.level !== level) return;

        let fx = from.x - chunkX * CHUNK_SIZE + 0.5;
        let fz = from.y - chunkZ * CHUNK_SIZE + 0.5;
        const tx = to.x - chunkX * CHUNK_SIZE + 0.5;
        const tz = to.y - chunkZ * CHUNK_SIZE + 0.5;

        if ((fx < -1 && tx < -1) || (fx > CHUNK_SIZE && tx > CHUNK_SIZE) ||
            (fz < -1 && tz < -1) || (fz > CHUNK_SIZE && tz > CHUNK_SIZE)) {
            return;
        }

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

        type Point = { x: number; z: number; y: number }

        let control_points: { x: number; z: number; y: number }[] = [];

        // Get all control points along the line
        for (let seg = 0; seg <= segments; seg++) {
            const t0 = (seg / segments) * (bodyLen / len);

            const x = fx + dx * t0;
            const z = fz + dz * t0;
            const y = getTerrainHeight(x, z)

            control_points.push({ x, y, z });
        }

        function convexHull(points: Point[]): Point[] {
            // TODO: I don't think this is the most efficient algorithm.
            //       It's O(n^2), but there should be an O(n) solution.
            const hull: Point[] = [];
            hull.push(points[0]);

            let next_unhandled = 1;

            while(next_unhandled < points.length) {
                const last_control = hull[hull.length - 1];

                let highest_inclination = Number.MIN_VALUE
                let best_next_spot: number = -1;

                for(let j = next_unhandled + 1; j < points.length; j++) {
                    const inclination = (points[j].y - last_control.y) / Math.sqrt((points[j].x - last_control.x) ** 2 + (points[j].z - last_control.z) ** 2);

                    if(inclination > highest_inclination) {
                        highest_inclination = inclination;
                        best_next_spot = j;
                    }
                }
                if(best_next_spot != -1) {
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

            const sx = segment_start.x;
            const sz = segment_start.z;
            const ex = segment_end.x;
            const ez = segment_end.z;

            const v0 = writeVertex(Math.floor(sx), Math.floor(sz), sx - Math.floor(sx) - perpX, LINE_HEIGHT, sz - Math.floor(sz) - perpZ, color);
            const v1 = writeVertex(Math.floor(sx), Math.floor(sz), sx - Math.floor(sx) + perpX, LINE_HEIGHT, sz - Math.floor(sz) + perpZ, color);
            const v2 = writeVertex(Math.floor(ex), Math.floor(ez), ex - Math.floor(ex) + perpX, LINE_HEIGHT, ez - Math.floor(ez) + perpZ, color);
            const v3 = writeVertex(Math.floor(ex), Math.floor(ez), ex - Math.floor(ex) - perpX, LINE_HEIGHT, ez - Math.floor(ez) - perpZ, color);

            pushQuad(v0, v1, v2, v3);
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

            const v0 = writeVertex(Math.floor(base1x), Math.floor(base1z), base1x - Math.floor(base1x), ARROW_HEAD_HEIGHT, base1z - Math.floor(base1z), color);
            const v1 = writeVertex(Math.floor(base2x), Math.floor(base2z), base2x - Math.floor(base2x), ARROW_HEAD_HEIGHT, base2z - Math.floor(base2z), color);
            const v2 = writeVertex(Math.floor(tipX), Math.floor(tipZ), tipX - Math.floor(tipX), ARROW_HEAD_HEIGHT, tipZ - Math.floor(tipZ), color);

            pushTriangle(v0, v1, v2);
        }
    };


    const drawTileMarker = (tile: TileCoordinates, color: ColorRGBA): void => {
        if (tile.level !== level) return;

        const lx = tile.x - chunkX * CHUNK_SIZE;
        const lz = tile.y - chunkZ * CHUNK_SIZE;

        if (lx < 0 || lz < 0 || lx >= CHUNK_SIZE || lz >= CHUNK_SIZE) return;

        const drawBorderQuad = (x0: number, z0: number, x1: number, z1: number): void => {
            const v0 = writeVertex(lx, lz, x0, TILE_MARKER_HEIGHT, z0, color);
            const v1 = writeVertex(lx, lz, x1, TILE_MARKER_HEIGHT, z0, color);
            const v2 = writeVertex(lx, lz, x1, TILE_MARKER_HEIGHT, z1, color);
            const v3 = writeVertex(lx, lz, x0, TILE_MARKER_HEIGHT, z1, color);
            pushQuad(v0, v1, v2, v3);
        };

        const t = TILE_MARKER_BORDER;
        drawBorderQuad(0, 0, 1, t);
        drawBorderQuad(0, 1 - t, 1, 1);
        drawBorderQuad(0, 0, t, 1);
        drawBorderQuad(1 - t, 0, 1, 1);
    };


    const drawBeamMarker = (tile: TileCoordinates, color: ColorRGBA): void => {
        if (tile.level !== level) return;

        const lx = tile.x - chunkX * CHUNK_SIZE;
        const lz = tile.y - chunkZ * CHUNK_SIZE;

        if (lx < 0 || lz < 0 || lx >= CHUNK_SIZE || lz >= CHUNK_SIZE) return;

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

        const bottomVerts: number[] = [];
        const topVerts: number[] = [];

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const bottomV = writeVertex(lx, lz, centerX + cos * bottomRadius, 0, centerZ + sin * bottomRadius, bottomColor);
            const topV = writeVertex(lx, lz, topCenterX + cos * topRadius, beamHeight, topCenterZ + sin * topRadius, topColor);

            bottomVerts.push(bottomV);
            topVerts.push(topV);
        }

        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            pushQuad(bottomVerts[i], bottomVerts[next], topVerts[next], topVerts[i]);
        }

        const bottomCenter = writeVertex(lx, lz, centerX, 0, centerZ, [255, 0, 0, 100]);
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            if (bottomCenter >= 0 && bottomVerts[i] >= 0 && bottomVerts[next] >= 0) {
                pushTriangle(bottomCenter, bottomVerts[next], bottomVerts[i]);
            }
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

                drawLine(step.from, step.to, color, 0.05, true, startHasTile, endHasTile);

                if (isSurge) {
                    if (!prevStepDrewStartTile) {
                        drawTileMarker(step.from, color);
                    }
                    if (endHasTile) {
                        drawTileMarker(step.to, color);
                    }
                } else {
                    drawTileMarker(step.from, color);
                    drawTileMarker(step.to, color);
                }
                break;
            }

            case "run": {
                if (step.waypoints.length < 2) break;

                const prevWasSurge = isAbilityStep(prevStep) && prevStep.ability === "surge";
                const nextIsSurge = isAbilityStep(nextStep) && nextStep.ability === "surge";

                for (let j = 0; j < step.waypoints.length - 2; j++) {
                    const segStartHasTile = j === 0 && !prevWasSurge;
                    drawLine(step.waypoints[j], step.waypoints[j + 1], ABILITY_COLORS.run, 0.04, false, segStartHasTile, false);
                }

                const lastSegStart = step.waypoints.length === 2 && !prevWasSurge;
                drawLine(
                    step.waypoints[step.waypoints.length - 2],
                    step.waypoints[step.waypoints.length - 1],
                    ABILITY_COLORS.run, 0.04, true, lastSegStart, true
                );

                if (!prevWasSurge) {
                    drawTileMarker(step.waypoints[0], ABILITY_COLORS.run);
                }

                const endColor = nextIsSurge ? ABILITY_COLORS.surge : ABILITY_COLORS.run;
                drawTileMarker(step.waypoints[step.waypoints.length - 1], endColor);
                break;
            }

            case "teleport": {
                if (step.spot) {
                    drawTileMarker(step.spot, ABILITY_COLORS.teleport);
                }
                break;
            }

            case "transport": {
                if (!step.assumed_start) break;

                drawTileMarker(step.assumed_start, ABILITY_COLORS.transport);

                const action = step.internal?.actions?.[0];
                const movement = action?.movement?.[0];
                if (movement?.offset) {
                    const dest: TileCoordinates = {
                        x: step.assumed_start.x + movement.offset.x,
                        y: step.assumed_start.y + movement.offset.y,
                        level: (step.assumed_start.level + (movement.offset.level ?? 0)) as TileCoordinates["level"]
                    };
                    drawLine(step.assumed_start, dest, ABILITY_COLORS.transport, 0.05, true, true, true);
                    drawTileMarker(dest, ABILITY_COLORS.transport);
                }
                break;
            }

            case "powerburst": {
                if (step.where) {
                    drawTileMarker(step.where, ABILITY_COLORS.powerburst);
                }
                break;
            }

            case "redclick": {
                if (step.where) {
                    drawBeamMarker(step.where, ABILITY_COLORS.redclick);
                }
                break;
            }

            case "orientation":
            case "cheat":
            case "cosmetic":
                break;
        }
    }

    if (mesh.index.length === 0) return null;

    return {
        pos: new Uint8Array(Float32Array.from(mesh.pos).buffer),
        color: new Uint8Array(Uint8Array.from(mesh.color).buffer),
        index: new Uint8Array(Uint16Array.from(mesh.index).buffer)
    };
}

export function createPathRenderProgram() {
    const uniforms = new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4"
    });

    const uniformSources: patchrs.OverlayUniformSource[] = [
        { type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix" }
    ];

    const program = patchrs.native.createProgram(vertshadermousealpha, fragshadermouse, [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
        { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4 }
    ], uniforms.args);

    return { uniforms, program, uniformSources };
}
