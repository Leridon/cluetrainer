
import * as patchrs from "../../util/patchrs_napi";
import "../../util/halffloat";
import { AvaViewer } from "./ava";
import { buildVertexBuffer, VertexInput, Submodel, vartypeEnum, vartypes, vartypeNames, vartypeMeta, namedVartype, ModelAttribute } from "./avautils";
import { mat3, mat4 } from "gl-matrix";
import { saveModel, loadModel, checksum } from "./avafile";
import { Rect, encodeImageString } from "alt1";
import { GLTFBuilder } from "./gltf";
import * as GlTf from "./gltftype";
import * as path from "path";
import { delay, filedownload, fs } from "../../util/util";
import { decodeUniformBuffer, getProgramMeta, getRenderFunc, ProgramMeta, RenderFunc } from "../renderprogram";

type UniformAnim = ReturnType<typeof convertUniformAnim>;
type AnimationData = { subrenders: UniformAnim, original: RenderFunc }[];
type CaptureMode = "ava" | "ui3d" | "all" | "world" | "ui";

//don't use webgl api here as node doesn't have access to those
var webglConsts = {
    TRIANGLES: 4
}

type inputMetaJson = {
    length: number,
    location: number,
    name: string
};

function identity(size: number) {
    var r = Array(size * size).fill(0);
    for (var a = 0; a < size; a++) { r[a + a * size] = 1; }
    return r;
}

interface MaterialSet<T> {
    get(index: number): RenderMaterial<T> | undefined,
    getOrGenerate(index: number, gen: () => Promise<RenderMaterial>): Promise<RenderMaterial<T>>
    //getAttribute(i: number, vi: number): number
}

class TexturePacker {
    slots: { x: number, y: number, w: number, h: number }[];
    constructor(w: number, h: number) {
        this.slots = [{ x: 0, y: 0, w: w, h: h }];
    }
    findSpot(w: number, h: number) {
        this.slots = this.slots.sort((a, b) => a.w * a.h - b.w * b.h);
        //await render()
        for (let a = 0; a < this.slots.length; a++) {
            var slot = this.slots[a];
            var extraw = slot.w - w;
            var extrah = slot.h - h;
            if (extraw >= 0 && extrah >= 0) {
                this.slots.splice(a, 1);
                var horfirst = extraw > extrah;
                if (extraw != 0) {
                    this.slots.push({ x: slot.x + w, y: slot.y, w: slot.w - w, h: (horfirst ? slot.h : h) });
                }
                if (extrah != 0) {
                    this.slots.push({ x: slot.x, y: slot.y + h, w: (horfirst ? w : slot.w), h: slot.h - h });
                }
                return { x: slot.x, y: slot.y };
            }
        }
        return null;
    }
}

class TextureAtlasPacker implements MaterialSet<TextureSourceSubtex | TextureSourceConst> {
    texsize = 2048;
    pxsize = (1 << 16) / this.texsize;
    texture = new ImageData(this.texsize, this.texsize);
    opts = {
        keepConst: false
    };

    packer = new TexturePacker(this.texsize, this.texsize);
    materials = new Map<number, RenderMaterial<TextureSourceSubtex | TextureSourceConst>>();
    mappedTextures = new Set<{ source: TextureSource, mapped: TextureSourceSubtex | TextureSourceConst, material: RenderMaterial }>();

    constructor(keepConst?: boolean) {
        if (keepConst) { this.opts.keepConst = true; }
    }

    get(index: number) {
        return this.materials.get(index);
    }
    async getOrGenerate(index: number, gen: () => Promise<RenderMaterial>) {
        let cached = this.get(index);
        if (cached) { return cached; }
        let srcmat = await gen();
        let newmat: RenderMaterial<TextureSourceSubtex | TextureSourceConst> = {
            baseTex: null,
            emisiveTex: null,
            metalTex: null,
            normalsTex: null,
            roughnessTex: null,
            wrapX: srcmat.wrapX,
            wrapY: srcmat.wrapY,
            uvAnim: srcmat.uvAnim,
            usesTransparency: srcmat.usesTransparency
        };
        newmat.baseTex = this.insertTexture(srcmat.baseTex, newmat);
        newmat.emisiveTex = this.insertTexture(srcmat.emisiveTex, newmat);
        newmat.metalTex = this.insertTexture(srcmat.metalTex, newmat);
        newmat.normalsTex = this.insertTexture(srcmat.normalsTex, newmat);
        newmat.roughnessTex = this.insertTexture(srcmat.roughnessTex, newmat);
        this.materials.set(index, newmat);
        return newmat;
    }
    insertTexture(tex: TextureSource | null, mat: RenderMaterial) {
        if (!tex) { return null; }
        let size: number;
        let margin = 0;
        if (tex.type == "const") {
            if (this.opts.keepConst) {
                return { type: "const", color: tex.color } as TextureSourceConst;
            } else {
                size = 16;
            }
        }
        else if (tex.type == "imgdata") { size = tex.img.width; }
        else if (tex.type == "remote") { size = tex.subsize; margin = tex.bleedmargin; }
        else if (tex.type == "subtex") { size = tex.subsize; margin = tex.bleedmargin; }
        else { throw new Error("unknown texture type"); }
        let mapped = this.packer.findSpot(size + 2 * margin, size + 2 * margin);
        if (!mapped) { throw new Error("texture atlas is full"); }
        let r: TextureSourceSubtex = {
            type: "subtex",
            bleedmargin: margin,
            img: this.texture,
            subsize: size,
            subx: mapped.x + margin,
            suby: mapped.y + margin
        };
        this.mappedTextures.add({ source: tex, mapped: r, material: mat });
        return r;
    }
    bake(meshes: Mesh[]) {
        //var texcbs = nonnulltex.map(t => patchrs.captureSplitId(texid, t.subx, t.suby, t.subsize, t.subsize));
        for (var tex of this.mappedTextures) {
            if (tex.mapped.type == "subtex") {
                let source = tex.source;
                let margin = tex.mapped.bleedmargin;
                if (source.type == "remote") {
                    margin = source.bleedmargin;
                    source.tex.captureInto(this.texture, tex.mapped.subx - margin, tex.mapped.suby - margin, source.subx - margin, source.suby - margin, source.subsize + margin * 2, source.subsize + margin * 2)
                } else if (source.type == "subtex") {
                    margin = Math.min(source.bleedmargin, tex.mapped.bleedmargin);
                    source.img.copyTo(this.texture, source.subx - margin, source.suby - margin, source.subsize + 2 * margin, source.subsize + 2 * margin, tex.mapped.subx - margin, tex.mapped.suby - margin);
                } else if (source.type == "imgdata") {
                    source.img.copyTo(this.texture, 0, 0, source.img.width, source.img.height, tex.mapped.subx, tex.mapped.suby);
                } else if (source.type == "const") {
                    let right = tex.mapped.subx + tex.mapped.subsize + 2 * tex.mapped.bleedmargin;
                    let bottom = tex.mapped.suby + tex.mapped.subsize + 2 * tex.mapped.bleedmargin;
                    let [r, g, b, a] = source.color;
                    for (let y = tex.mapped.suby - tex.mapped.bleedmargin; y < bottom; y++) {
                        for (let x = tex.mapped.subx - tex.mapped.bleedmargin; x < right; x++) {
                            let i = x * 4 + y * 4 * this.texture.width;
                            this.texture.data[i + 0] = r;
                            this.texture.data[i + 1] = g;
                            this.texture.data[i + 2] = b;
                            this.texture.data[i + 3] = a;
                        }
                    }
                }
                else {
                    throw new Error("unexpected texture source");
                }
            }
        }
        //check if we are actually using alpha and bake an opaque image otherwise to avoid problems with pre-multiplied alphas
        for (let mat of this.materials.values()) {
            mat.usesTransparency = mat.usesTransparency && !!meshes.find(m => m.material == mat && !m.ignoreTexAlpha);
            if (!mat.usesTransparency && mat.baseTex?.type == "subtex") {
                let tex = mat.baseTex;
                let margin = tex.bleedmargin;
                for (var y = tex.suby - margin; y < tex.suby + tex.subsize + margin; y++) {
                    var yoffset = y * this.texture.width * 4;
                    for (var x = tex.subx - margin; x < tex.subx + tex.subsize + margin; x++) {
                        this.texture.data[yoffset + x * 4 + 3] = 255;
                    }
                }
            }
        }
    }
}

export class SimpleTexturePacker {
    allocx = 0;
    allocy = 0;
    alloch = 0;
    texture: ImageData;
    constructor(w: number, h: number) {
        this.texture = new ImageData(w, h);
    }
    insert(w: number, h: number) {
        //TODO deal with this better
        w = Math.min(w, 1024);
        h = Math.min(w, 1024);
        if (this.allocx + w > this.texture.width) {
            this.allocy += this.alloch;
            this.alloch = 0;
            this.allocx = 0;
        }
        if (this.allocy + h > this.texture.height) {
            throw "texture doesnt fit";//TODO
        }
        //console.log(`texalloc ${this.allocx} ${this.allocy} size:${w}`);
        var loc = { x: this.allocx, y: this.allocy };
        this.allocx += w;
        this.alloch = Math.max(this.alloch, h);
        return loc;
    }
}

// export async function captureAvatarModelFile() {
// 	var model = await captureAvatarModel();
// 	if (!model) { return null; }
// 	renderAvatarWebgl(model);
// 	return saveModel(model);
// }

export async function captureRenderCallsRaw(mode: CaptureMode, captopts: patchrs.RecordRenderOptions = {}) {
    //var json = patchrs.programInfo(-1, (mode == "ava" ? "avatar" : "all"))(5000)!;
    var json = await patchrs.native.recordRenderCalls(captopts);

    if (mode == "ui3d") {
        var firstindex = json.findIndex((r, i) => i != 0 && getProgramMeta(r.program).isUi);
        if (firstindex == -1) { json = []; }
        else { json = json.slice(firstindex).filter(r => !getProgramMeta(r.program).isUi); }
    } else if (mode == "world") {
        var firstindex = json.findIndex((r, i) => i != 0 && getProgramMeta(r.program).isUi);
        if (firstindex == -1) { json = []; }
        else { json = json.slice(0, firstindex); }
    } else if (mode == "ui") {
        json = json.filter(q => getProgramMeta(q.program).isUi);
    }
    return json;
}

// export async function captureAvatarModel(mode: CaptureMode = "ava") {
// 	var renderfuncs = convertCallsToRenderfuncs(await captureRenderCallsRaw(mode));
// 	return convertRendersToModel(renderfuncs.filter(q => q.progmeta.isMesh));
// }

export function convertCallsToRenderfuncs(calls: patchrs.RenderInvocation[]) {
    // return calls.map(j => {
    // 	try { return getRenderFunc(j); }
    // 	catch (e) { console.warn("error in getrenderfnc " + e); return null; }
    // }) as (RenderFunc | null)[];
    return calls.map(j => getRenderFunc(j));
}

class SeperatedMaterialPacker implements MaterialSet<TextureSourceImgdata | TextureSourceConst> {
    materials = new Map<number, RenderMaterial<TextureSourceImgdata | TextureSourceConst>>();
    mappedTextures = new Set<{ source: TextureSource, mapped: TextureSourceImgdata, material: RenderMaterial }>();
    insertTexture(tex: TextureSource | null, mat: RenderMaterial) {
        if (!tex) { return null; }
        // for (let mapping of this.mappedTextures.values()) {
        // 	if (compareTextures(mapping.source, tex)) {
        // 		return mapping.mapped;
        // 	}
        // }
        if (tex.type == "const") {
            return { type: "const", color: [...tex.color] } as TextureSourceConst;
        }
        else {
            let img: ImageData;
            if (tex.type == "remote") {
                img = tex.tex.capture(tex.subx, tex.suby, tex.subsize, tex.subsize);
            } else if (tex.type == "imgdata") {
                img = tex.img.clone(new Rect(0, 0, tex.img.width, tex.img.height));
            } else if (tex.type == "subtex") {
                img = tex.img.clone(new Rect(tex.subx, tex.suby, tex.subsize, tex.subsize));
            } else {
                throw new Error("unknown type");
            }
            let r: TextureSourceImgdata = {
                type: "imgdata",
                img: img
            };
            this.mappedTextures.add({ source: tex, mapped: r, material: mat });
            return r;
        }
    }
    async getOrGenerate(index: number, gen: () => Promise<RenderMaterial>) {
        let cached = this.get(index);
        if (cached) { return cached; }

        let srcmat = await gen();
        let newmat: RenderMaterial<TextureSourceImgdata | TextureSourceConst> = {
            baseTex: null,
            emisiveTex: null,
            metalTex: null,
            normalsTex: null,
            roughnessTex: null,
            wrapX: srcmat.wrapX,
            wrapY: srcmat.wrapY,
            uvAnim: srcmat.uvAnim,
            usesTransparency: srcmat.usesTransparency
        };
        newmat.baseTex = this.insertTexture(srcmat.baseTex, newmat);
        newmat.emisiveTex = this.insertTexture(srcmat.emisiveTex, newmat);
        newmat.metalTex = this.insertTexture(srcmat.metalTex, newmat);
        newmat.normalsTex = this.insertTexture(srcmat.normalsTex, newmat);
        newmat.roughnessTex = this.insertTexture(srcmat.roughnessTex, newmat);
        this.materials.set(index, newmat);
        return newmat;
    }
    get(index: number) {
        return this.materials.get(index);
    }
    bake(meshes: Mesh[]) {
        //check if we are actually using alpha and bake an opaque image otherwise to avoid problems with pre-multiplied alphas
        for (let mat of this.materials.values()) {
            mat.usesTransparency = mat.usesTransparency && !!meshes.find(m => m.material == mat && !m.ignoreTexAlpha);
            if (!mat.usesTransparency && mat.baseTex?.type == "imgdata") {
                for (let a = 0; a < mat.baseTex.img.data.length; a += 4) {
                    mat.baseTex.img.data[a + 3] = 255;
                }
            }
        }
    }
}

function meshAggrigator() {
    let all: Mesh[] = [];

    let posmeshes = new Map<number[], Mesh[]>();
    let posreverse = new Map<Mesh, number[]>();

    let matmeshes = new Map<RenderMaterial, Mesh[]>();
    let matreverse = new Map<Mesh, RenderMaterial>();

    let addmesh = (mesh: Mesh) => {
        let offsetname = mesh.originalRenderfunc.progmeta.uModelMatrix;
        var offsetuniform = offsetname && mesh.originalRenderfunc.uniforms[offsetname.name];
        var offset = (offsetuniform ? offsetuniform[0] : identity(4));
        let posmatch: number[] | null = null;
        outer: for (let matrix of posmeshes.keys()) {
            for (let i in matrix) {
                if (matrix[i] != offset[i]) { continue outer; }
            }
            posmatch = matrix;
        }
        if (!posmatch) {
            posmatch = offset.slice();
            posmeshes.set(posmatch, []);
        }
        posmeshes.get(posmatch)!.push(mesh);
        posreverse.set(mesh, posmatch);

        if (!matmeshes.has(mesh.material)) {
            matmeshes.set(mesh.material, []);
        }
        matmeshes.get(mesh.material)!.push(mesh);
        matreverse.set(mesh, mesh.material);

        all.push(mesh);
    }

    return { addmesh, posmeshes, posreverse, matmeshes, matreverse, all };
}


function interpolateFrame(time: number, time1: number, bone1: BoneTransform, time2: number, bone2: BoneTransform) {
    let alpha = (time2 - time) / (time2 - time1);
    let r: BoneTransform = {
        rotate: [
            alpha * bone1.rotate[0] + (1 - alpha) * bone2.rotate[0],
            alpha * bone1.rotate[1] + (1 - alpha) * bone2.rotate[1],
            alpha * bone1.rotate[2] + (1 - alpha) * bone2.rotate[2],
            alpha * bone1.rotate[3] + (1 - alpha) * bone2.rotate[3],
        ],
        scale: [
            alpha * bone1.scale[0] + (1 - alpha) * bone2.scale[0],
            alpha * bone1.scale[1] + (1 - alpha) * bone2.scale[1],
            alpha * bone1.scale[2] + (1 - alpha) * bone2.scale[2],
        ],
        translate: [
            alpha * bone1.translate[0] + (1 - alpha) * bone2.translate[0],
            alpha * bone1.translate[1] + (1 - alpha) * bone2.translate[1],
            alpha * bone1.translate[2] + (1 - alpha) * bone2.translate[2],
        ]
    };
    return r;
}

function unflipBonetransforms(transforms: BoneTransform[]) {
    for (let a = 1; a < transforms.length; a++) {
        let prev = transforms[a - 1].rotate;
        let cur = transforms[a].rotate;

        let d = Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) + Math.abs(cur[2] - prev[2]) + Math.abs(cur[3] - prev[3]);
        let dinv = Math.abs(cur[0] + prev[0]) + Math.abs(cur[1] + prev[1]) + Math.abs(cur[2] + prev[2]) + Math.abs(cur[3] + prev[3]);

        if (dinv < d) {
            cur[0] = -cur[0];
            cur[1] = -cur[1];
            cur[2] = -cur[2];
            cur[3] = -cur[3];
        }
    }
}

function packGltfAnimation(model: GLTFBuilder, animinfo: Animation, bonesource: ReturnType<typeof boneSource>) {
    //collect all timestamps where we have datapoints
    var convertedframes = bonesource.convertAnimation(animinfo.renderfuncs);
    var allframes = new Map<number, number>();
    let numframes = Object.keys(convertedframes).length;
    convertedframes.forEach(s => {
        let lasttime = -1;
        for (let a = 0; a < s.times.length; a++) {
            let t = s.times[a];
            if (t == lasttime) { continue; }
            if (s.transforms[a].det! <= 0) { continue; }
            var n = allframes.has(t) ? allframes.get(t)! : 0;
            allframes.set(t, n + 1);
            lasttime = t;
        }
    });

    //filter entries where we don't have data for each call
    let lastframetime = 0;
    let animdata: BoneAnim[] = convertedframes.map(s => {
        let lasttime = -1;
        let newanim: BoneAnim = { times: [], transforms: [] };
        for (let a = 0; a < s.times.length; a++) {
            if (s.times[a] == lasttime) { continue; }
            lasttime = s.times[a];
            if (allframes.get(s.times[a]) == numframes) {
                newanim.times.push(s.times[a]);
                newanim.transforms.push(s.transforms[a]);
                lastframetime = Math.max(lastframetime, s.times[a]);
            }
        }
        return newanim;
    });

    //find out which keyframes we want
    let startpoint = 0;
    let endpoint = Infinity;
    let closecycle = false;
    if (animinfo.cuttype.mode == "cycle") {
        endpoint = animinfo.cuttype.duration;
        closecycle = true;
    }
    if (animinfo.cuttype.mode == "extract") {
        let cycle = findAnimCycle(animdata);
        endpoint = cycle.start + cycle.duration;
        startpoint = cycle.start;
        closecycle = true;
    }
    if (animinfo.cuttype.mode == "all") {
        endpoint = lastframetime;
    }
    if (startpoint == endpoint) {
        console.log("skipped 0 length animation");
        return;
    }

    let origininalanimdata = animdata.map(anim => ({ times: anim.times.slice(), transforms: anim.transforms.slice() }));
    //cut up the animation
    animdata.forEach(anim => {
        let firstframe = 0;
        for (; anim.times[firstframe] <= startpoint; firstframe++);
        let lastframe = anim.times.length - 1;
        for (; anim.times[lastframe] >= endpoint; lastframe--);
        anim.times = anim.times.slice(firstframe, lastframe + 1);
        anim.transforms = anim.transforms.slice(firstframe, lastframe + 1);
        unflipBonetransforms(anim.transforms);
        lastframe -= firstframe;
        firstframe = 0;
        //TODO also do interpolation for open cycles
        if (closecycle) {
            let startpose = anim.transforms[firstframe];
            if (anim.times[firstframe] > startpoint) {
                startpose = interpolateFrame(startpoint, anim.times[lastframe] - (endpoint - startpoint), anim.transforms[lastframe], anim.times[firstframe], anim.transforms[firstframe]);
                anim.transforms.unshift(startpose);
                anim.times.unshift(startpoint);
                lastframe++;
            }
            if (anim.times[lastframe] < endpoint) {
                anim.transforms.push(startpose);
                anim.times.push(endpoint);
                lastframe++;
            }
        }
        if (animinfo.resampletime) {
            var oldtimes = anim.times;
            var oldtransforms = anim.transforms;
            anim.times = [];
            anim.transforms = [];
            var lastindex = 0;
            var ended = false;
            for (let time = startpoint; !ended; time += animinfo.resampletime) {
                if (time >= endpoint) {
                    time = endpoint;
                    ended = true;
                }
                for (; lastindex < oldtimes.length && oldtimes[lastindex] <= time; lastindex++);
                if (lastindex >= oldtimes.length) { lastindex = oldtimes.length - 1; }
                anim.times.push(time);
                anim.transforms.push(interpolateFrame(time, oldtimes[lastindex - 1], oldtransforms[lastindex - 1], oldtimes[lastindex], oldtransforms[lastindex]));
            }
        }
        for (let a in anim.times) {
            anim.times[a] -= startpoint;
        }
    });

    let debugdownload = () => {
        let matlabdata: number[][][] = [];
        for (let subindex in origininalanimdata) {
            let subanim = origininalanimdata[subindex];
            let subdata: number[][] = [];
            for (let a = 0; a < subanim.times.length; a++) {
                let row = [subanim.times[a], ...subanim.transforms[a].rotate, ...subanim.transforms[a].scale, ...subanim.transforms[a].translate];
                let packedbones = subanim.transforms[a].packedbones!;
                let boneindex = subanim.transforms[a].boneindex!;
                row.push(...packedbones[boneindex + 0], ...packedbones[boneindex + 1], ...packedbones[boneindex + 2]);
                subdata.push(row);
            }
            matlabdata.push(subdata);
        }
        let blob = new Blob([JSON.stringify(matlabdata)], { type: "application/json" });
        filedownload("anim.json", URL.createObjectURL(blob));
    }
    if (typeof window != "undefined") {
        (window as any).lastanimdebug = debugdownload;
    }
    let totalsize = animdata.reduce((a, c) => a + c.times.length * 11, 0);
    let writeindex = 0;
    let buffer = new Float32Array(totalsize);
    let animobj: GlTf.Animation = { samplers: [], channels: [], name: animinfo.name };
    model.addAnimation(animobj);
    let view = model.addBufferWithView(buffer, undefined, undefined);
    for (let boneindex in animdata) {
        let bone = animdata[boneindex];
        let timeoffset = writeindex * buffer.BYTES_PER_ELEMENT;
        for (let i = 0; i < bone.times.length; i++) {
            buffer[writeindex++] = bone.times[i] / 1000;
        }
        let translateoffset = writeindex * buffer.BYTES_PER_ELEMENT;
        for (let i = 0; i < bone.times.length; i++) {
            buffer[writeindex++] = bone.transforms[i].translate[0];
            buffer[writeindex++] = bone.transforms[i].translate[1];
            buffer[writeindex++] = bone.transforms[i].translate[2];
        }
        let scaleoffset = writeindex * buffer.BYTES_PER_ELEMENT;
        for (let i = 0; i < bone.times.length; i++) {
            buffer[writeindex++] = bone.transforms[i].scale[0];
            buffer[writeindex++] = bone.transforms[i].scale[1];
            buffer[writeindex++] = bone.transforms[i].scale[2];
        }
        let rotateoffset = writeindex * buffer.BYTES_PER_ELEMENT;
        for (let i = 0; i < bone.times.length; i++) {
            buffer[writeindex++] = bone.transforms[i].rotate[0];
            buffer[writeindex++] = bone.transforms[i].rotate[1];
            buffer[writeindex++] = bone.transforms[i].rotate[2];
            buffer[writeindex++] = bone.transforms[i].rotate[3];
        }
        let smapleindex = animobj.samplers.length;
        let timeaccessor = model.addAccessor({
            min: [0],
            max: [bone.times[bone.times.length - 1] / 1000],
            bufferView: view,
            byteOffset: timeoffset,
            count: bone.times.length,
            type: "SCALAR",
            componentType: namedVartype("f32").id
        });
        animobj.samplers.push(
            { input: timeaccessor, output: model.addAccessor({ bufferView: view, byteOffset: translateoffset, count: bone.times.length, type: "VEC3", componentType: namedVartype("f32").id }) },
            { input: timeaccessor, output: model.addAccessor({ bufferView: view, byteOffset: scaleoffset, count: bone.times.length, type: "VEC3", componentType: namedVartype("f32").id }) },
            { input: timeaccessor, output: model.addAccessor({ bufferView: view, byteOffset: rotateoffset, count: bone.times.length, type: "VEC4", componentType: namedVartype("f32").id }) }
        );
        animobj.channels.push(
            { sampler: smapleindex + 0, target: { path: "translation", node: +boneindex } },
            { sampler: smapleindex + 1, target: { path: "scale", node: +boneindex } },
            { sampler: smapleindex + 2, target: { path: "rotation", node: +boneindex } }
        );
    }
}
type Animation = {
    name: string,
    renderfuncs: AnimationData,
    resampletime?: number,
    cuttype: { mode: "all" } | { mode: "cycle", duration: number } | { mode: "extract" }
};


export async function convertRendersToGLTF(renderfuncs: RenderFunc[], getanimations?: (fn: RenderFunc[]) => Promise<Animation[]>) {
    const useAtlas = false;
    var model = new GLTFBuilder();
    var packer = (useAtlas ? new TextureAtlasPacker(true) : new SeperatedMaterialPacker());
    let meshcache = meshAggrigator();


    //split up the render into meshes/materials
    var texsource = materialSource(packer, m => m.anyOpaque && meshcache.addmesh(m));
    var meshrenderfuncs = renderfuncs.filter(q => q.progmeta.isLighted);
    for (let fn of meshrenderfuncs) { await texsource(fn); }
    packer.bake(meshcache.all);

    //materials
    let wrapmap: { [id in TexWrapMode]: number } = {
        clamp: 0x812f,
        mirror: 0x8370,
        repeat: 0x2901
    }
    let gltfmatmap = new Map<RenderMaterial, number>();
    for (let mat of meshcache.matmeshes.keys()) {
        let sampler = model.addSampler({ wrapS: wrapmap[mat.wrapX], wrapT: wrapmap[mat.wrapY] });
        let tex: any = undefined;
        if (mat.baseTex?.type == "imgdata") {
            tex = {
                index: model.addImageWithTexture(mat.baseTex.img, sampler)
            };
        }
        if (mat.baseTex?.type == "subtex") {
            model.addExtension("KHR_texture_transform", true);
            tex = {
                index: model.addImageWithTexture(mat.baseTex.img, sampler),
                extensions: {
                    KHR_texture_transform: {
                        offset: [mat.baseTex.subx / mat.baseTex.img.width, mat.baseTex.suby / mat.baseTex.img.height],
                        rotation: 0,
                        scale: [mat.baseTex.subsize / mat.baseTex.img.width, mat.baseTex.subsize / mat.baseTex.img.height],
                        texCoord: 0
                    }
                }
            };
        }
        if (mat.uvAnim) { model.addExtension("RA_materials_uvanim", false); }
        let matid = model.addMaterial({
            pbrMetallicRoughness: {
                baseColorTexture: tex
            },
            alphaMode: (mat.usesTransparency ? "BLEND" : "OPAQUE"),
            extensions: (mat.uvAnim ? { RA_materials_uvanim: { uvAnim: mat.uvAnim } } : undefined)
        });
        gltfmatmap.set(mat, matid);
    }

    let avgtranslate = [0, 0, 0];
    let ntranslate = 0;
    for (let matrix of meshcache.posmeshes.keys()) {
        avgtranslate[0] += matrix[12];
        avgtranslate[1] += matrix[13];
        avgtranslate[2] += matrix[14];
        ntranslate++;
    }
    if (ntranslate > 0) {
        avgtranslate[0] /= ntranslate;
        avgtranslate[1] /= ntranslate;
        avgtranslate[2] /= ntranslate;
    }


    let modelnodes: number[] = [];
    for (let position of meshcache.posmeshes.keys()) {
        let primitives: GlTf.MeshPrimitive[] = [];
        let meshes = meshcache.posmeshes.get(position)!;


        //bones/pose
        var bonesource = boneSource();
        meshes.forEach(m => bonesource.addMesh(m));

        if (getanimations) {
            let animations = await getanimations(meshrenderfuncs);
            for (let anim of animations) {
                packGltfAnimation(model, anim, bonesource);
            }
        }

        for (let mesh of meshes) {
            //TODO add some options to merge calls with same render options and material

            var fields: VertexInput[] = [];

            var pos = convertJsonAttr("POSITION", "f32", 3);
            pos.sources.push({ indices: mesh.indices, getter: mesh.getters.pos });
            fields.push(pos);

            if (mesh.getters.texuv) {
                let texuv = convertJsonAttr("TEXCOORD_0", "f32", 2);
                texuv.sources.push({ indices: mesh.indices, getter: mesh.getters.texuv });
                fields.push(texuv);
            }
            if (mesh.getters.color) {
                let color = convertJsonAttr("COLOR_0", "u8", 4, true);
                color.sources.push({ indices: mesh.indices, getter: mesh.getters.color });
                fields.push(color);
            }
            if (mesh.getters.normals) {
                let normals = convertJsonAttr("NORMAL", "f32", 3);
                let normget = mesh.getters.normals;
                normals.sources.push({
                    indices: mesh.indices, getter: (i, vi) => {
                        let l = Math.sqrt(normget(i, 0) ** 2 + normget(i, 1) ** 2 + normget(i, 2) ** 2);
                        //getting empty normals in some cases for some reason, return something that doesn't error
                        if (l == 0) { return (vi == 0 ? 1 : 0); }
                        return normget(i, vi) / l;
                    }
                });
                fields.push(normals);
            }
            if (mesh.getters.bone) {
                let weights = convertJsonAttr("WEIGHTS_0", "u8", 4, true);
                let joints = convertJsonAttr("JOINTS_0", "u16", 4, false);
                weights.sources.push({ indices: mesh.indices, getter: (i, vi) => (vi == 0 ? 255 : 0) });
                joints.sources.push({ indices: mesh.indices, getter: mesh.getters.bone });
                fields.push(weights, joints);
            }

            var repacked = buildVertexBuffer(fields);

            let indexview = model.addBufferWithView(repacked.indices, undefined, true);
            let indexacc = model.addAccessor({
                componentType: namedVartype("u16").id,
                count: repacked.indices.length,
                type: "SCALAR",
                bufferView: indexview
            });

            let attributes: { [id: string]: number } = {};
            let attrview = model.addBufferWithView(repacked.buffer, repacked.stride, false);
            for (let attr of repacked.layout) {
                attributes[attr.name] = model.addAttributeAccessor(attr, attrview, repacked.vertexcount);
            }

            primitives.push({
                attributes: attributes,
                indices: indexacc,
                material: gltfmatmap.get(mesh.material),
            });
        }

        let bonetransforms = bonesource.getBaseTransforms();
        let joints: number[] = [];
        for (let transform of bonetransforms) {
            let node = { rotation: transform.rotate, scale: transform.scale, translation: transform.translate };
            joints.push(model.addNode(node));
        }
        let skin: GlTf.Skin = {
            joints: joints.slice(),
            skeleton: joints[bonesource.nullindex]
        };
        joints.splice(bonesource.nullindex, 1);
        let rootbonenode = model.json.nodes![skin.joints[bonesource.nullindex]];
        if (joints.length != 0) { rootbonenode.children = joints; }

        let skinnode = model.addNode({
            skin: model.addSkin(skin),
            mesh: model.addMesh({
                primitives: primitives,
            }),
            children: [skin.joints[0]]
        });

        let localpos = position.slice();
        localpos[12] -= avgtranslate[0];
        localpos[13] -= avgtranslate[1];
        localpos[14] -= avgtranslate[2];
        modelnodes.push(model.addNode({
            matrix: localpos,
            children: [skinnode]
        }));
    }

    //build the gltf
    let scale = 0.00225;
    model.addScene({
        nodes: [
            model.addNode({
                scale: [scale, scale, -scale],
                children: modelnodes
            })
        ]
    });
    const glb = true;
    let file = model.convert({ singlefile: true, glb: glb });
    let download = async () => {
        var blob = new Blob([(await file).mainfile as any], { type: (glb ? "model/gltf-binary" : "model/gltf+json") });
        var url = URL.createObjectURL(blob);
        filedownload((glb ? "runeapps_avatar.glb" : "runeapps_avatar.gltf"), url);
    }
    let save = async () => {
        let t = new Date();
        let timestamp = `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`.replace(/\W/g, "_");
        let target = path.resolve(`rundata/downloads/model_${timestamp}.${glb ? "glb" : "gltf"}`);
        await fs.writeFile(target, (await file).mainfile, "binary");
        return target;
    }
    return { file, download, save, meshcache };
}

export function convertRendersToMaterialModel(renderfuncs: RenderFunc[]) {
    if (renderfuncs.length == 0) {
        console.log("no models matched");
        return null;
    }
    let meshes = [] as Mesh<TextureSourceSubtex>[];
    var texAccumolator = new TextureAtlasPacker();
    var texsource = materialSource(texAccumolator, meshes.push.bind(meshes));
    var bonesource = boneSource();

    renderfuncs.forEach(q => texsource(q));
    meshes.forEach(m => bonesource.addMesh(m));

    typeof window != "undefined" && ((window as any).lasttexsource = texsource);

    let models: Submodel[] = [];
    for (let mesh of meshes) {
        var pos = convertJsonAttr("aVertexPosition", "i16", 4);
        var color = convertJsonAttr("aVertexColor", "u8", 4, true);
        var subtexinfo = convertJsonAttr("aSubTexInfo", "u16", 3, true);
        var texpos = convertJsonAttr("aTexSubUV", "f32", 2, true);
        var flags = convertJsonAttr("aVertexFlags", "u8", 1, true);
        var bones = convertJsonAttr("aBoneId", "u32", 1);
        const pixtouv = (1 << 16) / texAccumolator.texsize;

        let progflags = mesh.originalRenderfunc.progmeta.flags;
        var renderflags = 0;
        if (progflags.alpha) { renderflags |= 1; }
        if (progflags.texalpha) { renderflags |= 2; }
        if (progflags.vertexcolor) { renderflags |= 4; }

        var texgetter = mesh.getters.texuv || ((i: number, vi: number) => 0);
        var flagsgetter = (flags => () => flags)(renderflags);
        var basetexatlasGetter = (v => (i, vi) => v[vi])([mesh.material.baseTex!.subx * pixtouv, mesh.material.baseTex!.suby * pixtouv, mesh.material.baseTex!.subsize * pixtouv]);

        pos.sources.push({ indices: mesh.indices, getter: mesh.getters.pos });
        color.sources.push({ indices: mesh.indices, getter: mesh.getters.color! });
        subtexinfo.sources.push({ indices: mesh.indices, getter: basetexatlasGetter });
        texpos.sources.push({ indices: mesh.indices, getter: texgetter });
        flags.sources.push({ indices: mesh.indices, getter: flagsgetter });
        bones.sources.push({ indices: mesh.indices, getter: mesh.getters.bone! });
        //bones.sources.push({ indices: mesh.indices, getter: () => 0 });

        var vertexdata = buildVertexBuffer([pos, color, subtexinfo, texpos, bones, flags]);
        texAccumolator.bake(meshes);
        var model: Submodel = {
            drawmode: webglConsts.TRIANGLES,
            vertexData: vertexdata,
            modeltransform: mat4.create(),
            texture: texAccumolator.texture,
            boneuniform: bonesource.getMatrices(),
            boneKeyframes: [{ time: 0, offset: 0 }]
        };
        models.push(model);
    }

    return { models, meshes, texsource };
}

export async function roundTripmodelFile(model: Submodel) {
    var file = await saveModel(model);
    console.log(file.buffer.byteLength);
    return await loadModel(file.buffer);
}

export function debugmodels(models: Submodel[]) {
    document.querySelectorAll(".webglrender").forEach(e => e.remove());
    var view = new AvaViewer(window.innerWidth, window.innerHeight);
    view.toggles.animated = false;
    view.root.className = "webglrender";
    view.root.style.cssText = "position:absolute; top:0px; left:0px; z-index:1; background:#888;";
    document.body.appendChild(view.root);
    (window as any).view = view;
    //assemble our new texture atlas
    (window as any).tex = models[0].texture;
    //texpacker.texture.show(0, 0, 0.3);
    for (let m of models) {
        view.addModel(m);
    }
    return view;
}

type TextureSourceRemote = {
    type: "remote",
    tex: patchrs.TextureSnapshot,
    subx: number,
    suby: number,
    subsize: number,
    bleedmargin: number
}
type TextureSourceSubtex = {
    type: "subtex",
    img: ImageData,
    subx: number,
    suby: number,
    subsize: number,
    bleedmargin: number
}
type TextureSourceImgdata = {
    type: "imgdata",
    img: ImageData
}
type TextureSourceConst = {
    type: "const",
    color: [number, number, number, number]
}
type TextureSource = TextureSourceRemote | TextureSourceSubtex | TextureSourceImgdata | TextureSourceConst

type TexWrapMode = "repeat" | "mirror" | "clamp";

type RenderMaterial<TEX = TextureSource> = {
    baseTex: TEX | null,
    metalTex: TEX | null,
    roughnessTex: TEX | null,
    normalsTex: TEX | null,
    emisiveTex: TEX | null,
    wrapX: TexWrapMode,
    wrapY: TexWrapMode,
    uvAnim: [number, number] | null,
    //TODO implement this properly, currently set to true everywhere
    usesTransparency: boolean
}

type Mesh<TEX = TextureSource> = {
    material: RenderMaterial<TEX>,
    indices: Uint32Array,

    getters: {
        pos: (v: number, vi: number) => number,
        color?: (v: number, vi: number) => number,
        texuv?: (v: number, vi: number) => number,
        normals?: (v: number, vi: number) => number,
        bone?: (v: number, vi: number) => number
    },

    originalRenderfunc: RenderFunc,
    ignoreTexAlpha: boolean,
    anyOpaque: boolean
};


function compareTextures(a: TextureSource | null, b: TextureSource | null) {
    if (a == null && b == null) { return true; }
    if (a == null || b == null) { return false; }
    if (a.type == "const" && b.type == "const") { return a.color[0] == b.color[0] && a.color[1] == b.color[1] && a.color[2] == b.color[2] && a.color[3] == b.color[3]; }
    if (a.type == "subtex" && b.type == "subtex") { return a.img == b.img && a.subx == b.subx && a.subsize == b.subsize && a.bleedmargin == b.bleedmargin; }
    if (a.type == "imgdata" && b.type == "imgdata") { return a.img == b.img; }
    if (a.type == "remote" && b.type == "remote") { return a.tex == b.tex && a.subx == b.subx && a.subsize == b.subsize && a.bleedmargin == b.bleedmargin; }
    return false;
}

function compareMaterials(a: RenderMaterial, b: RenderMaterial) {
    if (!compareTextures(a.baseTex, b.baseTex)) { return false; }
    if (!compareTextures(a.metalTex, b.metalTex)) { return false; }
    if (!compareTextures(a.roughnessTex, b.roughnessTex)) { return false; }
    if (!compareTextures(a.normalsTex, b.normalsTex)) { return false; }
    if (!compareTextures(a.emisiveTex, b.emisiveTex)) { return false; }
    return true;
}

function getAttributeGetter(renderfunc: RenderFunc, attr: inputMetaJson | null | undefined) {
    if (!attr) { return undefined; }
    return renderfunc.getters[attr.name];
}

function materialSource<T extends MaterialSet<any>>(texpacker: T, meshcallback: (p: Mesh<T extends MaterialSet<infer Q> ? Q : any>) => any) {
    type MAT = T extends MaterialSet<infer Q> ? Q : any;
    const metatexsize = 128;
    const multiplier = 16;
    const metaslotwidth = 3;
    const metaslotheight = 4;
    const metacolsperrow = Math.floor(128 / metaslotwidth);
    const metatexcapacity = metacolsperrow * metacolsperrow;

    var emptyMaterial = () => {
        let r: RenderMaterial = {
            baseTex: { type: "const", color: [255, 255, 255, 255] },
            emisiveTex: null,
            metalTex: null,
            normalsTex: null,
            roughnessTex: null,
            wrapX: "repeat",
            wrapY: "repeat",
            uvAnim: null,
            usesTransparency: false
        };
        return r
    };

    var bytestofloat = (left: number, right: number) => {
        return (left * 256 + right - 32767) / 32767;
    }

    var getMaterial = (renderfunc: RenderFunc, texture: { atlas: patchrs.TextureSnapshot, atlasmeta: patchrs.TextureSnapshot }, idx: number, idy: number) => {
        //apparently we need a lot of time for this capture some times, not sure why
        var settingsatlas = texture.atlasmeta.capture(0, 0, metatexsize, metatexsize);
        let rt7material = renderfunc.progmeta.raw.fragmentShader.source.indexOf("SAMPLE_OFFSET_SLOT_SIZES_AND_WRAPPING") != -1;


        var pospixel = settingsatlas.getPixel(idx * metaslotwidth, idy * metaslotheight);
        var sizepixel = settingsatlas.getPixel(idx * metaslotwidth + (rt7material ? 2 : 1), idy * metaslotheight);
        let dx = pospixel[0] * multiplier;
        let dy = pospixel[1] * multiplier;
        let size = sizepixel[0] * multiplier;
        let wrapbyte = 12;//wrapxy default
        let uvanimpixel = [0, 0, 0, 0];
        if (rt7material) {
            var offsetpixel = settingsatlas.getPixel(idx * metaslotwidth + 1, idy * metaslotheight + 2);
            if (offsetpixel[3] & (1 << 0)) { dx += 256 * multiplier; }
            if (offsetpixel[3] & (1 << 1)) { dy += 256 * multiplier; }
            uvanimpixel = settingsatlas.getPixel(idx * metaslotwidth + 0, idy * metaslotheight + 1);
        } else {
            var offsetpixel = settingsatlas.getPixel(idx * metaslotwidth + 1, idy * metaslotheight + 0);
            if (offsetpixel[2] & (1 << 0)) { dx += 256 * multiplier; }
            if (offsetpixel[2] & (1 << 1)) { dy += 256 * multiplier; }
            wrapbyte = offsetpixel[3];
            uvanimpixel = settingsatlas.getPixel(idx * metaslotwidth + 2, idy * metaslotheight + 0);
        }
        let wrapxbyte = (wrapbyte & 5);
        let wrapybyte = ((wrapbyte >> 1) & 5);
        //0X0X clamp, 0X1X mirror, 1X0X wrap, 1X1X invalid/glitched combo
        let wrapx: TexWrapMode = wrapxbyte == 0 ? "mirror" : wrapxbyte == 1 ? "clamp" : "repeat";
        let wrapy: TexWrapMode = wrapybyte == 0 ? "mirror" : wrapybyte == 1 ? "clamp" : "repeat";

        let uvanimx = bytestofloat(uvanimpixel[0], uvanimpixel[1]);
        let uvanimy = bytestofloat(uvanimpixel[2], uvanimpixel[3]);
        let hasuvanim = Math.abs(uvanimx) + Math.abs(uvanimy) > 0.001;

        let r: RenderMaterial = {
            baseTex: { type: "remote", tex: texture.atlas, subx: dx, suby: dy, bleedmargin: 16, subsize: size },
            emisiveTex: null,
            metalTex: null,
            normalsTex: null,
            roughnessTex: null,
            wrapX: wrapx,
            wrapY: wrapy,
            uvAnim: (hasuvanim ? [uvanimx, uvanimy] : null),
            usesTransparency: renderfunc.progmeta.flags.alpha
        };

        return r;
    }

    var decodeCalls = async (renderfunc: RenderFunc) => {
        var propname = renderfunc.progmeta.aTexMetaLookup;
        var flagprop = renderfunc.progmeta.aVertexNormal_BatchFlags;
        var colorprop = renderfunc.progmeta.aColor;
        var texture = renderfunc.texture;

        let getters: Mesh["getters"] = {
            pos: getAttributeGetter(renderfunc, renderfunc.progmeta.aPos)!,
            texuv: getAttributeGetter(renderfunc, renderfunc.progmeta.aTexUV),
            color: getAttributeGetter(renderfunc, renderfunc.progmeta.aColor),
            normals: getAttributeGetter(renderfunc, renderfunc.progmeta.aVertexNormal_BatchFlags),
        };

        var hastexture = propname && texture;
        let texsettinggetter = hastexture && renderfunc.getters[propname!.name];
        let flagGetter = flagprop && renderfunc.getters[flagprop.name];
        let colorGetter = colorprop && renderfunc.getters[colorprop.name];
        let indices = renderfunc.indices;
        let texid = (hastexture ? texture!.atlas.texid : -1);


        let addrange = (mat: RenderMaterial<MAT>) => {
            if (i == prevRangeStart) { return; }
            meshcallback({
                indices: new Uint32Array(indices.buffer, indices.byteOffset + prevRangeStart * indices.BYTES_PER_ELEMENT, i - prevRangeStart),
                getters,
                originalRenderfunc: renderfunc,
                material: mat,
                ignoreTexAlpha: ignoreTexAlpha,
                anyOpaque: anyopaque
            });
            prevRangeStart = i;
            ignoreTexAlpha = true;
            anyopaque = false;
        }

        var prev: RenderMaterial<MAT> | undefined = undefined;
        var prevRangeStart = 0;
        var ignoreTexAlpha = true;
        var anyopaque = false;
        for (var i = 0; i < indices.length; i++) {
            let a = indices[i];
            var index = -1;
            if (hastexture) {
                var idx = texsettinggetter!(a, 0);
                var idy = texsettinggetter!(a, 1);
                var index = idx + metacolsperrow * idy + texid * metatexcapacity;
            }
            var material = texpacker.get(index);
            if (!material) {
                material = await texpacker.getOrGenerate(index, async () => (hastexture ? getMaterial(renderfunc, texture!, idx, idy) : emptyMaterial()));
            }

            if (prev != null && material != prev) {
                addrange(prev);
            }
            prev = material;
            if (flagGetter) {
                var flags = flagGetter(a, 3);
                if (!(flags & 0x04) && !(flags & 0x01)) {
                    ignoreTexAlpha = false;
                }
            }
            if (!anyopaque) {
                anyopaque = !colorGetter || colorGetter(a, 3) > 2;
            }
        }
        addrange(material!);
    }

    return decodeCalls;
}


function getPackedBoneTransform(packedbones: number[][], boneindex: number) {
    let baseindex = boneindex * 3;
    //translations
    let translate = [
        packedbones[baseindex + 2][1],
        packedbones[baseindex + 2][2],
        packedbones[baseindex + 2][3]
    ];
    //we are now left with a 3x3 matrix
    let m00 = packedbones[baseindex + 0][0], m01 = packedbones[baseindex + 0][3], m02 = packedbones[baseindex + 1][2];
    let m10 = packedbones[baseindex + 0][1], m11 = packedbones[baseindex + 1][0], m12 = packedbones[baseindex + 1][3];
    let m20 = packedbones[baseindex + 0][2], m21 = packedbones[baseindex + 1][1], m22 = packedbones[baseindex + 2][0];

    //scale
    let scale = [
        Math.sqrt(m00 ** 2 + m10 ** 2 + m20 ** 2),
        Math.sqrt(m01 ** 2 + m11 ** 2 + m21 ** 2),
        Math.sqrt(m02 ** 2 + m12 ** 2 + m22 ** 2)
    ];
    //we should now have a pure rotation matrix
    m00 /= scale[0]; m10 /= scale[0]; m20 /= scale[0];
    m01 /= scale[1]; m11 /= scale[1]; m21 /= scale[1];
    m02 /= scale[2]; m12 /= scale[2]; m22 /= scale[2];

    //m*m^T=q=I for pure rotation
    let q00 = m00 * m00 + m01 * m01 + m02 * m02, q01 = m00 * m10 + m01 * m11 + m02 * m12, q02 = m00 * m20 + m01 * m21 + m02 * m22;
    let q10 = m00 * m10 + m01 * m11 + m02 * m12, q11 = m10 * m10 + m11 * m11 + m12 * m12, q12 = m10 * m20 + m11 * m21 + m12 * m22;
    let q20 = m00 * m20 + m01 * m21 + m02 * m22, q21 = m10 * m20 + m11 * m21 + m12 * m22, q22 = m20 * m20 + m21 * m21 + m22 * m22;


    let det = m00 * (m11 * m22 - m12 * m21) - m01 * (m10 * m22 - m12 * m20) + m02 * (m10 * m21 - m11 * m20);
    let errdiag = Math.abs(q00 - 1) + Math.abs(q11 - 1) + Math.abs(q22 - 1);
    let errother = [q01, q02, q10, q12, q20, q21].reduce((s, v) => s + Math.abs(v), 0);

    let sumtrans = translate[0] + translate[1] + translate[2];

    if (Math.abs(det - 1) > 0.1) {
        console.log(boneindex, det);
    }
    if (sumtrans > 1000) {
        //console.log(sumtrans);
    }
    if (errdiag > 0.1 || errother > 0.1) {
        //console.log([[q00, q01, q02], [q10, q11, q12], [q20, q21, q22]]);
    }

    //quarternion rotation
    let qw = 1, qx = 0, qy = 0, qz = 0;
    //use unit quaternion when scaled to 0 in any direction
    if (scale[0] != 0 && scale[1] != 0 && scale[2] != 0) {
        //https://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/
        let trace = m00 + m11 + m22; // I removed + 1.0f; see discussion with Ethan
        if (trace > 0) {// I changed M_EPSILON to 0
            let s = 0.5 / Math.sqrt(trace + 1);
            qw = 0.25 / s;
            qx = (m21 - m12) * s;
            qy = (m02 - m20) * s;
            qz = (m10 - m01) * s;
        } else {
            if (m00 > m11 && m00 > m22) {
                let s = 2 * Math.sqrt(1 + m00 - m11 - m22);
                qw = (m21 - m12) / s;
                qx = 0.25 * s;
                qy = (m01 + m10) / s;
                qz = (m02 + m20) / s;
            } else if (m11 > m22) {
                let s = 2 * Math.sqrt(1 + m11 - m00 - m22);
                qw = (m02 - m20) / s;
                qx = (m01 + m10) / s;
                qy = 0.25 * s;
                qz = (m12 + m21) / s;
            } else {
                let s = 2.0 * Math.sqrt(1 + m22 - m00 - m11);
                qw = (m10 - m01) / s;
                qx = (m02 + m20) / s;
                qy = (m12 + m21) / s;
                qz = 0.25 * s;
            }
        }
    }
    var rotate = [qx, qy, qz, qw];

    return { translate, rotate, scale, packedbones, boneindex, det };
}

type BoneTransform = { translate: number[], scale: number[], rotate: number[], packedbones?: number[][], boneindex?: number, det?: number };
type BoneAnim = { transforms: BoneTransform[], times: number[] };
function boneSource() {
    var subs: { packedbones: number[][], map: Map<number, number>, renderfunc: RenderFunc }[] = [];
    var renderfuncmap = new Map<RenderFunc, (i: number, vi: number) => number>();
    let nextboneid = 0;
    let idgetter = () => nextboneid++;

    //ensure bone id 0 is always identity
    let nullindex = idgetter();
    subs.push({
        map: new Map([[0, nullindex]]),
        packedbones: [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]],
        renderfunc: null!//TODO
    });

    var addMesh = (mesh: Mesh) => {
        mesh.getters.bone = getGetterFromRenderFunc(mesh.originalRenderfunc)
    }

    var getGetterFromRenderFunc = (renderfunc: RenderFunc) => {
        if (renderfuncmap.has(renderfunc)) {
            return renderfuncmap.get(renderfunc);
        }
        var bonegetter = getAttributeGetter(renderfunc, renderfunc.progmeta.aBones);
        if (!bonegetter || !renderfunc.progmeta.uBones) {
            let r = (i, vi) => nullindex;
            renderfuncmap.set(renderfunc, r);
            return r;
        }

        var map = new Map<number, number>();
        for (var a = 0; a < renderfunc.nvertices; a++) {
            var boneid = bonegetter(a, 3) % 256;
            if (!map.has(boneid)) {
                map.set(boneid, idgetter());
            }
        }
        subs.push({
            packedbones: renderfunc.uniforms[renderfunc.progmeta.uBones!.name],
            map: map,
            renderfunc
        });

        var getter = (i: number, vi: number) => {
            return (vi == 0 ? map.get(bonegetter!(i, 3) % 256)! : 0);
        };

        renderfuncmap.set(renderfunc, getter);
        return getter;
    }

    var convertAnimation = (anims: AnimationData) => {
        let r: BoneAnim[] = [];
        if (anims.find(a => a.subrenders.length == 0)) { return r; }
        let firstframe = anims.reduce((a, v) => Math.min(a, v.subrenders[0].time), Infinity);
        for (let anim of anims) {
            let sub = subs.find(s => s.renderfunc && s.renderfunc.raw == anim.original.raw)!;
            if (!sub) { continue; }
            let uniname = anim.original.progmeta.uBones!.name;
            for (let oldindex of sub.map.keys()) {
                let transforms: BoneTransform[] = [];
                let times: number[] = [];
                for (let render of anim.subrenders) {
                    let tr = getPackedBoneTransform(render.uniforms[uniname], oldindex);
                    if (tr.det > 0) {
                        transforms.push(tr);
                        times.push(render.time - firstframe);
                    }
                }
                r[sub.map.get(oldindex)!] = { times, transforms };
            }
        }
        return r;
    }

    var getBaseTransforms = () => {
        //transform: (3translate,3scale,4rotate)
        //tex: (transform x bones) x frames
        let r: BoneTransform[] = [];
        for (let sub of subs) {
            for (let oldindex of sub.map.keys()) {
                r[sub.map.get(oldindex)!] = getPackedBoneTransform(sub.packedbones, oldindex);
            }
        }
        return r;
    }

    var getMatrices = () => {
        var totalbones = subs.reduce((a, v) => a + v.map.size, 0);
        var tex = new Float32Array(16 * totalbones);
        for (let sub of subs) {
            for (var oldindex of sub.map.keys()) {
                var newindex = sub.map.get(oldindex)!;
                //TODO maybe get some fancy oneliner here
                var baseindex = oldindex * 3;
                tex[16 * newindex + 0] = sub.packedbones[baseindex + 0][0];
                tex[16 * newindex + 1] = sub.packedbones[baseindex + 0][1];
                tex[16 * newindex + 2] = sub.packedbones[baseindex + 0][2];
                tex[16 * newindex + 3] = 0;
                tex[16 * newindex + 4] = sub.packedbones[baseindex + 0][3];
                tex[16 * newindex + 5] = sub.packedbones[baseindex + 1][0];
                tex[16 * newindex + 6] = sub.packedbones[baseindex + 1][1];
                tex[16 * newindex + 7] = 0;
                tex[16 * newindex + 8] = sub.packedbones[baseindex + 1][2];
                tex[16 * newindex + 9] = sub.packedbones[baseindex + 1][3];
                tex[16 * newindex + 10] = sub.packedbones[baseindex + 2][0];
                tex[16 * newindex + 11] = 0;
                tex[16 * newindex + 12] = sub.packedbones[baseindex + 2][1];
                tex[16 * newindex + 13] = sub.packedbones[baseindex + 2][2];
                tex[16 * newindex + 14] = sub.packedbones[baseindex + 2][3];
                tex[16 * newindex + 15] = 1;
            }
        }
        return tex;
    }

    return { getMatrices, getGetterFromRenderFunc, getBaseTransforms, addMesh, nullindex, convertAnimation };
}

function convertJsonAttr(newname: string, newtype: vartypeNames, arrsize: number, norm = false) {
    var attr: VertexInput = {
        arrlength: arrsize,
        sources: [],
        name: newname,
        type: newtype,
        normalize: norm
    }

    return attr;
}

export function convertUniformAnim(renders: patchrs.RenderInvocation[], program: ProgramMeta) {
    var bonemeta = program.raw.uniforms.find(q => q.name == "uBoneTransforms[0]");
    var bufs: { time: number, uniforms: ReturnType<typeof decodeUniformBuffer> }[] = [];
    if (!renders) { return bufs; }
    if (bonemeta) {
        bufs = renders.map(u => ({
            time: u.lastFrameTime,
            uniforms: decodeUniformBuffer(u.uniformState, program)
        }));
    }
    return bufs;
}


export function findAnimCycle(framedata: BoneAnim[]) {
    let laststart = -Infinity;
    let firstend = Infinity;
    let numbones = 0;
    for (let bone of framedata) {
        if (!bone) { continue; }
        laststart = Math.max(laststart, bone.times[0]);
        firstend = Math.min(firstend, bone.times[bone.times.length - 1]);
        numbones++;
    }
    if (!isFinite(laststart) || !isFinite(firstend)) {
        return { duration: 0, start: 0 };
    }
    const step = 100;
    const minstep = Math.ceil(800 / step);

    var numsteps = Math.floor((firstend - laststart) / step);
    var resampled = new Float64Array(numbones * numsteps * 3);

    let boneindex = 0;
    let sums: number[] = [];
    let quadsums: number[] = [];
    for (let bone of framedata) {
        if (!bone) { continue; }
        var pastindex = 0;
        sums.push(0, 0, 0);
        quadsums.push(0, 0, 0);
        for (var timeindex = 0; timeindex < numsteps; timeindex++) {
            let time = laststart + timeindex * step;
            for (; pastindex <= bone.times.length && bone.times[pastindex] < time; pastindex++);
            if (pastindex >= bone.times.length - 1 || pastindex <= 0) { continue; }
            let alpha = (bone.times[pastindex] - time) / (bone.times[pastindex] - bone.times[pastindex - 1]);
            let prev = bone.transforms[pastindex - 1].translate;
            let next = bone.transforms[pastindex].translate;
            let value = [
                alpha * prev[0] + (1 - alpha) * next[0],
                alpha * prev[1] + (1 - alpha) * next[1],
                alpha * prev[2] + (1 - alpha) * next[2]
            ];
            sums[boneindex * 3 + 0] += value[0];
            sums[boneindex * 3 + 1] += value[1];
            sums[boneindex * 3 + 2] += value[2];

            quadsums[boneindex * 3 + 0] += value[0] * value[0];
            quadsums[boneindex * 3 + 1] += value[1] * value[1];
            quadsums[boneindex * 3 + 2] += value[2] * value[2];

            let outindex = boneindex * numsteps * 3 + timeindex * 3;
            resampled[outindex + 0] = value[0];
            resampled[outindex + 1] = value[1];
            resampled[outindex + 2] = value[2];
        }
        boneindex++;
    }

    var mean = sums.map(v => v / numsteps);
    var std = quadsums.map(v => (v == 0 ? 1 : v / numsteps));

    let scores: { score: number, stepdif: number }[] = [];
    let maxscore = 0;
    let best = 0;
    for (let stepdif = minstep; stepdif < numsteps; stepdif++) {
        let score = 0;
        for (let i = 0; i < numsteps - stepdif; i++) {
            let boneindex = 0;
            for (let bone of framedata) {
                if (!bone) { continue; }
                let leftindex = numsteps * boneindex * 3 + i * 3;
                let rightindex = numsteps * boneindex * 3 + (i + stepdif) * 3;
                score += (resampled[leftindex + 0] - mean[boneindex * 3 + 0]) * (resampled[rightindex + 0] - mean[boneindex * 3 + 0]) / std[boneindex * 3 + 0];
                score += (resampled[leftindex + 1] - mean[boneindex * 3 + 1]) * (resampled[rightindex + 1] - mean[boneindex * 3 + 1]) / std[boneindex * 3 + 1];
                score += (resampled[leftindex + 2] - mean[boneindex * 3 + 2]) * (resampled[rightindex + 2] - mean[boneindex * 3 + 2]) / std[boneindex * 3 + 2];
                boneindex++;
            }
        }
        scores.push({ score, stepdif });
        if (score > maxscore) {
            maxscore = score;
            best = stepdif;
        }
    }

    let beststartScore = Infinity;
    let beststart = 0;
    let startscores: { score: number, start: number }[] = [];
    for (let startstep = 0; startstep < numsteps - best; startstep++) {
        let score = 0;
        let boneindex = 0;
        for (let bone of framedata) {
            if (!bone) { continue; }
            let leftindex = numsteps * boneindex * 3 + startstep * 3;
            let rightindex = numsteps * boneindex * 3 + (startstep + best) * 3;
            score += Math.abs(resampled[leftindex + 0] - resampled[rightindex + 0]);
            score += Math.abs(resampled[leftindex + 1] - resampled[rightindex + 1]);
            score += Math.abs(resampled[leftindex + 2] - resampled[rightindex + 2]);
            boneindex++;
        }
        if (score < beststartScore) {
            beststartScore = score;
            beststart = startstep;
        }
        startscores.push({ score: score, start: startstep * step });
    }
    //console.log(scores);
    //console.log(startscores);
    console.log(`extracted anim: ${beststart * step}-${(beststart + best) * step} (${best * step})`);
    return { duration: best * step, start: beststart * step };
}

export async function recordGltfAnimation(duration: number, filter: CaptureMode | number, opts?: { captmode?: "ava" | "all" | "ui3d", resampletime?: number, mode?: "all" | "extract", animdelay?: number, captureopts: patchrs.RecordRenderOptions }) {
    var invokes = await captureRenderCallsRaw(typeof filter == "string" ? filter : "all", { framebufferTexture: (typeof filter == "number" ? filter : undefined), ...opts?.captureopts ?? {} });
    var renderfn = convertCallsToRenderfuncs(invokes);
    return convertRendersToGLTF(renderfn, async (renderfn) => {
        //the texture bake will lag out the game and reset anims at next end
        if (opts?.animdelay !== 0) { await delay(opts?.animdelay || 2000); }
        var cbs = renderfn.map(r => ({
            orig: r,
            prom: patchrs.native.recordRenderCalls({ maxframes: 1000, vertexObjectId: r.raw.vertexObjectId, programId: r.raw.program.programId, timeout: duration })
        }));
        await delay(duration + 500);
        let keyframes: { subrenders: ReturnType<typeof convertUniformAnim>, original: RenderFunc }[] = [];
        for (let cb of cbs) {
            keyframes.push({
                subrenders: convertUniformAnim(await cb.prom, cb.orig.progmeta),
                original: cb.orig
            });
        }
        return [
            { name: "main", renderfuncs: keyframes, cuttype: { mode: opts?.mode || "extract" }, resampletime: opts?.resampletime }
        ];
    });
}

export async function captureGltfModel(mode: CaptureMode = "ava") {
    var invokes = await captureRenderCallsRaw(mode);
    var renderfn = convertCallsToRenderfuncs(invokes).filter(q => q);
    return convertRendersToGLTF(renderfn);
}
