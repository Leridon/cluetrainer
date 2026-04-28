import { mat4, vec4 } from "gl-matrix";
import { decodeUniformBuffer, getProgramMeta, getUniformValue } from "../render/renderprogram";
import * as patchrs from "../util/patchrs_napi";
import { chunksize, tilesize } from "./tilemarkers";
import { GL_FLOAT, GL_UNSIGNED_BYTE, positionMatrix, UniformSnapshotBuilder } from ".";

const vertexshader = `
    #version 330 core
    layout (location = {{poslocation}}) in vec3 aPos;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    out vec2 TexCoord;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        worldpos.y += 512.0/32.0; //lift floor overlay above ground to avoid z-fighting
        vec4 pos = uViewProjMatrix * worldpos;
        gl_Position = pos;
        TexCoord = aPos.xz / 64.0 / 512.0 + 0.5;
        TexCoord.y = 1.0 - TexCoord.y;
    }`;
const fragmentshader = `
    #version 330 core
    uniform sampler2D uTexture;
    out vec4 FragColor;
    in vec2 TexCoord;

    vec3 undoRs3Shading(vec3 srgb) {
        // rs uses a gamma=2 curve for linear->srgb the entire game is adjusted for this
        // but our assets are not, so we need to undo that here
        // also try to undo some rs3 brightness amplification
        return pow(srgb, vec3(2.2/2.0))*0.5;
    }

    void main() {
        // vec4 color = texture(uTexture, TexCoord);
        vec4 color = texture(uTexture, fract(TexCoord * vec2(4.0)));
        if(color.a < 0.3) { discard; }
        FragColor = vec4(color.rgb, 1.0);
        FragColor.rgb = undoRs3Shading(FragColor.rgb);
        // FragColor = vec4(TexCoord, 1.0, 1.0);
    }`;


async function findBestFloorRender() {
    let allrenders = await patchrs.native.recordRenderCalls({ features: ["uniforms", "vertexarray"] });
    let renders = allrenders.filter(call => {
        let meta = getProgramMeta(call.program);
        return meta.isFloor && meta.isLighted;
    });
    let scores = renders.map(call => {
        let meta = getProgramMeta(call.program);
        let unis = decodeUniformBuffer(call.uniformState, meta);
        let viewmatrix = unis[meta.uViewMatrix!.name];
        let modelmatrix = unis[meta.uModelMatrix!.name];
        let projmatrix = unis[meta.uProjectionMatrix!.name];

        let pos = vec4.fromValues(0, 0, 0, 1);
        vec4.transformMat4(pos, pos, modelmatrix[0] as mat4);
        vec4.transformMat4(pos, pos, viewmatrix[0] as mat4);
        vec4.transformMat4(pos, pos, projmatrix[0] as mat4);
        vec4.scale(pos, pos, 1 / pos[3]);

        //distance of center of mesh to center of screen
        let dist = Math.hypot(pos[0], pos[1]);
        //different levels of the same chunk have identical position matrices
        //prefer the one with the most vertices drawn (the ground floor)
        let vertcount = call.renderRanges.reduce((a, b) => a + b.length, 0);
        dist -= vertcount / 1000;
        return dist;
    });
    let bestindex = scores.indexOf(Math.min(...scores));
    return renders[bestindex];
}


export async function setFloorOverlay(img: ImageData) {
    let render = await findBestFloorRender();
    if (!render) { throw new Error("No floor render found"); }
    let prog = getProgramMeta(render.program);

    //overlay use the original floor mesh - currently broken
    let vertex = render.vertexArray;
    let posloc = prog.aPos!.location;
    let renderranges = render.renderRanges;

    let { program, uniforms, uniformsources } = floorOverlayProgram(posloc);
    uniforms.mappings.uTexture.write([0]);

    let tex = patchrs.native.createTexture(img);

    let target: patchrs.RenderFilter = {
        programId: render.program.programId,
        vertexObjectId: render.vertexObjectId
    };

    //fuckit we overlay everywhere
    target.vertexObjectId = undefined;
    vertex = undefined!;
    renderranges = undefined!;

    let overlayhandle = patchrs.native.beginOverlay(target, program, vertex, {
        uniformSources: uniformsources,
        uniformBuffer: uniforms.buffer,
        samplers: { "0": tex },
        trigger: "after",
        ranges: renderranges,
    });

    return {
        stop() {
            overlayhandle.stop();
        },
        update(img: ImageData) {
            tex.upload(img);
        }
    }
}

function floorOverlayProgram(poslocation: number) {
    let uniforms = new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4",
        uTexture: "sampler2d"
    });
    let uniformsources: patchrs.OverlayUniformSource[] = [
        { type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix" },
        { type: "program", name: "uModelMatrix", sourceName: "uModelMatrix" }
    ];
    let program = patchrs.native.createProgram(vertexshader.replaceAll("{{poslocation}}", "" + poslocation), fragmentshader, [
        { location: poslocation, name: "aPos", type: GL_FLOAT, length: 3 }
    ], uniforms.args);
    return { uniforms, program, uniformsources };
}

export function loadFloorOverlayMesh(file: Uint16Array) {
    const offset = -chunksize / 2;
    const heightscaling = tilesize / 32;
    let index: number[] = [];
    let pos: number[] = [];
    let uv: number[] = [];
    let col: number[] = [];
    for (let z = 0; z < chunksize; z++) {
        for (let x = 0; x < chunksize; x++) {
            let tileindex = (z * chunksize + x) * 5;
            let i = pos.length / 3;

            let y00 = file[tileindex + 0] * heightscaling;
            let y10 = file[tileindex + 1] * heightscaling;
            let y01 = file[tileindex + 2] * heightscaling;
            let y11 = file[tileindex + 3] * heightscaling;

            let p0 = 0;
            let p3 = 1 - p0;
            //outer verts
            pos.push((x + offset + p0) * tilesize, y00, (z + offset + p0) * tilesize);
            pos.push((x + offset + p0) * tilesize, y01, (z + offset + p3) * tilesize);
            pos.push((x + offset + p3) * tilesize, y10, (z + offset + p0) * tilesize);
            pos.push((x + offset + p3) * tilesize, y11, (z + offset + p3) * tilesize);

            col.push(255, 255, 255);
            col.push(255, 255, 255);
            col.push(255, 255, 255);
            col.push(255, 255, 255);

            index.push(i + 0, i + 1, i + 2);
            index.push(i + 2, i + 1, i + 3);
        }
    }

    return {
        pos: new Uint8Array(Float32Array.from(pos).buffer),
        color: new Uint8Array(Uint8Array.from(col).buffer),
        index: new Uint8Array(Uint16Array.from(index).buffer),
    }
}