import { findFloorRender, fragshader, GL_FLOAT, GL_FLOAT_MAT4, GL_FLOAT_VEC2, GL_FLOAT_VEC3, GL_FLOAT_VEC4, GL_UNSIGNED_BYTE, positionMatrix, UniformSnapshotBuilder, uniformTypes, vertshader } from ".";
import { getUniformValue } from "../render/renderprogram";
import * as patchrs from "../util/patchrs_napi";
import { getOrInsert } from "../util/util";

export const chunksize = 64;
export const tilesize = 512;


export const fragshaderflatnormals = `
    #version 330 core

    in vec3 FragPos;           // World-space position, passed from vertex shader
    in vec4 ourColor;          // Color, passed from vertex shader

    uniform vec3 uInvSunDirection;
    uniform vec3 uSunColour;
    uniform vec3 uAmbientColour;

    out vec4 FragColor;

    void main() {
        // Compute face normal from position derivatives
        vec3 dx = dFdx(FragPos);
        vec3 dy = dFdy(FragPos);
        vec3 norm = normalize(cross(dx, dy));

        // Light direction from sunlight matrix (-Z axis)
        vec3 lightDir = normalize(-uInvSunDirection);

        // Diffuse lighting
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * uSunColour;

        // Combine lighting
        vec3 lighting = diffuse + uAmbientColour;
        vec3 finalColor = ourColor.rgb * lighting;

        FragColor = vec4(finalColor*0.5, ourColor.a);
    }`;


export const vertshadermouse = `
    #version 330 core
    layout (location = 0) in vec3 aPos;
    layout (location = 6) in vec3 aColor;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    uniform highp vec2 uMouse;
    out vec4 ourColor;
    out vec3 FragPos;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        gl_Position = uViewProjMatrix * worldpos;
        FragPos = worldpos.xyz/worldpos.w;
        
        // float dist = distance(uMouse,gl_Position.xy/gl_Position.w);
        // float value = max(0.0,min(0.02,(0.3-dist/0.6)));
        // ourColor = vec4(vec3(value),1.0);
        ourColor = vec4(aColor,1.0);
    }`;

export const fragshadermouse = `
    #version 330 core
    in vec4 ourColor;
    out vec4 FragColor;
    void main() {
        FragColor = ourColor;
    }`;


function mapsquareCollisionMesh(file: Uint16Array) {
    // based on rsmv collision mesh implementation
    let tallonly = true;

    let pos: number[] = [];
    let color: number[] = [];
    let index: number[] = [];
    const rootx = -chunksize / 2 * tilesize;
    const rootz = -chunksize / 2 * tilesize;
    const heightscaling = tilesize / 32;

    let vertexindex = 0;
    let writevertex = (tilex: number, tilez: number, dx: number, dy: number, dz: number, vertcol: number[]) => {
        const tileindex = (tilex + tilez * chunksize) * 5;
        const y00 = file[tileindex + 0] * heightscaling * (1 - dx) * (1 - dz);
        const y01 = file[tileindex + 1] * heightscaling * dx * (1 - dz);
        const y10 = file[tileindex + 2] * heightscaling * (1 - dx) * dz;
        const y11 = file[tileindex + 3] * heightscaling * dx * dz;
        pos.push(
            (tilex + dx) * tilesize + rootx,
            y00 + y01 + y10 + y11 + dy * tilesize,
            (tilez + dz) * tilesize + rootz
        );
        color.push(...vertcol);
        return vertexindex++;
    }
    let writebox = (tilex: number, tilez: number, dx: number, dy: number, dz: number, sizex: number, sizey: number, sizez: number, color: number[]) => {
        //all corners of the box
        let v000 = writevertex(tilex, tilez, dx, dy, dz, color);
        let v001 = writevertex(tilex, tilez, dx + sizex, dy, dz, color);
        let v010 = writevertex(tilex, tilez, dx, dy + sizey, dz, color);
        let v011 = writevertex(tilex, tilez, dx + sizex, dy + sizey, dz, color);
        let v100 = writevertex(tilex, tilez, dx, dy, dz + sizez, color);
        let v101 = writevertex(tilex, tilez, dx + sizex, dy, dz + sizez, color);
        let v110 = writevertex(tilex, tilez, dx, dy + sizey, dz + sizez, color);
        let v111 = writevertex(tilex, tilez, dx + sizex, dy + sizey, dz + sizez, color);
        //front
        index.push(v000, v011, v001);
        index.push(v000, v010, v011);
        //right
        index.push(v001, v111, v101);
        index.push(v001, v011, v111);
        //left
        index.push(v000, v110, v010);
        index.push(v000, v100, v110);
        //top
        index.push(v010, v111, v011);
        index.push(v010, v110, v111);
        //bottom
        index.push(v000, v101, v100);
        index.push(v000, v001, v101);
        //back
        index.push(v100, v111, v110);
        index.push(v100, v101, v111);
    }
    let getcollision = (n: number, index: number) => {
        return Math.floor(n / (3 ** index)) % 3;
    }
    for (let z = 0; z < chunksize; z++) {
        for (let x = 0; x < chunksize; x++) {
            let tileindex = (z * chunksize + x) * 5;
            let collision = file[tileindex + 4];
            let center = getcollision(collision, 0);
            if (tallonly ? center == 2 : center != 0) {
                let height = (center == 2 ? 1.6 : 0.3);
                writebox(x, z, 0.05, 0, 0.05, 0.9, height, 0.9, [80, 50, 50, 255]);
            }
            for (let dir = 0; dir < 4; dir++) {
                let side = getcollision(collision, 1 + dir);
                if (tallonly ? side == 2 : side != 0) {
                    let height = (side == 2 ? 1.8 : 0.5);
                    let vertcol = [190, 40, 40, 255];
                    if (dir == 0) { writebox(x, z, 0, 0, 0, 0.15, height, 1, vertcol); }
                    if (dir == 1) { writebox(x, z, 0, 0, 0.85, 1, height, 0.15, vertcol); }
                    if (dir == 2) { writebox(x, z, 0.85, 0, 0, 0.15, height, 1, vertcol); }
                    if (dir == 3) { writebox(x, z, 0, 0, 0, 1, height, 0.15, vertcol); }
                }
                let corner = getcollision(collision, 5 + dir);
                if (tallonly ? corner == 2 : corner != 0) {
                    let height = (corner == 2 ? 1.8 : 0.5);
                    let vertcol = [190, 40, 40, 255];
                    if (dir == 0) { writebox(x, z, 0, 0, 0.85, 0.15, height, 0.15, vertcol); }
                    if (dir == 1) { writebox(x, z, 0.85, 0, 0.85, 0.15, height, 0.15, vertcol); }
                    if (dir == 2) { writebox(x, z, 0.85, 0, 0, 0.15, height, 0.15, vertcol); }
                    if (dir == 3) { writebox(x, z, 0, 0, 0, 0.15, height, 0.15, vertcol); }
                }
            }
        }
    }
    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(color).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    }
}

function loadWalkmeshBlocking(file: Uint16Array) {
    let pos: number[] = [];
    let color: number[] = [];
    let index: number[] = [];
    const rootx = -chunksize / 2 * tilesize;
    const rootz = -chunksize / 2 * tilesize;
    const heightscaling = tilesize / 32;

    let vertexindex = 0;
    let writevertex = (tilex: number, tilez: number, subx: number, subz: number, dy: number, vertcol: number[], rotation: number) => {
        if (rotation % 2 == 1) {
            [subx, subz] = [-subz, subx];
        }
        if (rotation >= 2) {
            subx = -subx;
            subz = -subz;
        }

        let dx = 0.5 + subx;
        let dz = 0.5 + subz;
        dy += 1 / 32;

        const tileindex = (tilex + tilez * chunksize) * 5;
        const y00 = file[tileindex + 0] * heightscaling * (1 - dx) * (1 - dz);
        const y01 = file[tileindex + 1] * heightscaling * dx * (1 - dz);
        const y10 = file[tileindex + 2] * heightscaling * (1 - dx) * dz;
        const y11 = file[tileindex + 3] * heightscaling * dx * dz;
        pos.push(
            (tilex + dx) * tilesize + rootx,
            y00 + y01 + y10 + y11 + dy * tilesize,
            (tilez + dz) * tilesize + rootz
        );
        color.push(...vertcol);
        return vertexindex++;
    }

    let writeline = (x: number, z: number, size: number, color: number[], leftcut: boolean, rightcut: boolean, dir: number) => {
        let left = (leftcut ? -diagcut : -0.5);
        let right = (rightcut ? diagcut : 0.5);
        let v0 = writevertex(x, z, left, -0.5, 0, color, dir);
        let v1 = writevertex(x, z, right, -0.5, 0, color, dir);
        let v2 = writevertex(x, z, right - size, -0.5 + size, 0, color, dir);
        let v3 = writevertex(x, z, left + size, -0.5 + size, 0, color, dir);
        index.push(v0, v2, v1);
        index.push(v0, v3, v2);
    }
    let writediag = (x: number, z: number, size: number, color: number[], dir: number) => {
        // rotation=0 => southeast
        let v0 = writevertex(x, z, diagcut, -0.5, 0, color, dir);
        let v1 = writevertex(x, z, 0.5, -diagcut, 0, color, dir);
        let v2 = writevertex(x, z, 0.5 - size, -diagcut + size, 0, color, dir);
        let v3 = writevertex(x, z, diagcut - size, -0.5 + size, 0, color, dir);
        index.push(v0, v2, v1);
        index.push(v0, v3, v2);
    }

    let getcollision = (n: number, index: number) => {
        return Math.floor(n / (3 ** index)) % 3;
    }
    let findcollision = (x: number, z: number, index: number) => {
        if (x < 0 || z < 0 || x >= chunksize || z >= chunksize) { return 0; }
        let tileindex = (x + z * chunksize) * 5;
        let flags = file[tileindex + 4];
        return getcollision(flags, index);
    }
    let diagcut = 0.2;
    let wallcol = [60, 20, 20, 255];
    let wallsize = 0.06;
    let bordercol = [0, 0, 0, 255];
    let bordersize = 0.012;
    for (let z = 0; z < chunksize; z++) {
        for (let x = 0; x < chunksize; x++) {
            let center = findcollision(x, z, 0);
            if (center != 0) { continue; }

            let west = findcollision(x, z, 1) != 0 || findcollision(x - 1, z, 0) != 0 || findcollision(x - 1, z, 3) != 0;
            let south = findcollision(x, z, 4) != 0 || findcollision(x, z - 1, 0) != 0 || findcollision(x, z - 1, 2) != 0;
            let east = findcollision(x, z, 3) != 0 || findcollision(x + 1, z, 0) != 0 || findcollision(x + 1, z, 1) != 0;
            let north = findcollision(x, z, 2) != 0 || findcollision(x, z + 1, 0) != 0 || findcollision(x, z + 1, 4) != 0;

            let sw = south && west;
            let se = south && east;
            let nw = north && west;
            let ne = north && east;

            if (se) { writediag(x, z, wallsize, wallcol, 0); }
            if (ne) { writediag(x, z, wallsize, wallcol, 1); }
            if (nw) { writediag(x, z, wallsize, wallcol, 2); }
            if (sw) { writediag(x, z, wallsize, wallcol, 3); }

            writeline(x, z, (south ? wallsize : bordersize), (south ? wallcol : bordercol), sw, se, 0);
            writeline(x, z, (east ? wallsize : bordersize), (east ? wallcol : bordercol), se, ne, 1);
            writeline(x, z, (north ? wallsize : bordersize), (north ? wallcol : bordercol), ne, nw, 2);
            writeline(x, z, (west ? wallsize : bordersize), (west ? wallcol : bordercol), nw, sw, 3);
        }
    }

    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(color).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    }
}

let wrongprogmask = 1 << 5;
let knownchunkmask = 1 << 5;

type OverlaySettings = {
    collision: boolean,
    grid: boolean
}

class FloorOverlayChunk {
    chunkx: number;
    chunkz: number;
    chunklevel: number;

    stopped = false;
    loaded = false;
    failed = false;

    targetVertexObject: number;
    ready: Promise<void>;
    overlayhandles: patchrs.GlOverlay[] = [];
    lastMatched = 0;
    settings: OverlaySettings;

    async load() {
        let endpoint = "https://runeapps.org/maps/mapheightrender/";
        let res = await fetch(`${endpoint}height-${this.chunklevel}/${this.chunkx}-${this.chunkz}.bin.gz`);
        if (!res.ok) {
            this.failed = true;
            this.loaded = true;
            return;
        }
        // needed for alternative endpoints that don't properly set content-encoding header
        // let decompressedres = new Response(res.body!.pipeThrough(new DecompressionStream("gzip")));
        let decompressedres = res;
        let data = new Uint16Array(await decompressedres.arrayBuffer());

        if (this.settings.collision) {
            let mesh = mapsquareCollisionMesh(data);
            let vertex = patchrs.native.createVertexArray(mesh.index, [
                { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
                { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 3 },
            ]);
            let { program, uniforms, uniformsources } = floorOverlayProgram();
            uniforms.mappings.uModelMatrix.write(positionMatrix((this.chunkx + 0.5) * tilesize * chunksize, tilesize / 32, (this.chunkz + 0.5) * tilesize * chunksize));

            this.overlayhandles.push(patchrs.native.beginOverlay({ skipProgramMask: wrongprogmask, vertexObjectId: this.targetVertexObject }, program, vertex, {
                uniformSources: uniformsources,
                uniformBuffer: uniforms.buffer
            }));
        }
        if (this.settings.grid) {
            let mesh = loadWalkmeshBlocking(data);
            let vertex = patchrs.native.createVertexArray(mesh.index, [
                { location: 0, buffer: mesh.pos, enabled: true, normalized: false, offset: 0, scalartype: GL_FLOAT, stride: 3 * 4, vectorlength: 3 },
                { location: 6, buffer: mesh.color, enabled: true, normalized: true, offset: 0, scalartype: GL_UNSIGNED_BYTE, stride: 4, vectorlength: 3 },
            ]);
            let { program, uniforms, uniformsources } = floorOverlayProgram();
            uniforms.mappings.uModelMatrix.write(positionMatrix((this.chunkx + 0.5) * tilesize * chunksize, tilesize / 32, (this.chunkz + 0.5) * tilesize * chunksize));

            this.overlayhandles.push(patchrs.native.beginOverlay({ skipProgramMask: wrongprogmask, vertexObjectId: this.targetVertexObject }, program, vertex, {
                uniformSources: uniformsources,
                uniformBuffer: uniforms.buffer
            }));
        }
        console.log("loaded", this.chunkx, this.chunkz);
        this.loaded = true;
        if (this.stopped) {
            this.stop();
        }
    }

    stop() {
        this.stopped = true;
        this.overlayhandles.forEach(q => q.stop());
        console.log("stopping", this.chunkx, this.chunkz);
    }

    constructor(render: patchrs.RenderInvocation, settings: OverlaySettings) {
        let uniform = getUniformValue(render.uniformState, render.program.uniforms.find(q => q.name == "uModelMatrix")!);
        this.chunkx = Math.floor(uniform[0][12] / chunksize / tilesize);
        this.chunkz = Math.floor(uniform[0][14] / chunksize / tilesize);
        console.log("loading", this.chunkx, this.chunkz);
        this.chunklevel = 0;
        this.targetVertexObject = render.vertexObjectId;
        this.settings = settings;
        this.load();
    }

}

export function floorTracker(settings: OverlaySettings) {
    let knownProgs = new WeakMap<patchrs.GlProgram, {}>();
    let chunks = new Map<number, FloorOverlayChunk>();
    let stopped = false;

    let stream = patchrs.native.streamRenderCalls({
        features: ["uniforms"],
        framecooldown: 2000,
        skipProgramMask: wrongprogmask,
        skipVerticesMask: knownchunkmask
    }, renders => {
        if (stopped) { return; }
        console.log("floortrack", renders.length);
        for (let render of renders) {
            if (!knownProgs.has(render.program)) {
                if (render.program.inputs.find(q => q.name == "aMaterialSettingsSlotXY3")) {
                    knownProgs.set(render.program, {});
                } else {
                    render.program.skipmask |= wrongprogmask;
                    continue;
                }
            }
            let chunk = getOrInsert(chunks, render.vertexObjectId, () => new FloorOverlayChunk(render, settings));
            chunk.lastMatched = Date.now();
        }

        let deadline = Date.now() - 60 * 1000;

        for (let [vao, chunk] of chunks) {
            if (chunk.lastMatched < deadline) {
                chunk.stop();
                chunks.delete(vao);
            }
        }
    });


    let close = () => {
        stopped = true;
        stream.close();
        chunks.values().forEach(q => q.stop());
    }

    return { stream, close };
}
globalThis.floorTracker = floorTracker;

function floorOverlayProgram() {
    let uniforms = new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4",
        uAmbientColour: "vec3",
        uInvSunDirection: "vec3",
        uSunColour: "vec3",
        uMouse: "vec2"
    });
    let uniformsources: patchrs.OverlayUniformSource[] = [
        { type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix" },
        { type: "program", name: "uAmbientColour", sourceName: "uAmbientColour" },
        { type: "program", name: "uInvSunDirection", sourceName: "uInvSunDirection" },
        { type: "program", name: "uSunColour", sourceName: "uSunColour" },
        { type: "builtin", name: "uMouse", sourceName: "mouse" }
    ];
    let program = patchrs.native.createProgram(vertshadermouse, fragshaderflatnormals, [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
        { location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 3 }
    ], uniforms.args);
    return { uniforms, program, uniformsources };
}
