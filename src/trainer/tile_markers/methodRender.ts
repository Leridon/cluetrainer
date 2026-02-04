/**
 * Rendering system for clue scroll method paths
 * Builds WebGL mesh data for visualizing path arrows and tile markers
 */
import { GL_FLOAT, GL_UNSIGNED_BYTE, UniformSnapshotBuilder } from "../../lib/alt1gl/ts/overlays";
import { chunksize, fragshadermouse, vertshadermousealpha } from "../../lib/alt1gl/ts/overlays/tilemarkers";
import { tilesize } from "../../lib/alt1gl/ts/render/reflect3d";
import * as patchrs from "../../lib/alt1gl/ts/util/patchrs_napi";
import { TileCoordinates } from "../../lib/runescape/coordinates";
import { Path } from "../../lib/runescape/pathing";
import { SolvingMethods } from "../model/methods";
// ============================================================================
// Constants
// ============================================================================

const CHUNK_SIZE = chunksize;
const TILE_SIZE = tilesize;

/** Offset from tile center to tile edge to avoid overlap with tile markers */
const TILE_EDGE_OFFSET = 0.55;

/** How far arrows extend past their endpoint for seamless joins (when no tile marker) */
const ARROW_OVERLAP = 0.25;

/** Length of the arrow head triangle */
const ARROW_HEAD_LENGTH = 0.3;

/** Height offset above ground for line bodies */
const LINE_HEIGHT = 0.1;

/** Additional height offset for arrow heads (renders on top of lines) */
const ARROW_HEAD_HEIGHT = 0.12;

/** Height offset for tile markers */
const TILE_MARKER_HEIGHT = 0.08;

/** Border thickness for tile markers */
const TILE_MARKER_BORDER = 0.08;

// ============================================================================
// Color Definitions
// ============================================================================

type AbilityName = "surge" | "escape" | "dive" | "barge" | "run" | "teleport" | "transport" | "powerburst" | "redclick";
type ColorRGBA = [number, number, number, number];

/** Color scheme for different ability/step types */
export const ABILITY_COLORS: Record<AbilityName, ColorRGBA> = {
    surge: [0, 100, 255, 255],       // Blue
    escape: [255, 100, 0, 255],      // Orange
    dive: [255, 220, 0, 255],        // Yellow (bladed dive)
    barge: [150, 0, 255, 255],       // Purple
    run: [100, 255, 100, 255],       // Light green
    teleport: [255, 0, 255, 255],    // Magenta
    transport: [0, 255, 200, 255],   // Cyan
    powerburst: [255, 215, 0, 255],  // Gold
    redclick: [255, 50, 50, 255],    // Red
};

// ============================================================================
// Type Guards & Helpers
// ============================================================================

/** Check if a step has renderable tile coordinates */
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

/** Get all levels used by a method's path */
export function getMethodLevels(method: SolvingMethods.GenericPathMethod): Set<number> {
    const levels = new Set<number>();
    const path = method.main_path;
    if (!path) return levels;

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

/** Check if a step is a walkable (run) step */
function isRunStep(step: Path.Step | undefined): step is Path.step_run {
    return !!step && step.type === "run";
}

/** Check if a step is an ability step */
function isAbilityStep(step: Path.Step | undefined): step is Path.step_ability {
    return !!step && step.type === "ability";
}

/** Check if a step is a teleport step */
function isTeleportStep(step: Path.Step | undefined): step is Path.step_teleport {
    return !!step && step.type === "teleport";
}

/** Check if two tile coordinates match (same x, y position) */
function tilesMatch(a: TileCoordinates, b: TileCoordinates): boolean {
    return a.x === b.x && a.y === b.y;
}

// ============================================================================
// Mesh Building
// ============================================================================

interface MeshData {
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

/**
 * Build mesh data for rendering a method path
 * @param time - Animation time in seconds for particle effects
 */
export function buildPathMesh(
    method: SolvingMethods.GenericPathMethod,
    heightData: Uint16Array,
    chunkX: number,
    chunkZ: number,
    playerLevel: number = 0,
    time: number = 0
): MeshData | null {
    const path = method.main_path;
    if (!path || path.length === 0) return null;

    const mesh: MeshBuilder = { pos: [], color: [], index: [], vertexIndex: 0 };
    const rootX = -CHUNK_SIZE / 2 * TILE_SIZE;
    const rootZ = -CHUNK_SIZE / 2 * TILE_SIZE;
    const heightScaling = TILE_SIZE / 32;

    // ========================================================================
    // Vertex Writing
    // ========================================================================

    const writeVertex = (
        tileX: number,
        tileZ: number,
        dx: number,
        dy: number,
        dz: number,
        color: ColorRGBA | number[]
    ): number => {
        // Skip vertices outside this chunk
        if (tileX < 0 || tileZ < 0 || tileX >= CHUNK_SIZE || tileZ >= CHUNK_SIZE) {
            return -1;
        }

        // Interpolate height from terrain data
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

    // ========================================================================
    // Drawing Primitives
    // ========================================================================

    const pushQuad = (v0: number, v1: number, v2: number, v3: number): void => {
        if (v0 >= 0 && v1 >= 0 && v2 >= 0 && v3 >= 0) {
            // Front face
            mesh.index.push(v0, v1, v2, v0, v2, v3);
            // Back face
            mesh.index.push(v0, v2, v1, v0, v3, v2);
        }
    };

    const pushTriangle = (v0: number, v1: number, v2: number): void => {
        if (v0 >= 0 && v1 >= 0 && v2 >= 0) {
            mesh.index.push(v0, v1, v2); // Front
            mesh.index.push(v0, v2, v1); // Back
        }
    };

    // ========================================================================
    // Line/Arrow Drawing
    // ========================================================================

    const drawLine = (
        from: TileCoordinates,
        to: TileCoordinates,
        color: ColorRGBA,
        thickness: number,
        showArrow: boolean,
        startHasTile: boolean,
        endHasTile: boolean
    ): void => {
        // Skip if not on player level
        if (from.level !== playerLevel || to.level !== playerLevel) return;

        // Convert world to chunk-local coordinates (centered on tiles)
        let fx = from.x - chunkX * CHUNK_SIZE + 0.5;
        let fz = from.y - chunkZ * CHUNK_SIZE + 0.5;
        const tx = to.x - chunkX * CHUNK_SIZE + 0.5;
        const tz = to.y - chunkZ * CHUNK_SIZE + 0.5;

        // Early exit if line is entirely outside chunk
        if ((fx < -1 && tx < -1) || (fx > CHUNK_SIZE && tx > CHUNK_SIZE) ||
            (fz < -1 && tz < -1) || (fz > CHUNK_SIZE && tz > CHUNK_SIZE)) {
            return;
        }

        // Calculate direction and length
        let dx = tx - fx;
        let dz = tz - fz;
        let len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) return;

        const dirX = dx / len;
        const dirZ = dz / len;

        // Adjust start point if there's a tile marker
        if (startHasTile) {
            fx += dirX * TILE_EDGE_OFFSET;
            fz += dirZ * TILE_EDGE_OFFSET;
            dx = tx - fx;
            dz = tz - fz;
            len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.01) return;
        }

        // Calculate perpendicular for line width
        const perpX = -dirZ * thickness;
        const perpZ = dirX * thickness;

        // Calculate effective end offset
        const endOffset = endHasTile ? -TILE_EDGE_OFFSET : ARROW_OVERLAP;
        const effectiveLen = len + endOffset;

        // Calculate body length (stops before arrow head if needed)
        const bodyLen = showArrow
            ? Math.max(0, effectiveLen - ARROW_HEAD_LENGTH)
            : (endHasTile ? Math.max(0, effectiveLen) : len);

        // Draw line body as segmented quads
        const segments = Math.max(1, Math.ceil(bodyLen));
        for (let seg = 0; seg < segments; seg++) {
            const t0 = (seg / segments) * (bodyLen / len);
            const t1 = ((seg + 1) / segments) * (bodyLen / len);

            const sx = fx + dx * t0;
            const sz = fz + dz * t0;
            const ex = fx + dx * t1;
            const ez = fz + dz * t1;

            const v0 = writeVertex(Math.floor(sx), Math.floor(sz), sx - Math.floor(sx) - perpX, LINE_HEIGHT, sz - Math.floor(sz) - perpZ, color);
            const v1 = writeVertex(Math.floor(sx), Math.floor(sz), sx - Math.floor(sx) + perpX, LINE_HEIGHT, sz - Math.floor(sz) + perpZ, color);
            const v2 = writeVertex(Math.floor(ex), Math.floor(ez), ex - Math.floor(ex) + perpX, LINE_HEIGHT, ez - Math.floor(ez) + perpZ, color);
            const v3 = writeVertex(Math.floor(ex), Math.floor(ez), ex - Math.floor(ex) - perpX, LINE_HEIGHT, ez - Math.floor(ez) - perpZ, color);

            pushQuad(v0, v1, v2, v3);
        }

        // Draw arrow head
        if (showArrow && len > ARROW_HEAD_LENGTH * 0.5) {
            const arrowWidth = thickness * 3;
            const arrowBodyLen = Math.max(0, effectiveLen - ARROW_HEAD_LENGTH);
            const arrowStart = arrowBodyLen / len;

            const ax = fx + dx * arrowStart;
            const az = fz + dz * arrowStart;

            // Arrow base vertices (wide part)
            const base1x = ax - dirZ * arrowWidth;
            const base1z = az + dirX * arrowWidth;
            const base2x = ax + dirZ * arrowWidth;
            const base2z = az - dirX * arrowWidth;

            // Arrow tip
            const tipX = fx + dirX * effectiveLen;
            const tipZ = fz + dirZ * effectiveLen;

            const v0 = writeVertex(Math.floor(base1x), Math.floor(base1z), base1x - Math.floor(base1x), ARROW_HEAD_HEIGHT, base1z - Math.floor(base1z), color);
            const v1 = writeVertex(Math.floor(base2x), Math.floor(base2z), base2x - Math.floor(base2x), ARROW_HEAD_HEIGHT, base2z - Math.floor(base2z), color);
            const v2 = writeVertex(Math.floor(tipX), Math.floor(tipZ), tipX - Math.floor(tipX), ARROW_HEAD_HEIGHT, tipZ - Math.floor(tipZ), color);

            pushTriangle(v0, v1, v2);
        }
    };

    // ========================================================================
    // Tile Marker Drawing
    // ========================================================================

    const drawTileMarker = (tile: TileCoordinates, color: ColorRGBA): void => {
        // Skip if not on current render level
        if (tile.level !== playerLevel) return;

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
        drawBorderQuad(0, 0, 1, t);     // Top
        drawBorderQuad(0, 1 - t, 1, 1); // Bottom
        drawBorderQuad(0, 0, t, 1);     // Left
        drawBorderQuad(1 - t, 0, 1, 1); // Right
    };

    // ========================================================================
    // Light Beam Marker Drawing (for clickable objects)
    // ========================================================================

    const drawBeamMarker = (tile: TileCoordinates, color: ColorRGBA): void => {
        // Skip if not on current render level
        if (tile.level !== playerLevel) return;

        const lx = tile.x - chunkX * CHUNK_SIZE;
        const lz = tile.y - chunkZ * CHUNK_SIZE;

        if (lx < 0 || lz < 0 || lx >= CHUNK_SIZE || lz >= CHUNK_SIZE) return;

        const beamHeight = 15.0;
        const bottomRadius = 0.8;  // Wide at bottom
        const topRadius = 0.02;    // Narrow at top (almost a point)
        const segments = 12;

        // Beam tilt angle (slight lean)
        const tiltX = 0.15;  // Lean in X direction
        const tiltZ = 0.08;  // Lean in Z direction

        // Center of beam in tile-local coords
        const centerX = 0.5;
        const centerZ = 0.5;

        // Top center is offset due to tilt
        const topCenterX = centerX + tiltX;
        const topCenterZ = centerZ + tiltZ;

        // Transparent colors - more transparent
        const bottomColor: ColorRGBA = [255, 20, 20, 80];
        const topColor: ColorRGBA = [255, 100, 100, 0];

        // Generate vertices for bottom and top circles
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

        // Draw side faces (quads between bottom and top circles) - cone shape
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            pushQuad(bottomVerts[i], bottomVerts[next], topVerts[next], topVerts[i]);
        }

        // Draw bottom cap (transparent red)
        const bottomCenter = writeVertex(lx, lz, centerX, 0, centerZ, [255, 0, 0, 100]);
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            if (bottomCenter >= 0 && bottomVerts[i] >= 0 && bottomVerts[next] >= 0) {
                pushTriangle(bottomCenter, bottomVerts[next], bottomVerts[i]);
            }
        }
    };

    // ========================================================================
    // Step Processing Helpers
    // ========================================================================

    /**
     * Determine if surge line should start at tile edge (previous step drew tile there)
     */
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

    /**
     * Determine if surge should render end tile
     */
    const getSurgeEndHasTile = (nextStep: Path.Step | undefined): boolean => {
        // No end tile if next step is run (seamless transition)
        if (isRunStep(nextStep)) return false;
        // Draw end tile if there's a concrete next step or this is the last step
        return stepHasCoordinates(nextStep) || !nextStep;
    };

    // ========================================================================
    // Main Step Processing Loop
    // ========================================================================

    for (let i = 0; i < path.length; i++) {
        const step = path[i];
        const prevStep = path[i - 1];
        const nextStep = path[i + 1];

        switch (step.type) {
            case "ability": {
                const color = ABILITY_COLORS[step.ability] ?? ABILITY_COLORS.surge;
                const isSurge = step.ability === "surge";

                // For surge: check if previous step already drew a tile at start position
                const prevStepDrewStartTile = isSurge && getSurgeStartHasTile(step, prevStep);

                const endHasTile = isSurge
                    ? getSurgeEndHasTile(nextStep)
                    : true; // Non-surge abilities always draw 'to' tile

                // Surge always offsets line from start tile (either prev drew it or we draw it)
                // Non-surge abilities always have both tiles
                const startHasTile = isSurge ? true : true;

                drawLine(step.from, step.to, color, 0.05, true, startHasTile, endHasTile);

                if (isSurge) {
                    // Draw start tile if previous step didn't already draw one there
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

                // Draw intermediate segments (no arrows)
                for (let j = 0; j < step.waypoints.length - 2; j++) {
                    const segStartHasTile = j === 0 && !prevWasSurge;
                    drawLine(step.waypoints[j], step.waypoints[j + 1], ABILITY_COLORS.run, 0.04, false, segStartHasTile, false);
                }

                // Draw final segment (with arrow, end tile always rendered)
                const lastSegStart = step.waypoints.length === 2 && !prevWasSurge;
                drawLine(
                    step.waypoints[step.waypoints.length - 2],
                    step.waypoints[step.waypoints.length - 1],
                    ABILITY_COLORS.run, 0.04, true, lastSegStart, true
                );

                // Start tile (skip if coming from surge)
                if (!prevWasSurge) {
                    drawTileMarker(step.waypoints[0], ABILITY_COLORS.run);
                }

                // End tile (use surge color if next step is surge)
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

                // Try to extract destination from transport action
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

            // These step types have no visual representation
            case "orientation":
            case "cheat":
            case "cosmetic":
                break;
        }
    }

    // Return null if no geometry was generated
    if (mesh.index.length === 0) return null;

    return {
        pos: new Uint8Array(Float32Array.from(mesh.pos).buffer),
        color: new Uint8Array(Uint8Array.from(mesh.color).buffer),
        index: new Uint8Array(Uint16Array.from(mesh.index).buffer)
    };
}

// ============================================================================
// GL Program Creation
// ============================================================================

/**
 * Create GL program for path rendering (flat colors, no lighting)
 */
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
