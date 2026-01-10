

import * as patchrs from "../util/patchrs_napi";
import "./tilemarkers";


export const vertshader = `
    #version 330 core
    layout (location = 0) in vec3 aPos;
    layout (location = 6) in vec3 aColor;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    out vec3 ourColor;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        gl_Position = uViewProjMatrix * worldpos;
        ourColor = aColor;
    }`;

export const fragshader = `
    #version 330 core
    in vec3 ourColor;
    out vec4 FragColor;
    void main() {
        FragColor = vec4(ourColor, 1.0);
    }`;

export const GL_BOOL = 0x8b56;
export const GL_INT = 0x1404;
export const GL_FLOAT = 0x1406;
export const GL_FLOAT_VEC2 = 0x8B50;
export const GL_FLOAT_VEC3 = 0x8B51;
export const GL_FLOAT_VEC4 = 0x8B52;
export const GL_FLOAT_MAT4 = 0x8B5C;
export const GL_UNSIGNED_BYTE = 0x1401;
export const GL_SAMPLER_1D = 0x8B5D;
export const GL_SAMPLER_2D = 0x8B5E;
export const GL_SAMPLER_3D = 0x8B5F;

export const GL_READ_ONLY = 0x88B8;
export const GL_WRITE_ONLY = 0x88B9;
export const GL_READ_WRITE = 0x88BA;


export const uniformTypes = {
    bool: { type: GL_BOOL, len: 1, size: 4, int: true },
    int: { type: GL_INT, len: 1, size: 4, int: true },
    float: { type: GL_FLOAT, len: 1, size: 4, int: false },
    vec2: { type: GL_FLOAT_VEC2, len: 2, size: 4 * 2, int: false },
    vec3: { type: GL_FLOAT_VEC3, len: 3, size: 4 * 3, int: false },
    vec4: { type: GL_FLOAT_VEC4, len: 4, size: 4 * 4, int: false },
    mat4: { type: GL_FLOAT_MAT4, len: 16, size: 4 * 16, int: false },
    sampler1d: { type: GL_SAMPLER_1D, len: 1, size: 4, int: true },
    sampler2d: { type: GL_SAMPLER_2D, len: 1, size: 4, int: true },
    sampler3d: { type: GL_SAMPLER_3D, len: 1, size: 4, int: true },
}

export async function findFloorRender() {
    let renders = await patchrs.native.recordRenderCalls();
    for (let render of renders) {
        if (render.program.inputs.find(q => q.name == "aMaterialSettingsSlotXY3")) {
            return render;
        }
    }
    return null;
}

export function positionMatrix(x: number, y: number, z: number) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}

export class UniformSnapshotBuilder<T extends { [name: string]: keyof typeof uniformTypes }> {
    args: patchrs.GlUniformArgument[];
    mappings: { [name in keyof T]: { write: (v: number[]) => void, read: () => number[] } };
    view: DataView;
    buffer: Uint8Array;

    constructor(init: T) {
        this.args = [];
        this.mappings = {} as any;
        let offset = 0;
        for (let [name, type] of Object.entries(init)) {
            let t = uniformTypes[type];
            if (!t) { throw new Error("unknown uniform type " + type); }
            let entry: patchrs.GlUniformArgument = { name, length: 1, type: t.type, snapshotOffset: offset, snapshotSize: t.size };
            this.args.push(entry);
            this.mappings[name as keyof T] = {
                write: (v: number[]) => {
                    if (v.length != t.len) { throw new Error("mismatch uniform length"); }
                    if (t.int) {
                        for (let i = 0; i < t.len; i++) {
                            this.view.setInt32(entry.snapshotOffset + i * 4, v[i], true);
                        }
                    } else {
                        for (let i = 0; i < t.len; i++) {
                            this.view.setFloat32(entry.snapshotOffset + i * 4, v[i], true);
                        }
                    }
                },
                read: () => {
                    let out: number[] = [];
                    if (t.int) {
                        for (let i = 0; i < t.len; i++) {
                            out.push(this.view.getInt32(entry.snapshotOffset + i * 4, true));
                        }
                    } else {
                        for (let i = 0; i < t.len; i++) {
                            out.push(this.view.getFloat32(entry.snapshotOffset + i * 4, true));
                        }
                    }
                    return out;
                }
            }
            offset += t.size;
        }
        let data = new ArrayBuffer(offset)
        this.view = new DataView(data);
        this.buffer = new Uint8Array(data);
    }
}

export async function test4() {
    let floor = await findFloorRender();
    if (!floor) {
        console.log("floor program not found");
        return;
    }

    let prog = patchrs.native.createProgram(vertshader, fragshader, [
        { location: 0, name: "aPos", type: GL_FLOAT, length: 3 },
        { location: 6, name: "aColor", type: GL_FLOAT, length: 3 }
    ], [
        { name: "uModelMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 0, snapshotSize: 4 * 16 },
        { name: "uViewProjMatrix", length: 1, type: GL_FLOAT_MAT4, snapshotOffset: 4 * 16, snapshotSize: 4 * 16 }
    ]);

    let indexbuffer = new Uint8Array(new Uint16Array([0, 1, 2, 1, 2, 3, 0, 2, 1, 1, 3, 2]).buffer);
    let y = -30;
    let x1 = -3000, x2 = 1000;
    let z1 = -2500, z2 = 1500;
    let vertexbuffer = new Uint8Array(new Float32Array([
        x1, y, z1, 1, 0, 0,
        x1, y, z2, 0, 0, 1,
        x2, y, z1, 0, 0, 1,
        x2, y, z2, 0, 1, 0
    ]).buffer);
    let vertex = patchrs.native.createVertexArray(indexbuffer, [
        { location: 0, buffer: vertexbuffer, enabled: true, normalized: false, offset: 0 * 4, stride: 6 * 4, scalartype: GL_FLOAT, vectorlength: 3 },
        { location: 6, buffer: vertexbuffer, enabled: true, normalized: false, offset: 3 * 4, stride: 6 * 4, scalartype: GL_FLOAT, vectorlength: 3 },
    ]);

    let overlay = patchrs.native.beginOverlay({ programId: floor.program.programId }, prog, vertex, {
        uniformSources: [
            { name: "uModelMatrix", sourceName: "uModelMatrix", type: "program" },
            { name: "uViewProjMatrix", sourceName: "uViewProjMatrix", type: "program" },
        ]
    });

    let stop = () => {
        overlay.stop();
    }

    return { stop, overlay };
}


globalThis.ov4 = test4;