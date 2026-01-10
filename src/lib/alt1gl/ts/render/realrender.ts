
import { flipImagedata } from "../util/util";
import { RenderFunc } from "./renderprogram";
import * as patchrs from "../util/patchrs_napi";



export function renderOriginal(render: RenderFunc) {
    let ren = new RealRenderer();
    ren.render([render]);
    return ren.capture();
}
export function renderOriginals(renders: RenderFunc[]) {
    let ren = new RealRenderer();
    ren.render(renders);
    return ren.capture();
}
globalThis.renderOriginals = renderOriginals;

type HittestResult = { i0: number, i1: number, i2: number, z: number, area: number, render: RenderFunc, weights: number[], pos0: number[], pos1: number[], pos2: number[] }
type Progmeta = {
    prog: WebGLProgram,
    unimeta: ReturnType<RealRenderer["getUniformbindings"]>,
};
type ProgmetaEntry = {
    data: Progmeta | null,
    verterr: string | null,
    fragerr: string | null,
    linkerr: string | null
}

export class RealRenderer {
    voas = new Map<patchrs.RenderInvocation, { voa: WebGLVertexArrayObject, transformed: Float32Array | null }>();
    textures = new Map<patchrs.TrackedTexture, WebGLTexture>();
    programs = new Map<patchrs.GlProgram, ProgmetaEntry>();
    cachedPolygonProgram: WebGLProgram | null = null;
    renderlist: RenderFunc[] = [];
    lineartosrgb = true;
    renderdepth = false;
    usezbuffer = true;
    subviewmatrix = new DOMMatrix();
    selected: HittestResult | null = null;

    depthrange = [-1000, 1000];
    measuredDepthRange: [number, number] | null = null;
    width = -1;
    height = -1;

    cnv = document.createElement("canvas");
    gl = this.cnv.getContext("webgl2")!;

    constructor() {
        this.cnv.classList.add("td-render");
    }

    resetView() {
        let firstrender = this.renderlist[0];
        if (!firstrender) { return; }
        this.subviewmatrix = new DOMMatrix().scaleSelf(
            firstrender.raw.viewport.width / this.cnv.clientWidth,
            firstrender.raw.viewport.height / this.cnv.clientHeight
        );
    }

    getWindowMatrix() {
        return new DOMMatrix().translateSelf(-1, 1, 0).scaleSelf(
            2 / this.cnv.clientWidth,
            - 2 / this.cnv.clientHeight,
            1
        );
    }

    convertVertexGlsl(source: string) {
        source = convertGlsl(source);
        return replaceGlslMain(source, `
            uniform highp mat4 uSubviewMatrix;
            void main(){
                originalMain();
                gl_Position=uSubviewMatrix*gl_Position;
            }
        `);
    }

    convertFragmentGlsl(source: string) {
        source = convertGlsl(source);
        source = source.replace(/#define (SUNLIGHT_SHADOWS|POINT_LIGHT_SHADOWS|TRANSLUCENT_SHADOWS)\b/g, "#define $1\n#undef $1");
        return replaceGlslMain(source, `
            uniform float uOutputSrgb;
            uniform vec3 uRenderDepth;
            void main(){
                originalMain();
                if(uOutputSrgb!=0.){
                    gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(1./2.2));
                }
                if(uRenderDepth.x!=0.0){
                    // gl_FragColor.rgb=vec3((gl_FragCoord.z-uRenderDepth.y-uRenderDepth.z)/uRenderDepth.z);
                    gl_FragColor.rgb=vec3(gl_FragCoord.z);
                    gl_FragColor.a=1.0;
                }
            }
        `);
    }

    getProgram(render: RenderFunc) {
        let progmeta = this.programs.get(render.raw.program);
        if (!progmeta) {
            let success = true;
            let gl = this.gl;
            let vert = gl.createShader(gl.VERTEX_SHADER)!;
            gl.shaderSource(vert, this.convertVertexGlsl(render.raw.program.vertexShader.source));
            // gl.shaderSource(vert, testShaderVertex);
            gl.compileShader(vert);
            let verterr = gl.getShaderInfoLog(vert);
            success &&= gl.getShaderParameter(vert, gl.COMPILE_STATUS);
            let frag = gl.createShader(gl.FRAGMENT_SHADER)!;
            gl.shaderSource(frag, this.convertFragmentGlsl(render.raw.program.fragmentShader.source));
            // gl.shaderSource(frag, testShaderFragment);
            gl.compileShader(frag);
            let fragerr = gl.getShaderInfoLog(frag);
            success &&= gl.getShaderParameter(frag, gl.COMPILE_STATUS);
            let prog: WebGLProgram | null = gl.createProgram();
            gl.attachShader(prog, vert);
            gl.attachShader(prog, frag);
            gl.transformFeedbackVaryings(prog, ["gl_Position"], gl.SEPARATE_ATTRIBS);
            gl.linkProgram(prog);
            gl.validateProgram(prog);
            let linkerr = gl.getProgramInfoLog(prog);
            success &&= gl.getProgramParameter(prog, gl.LINK_STATUS);
            let progdata: Progmeta | null = null;
            if (success) {
                let unimeta = this.getUniformbindings(render, prog);
                progdata = { prog, unimeta };
            } else {
                console.warn("realrender program compile failed", verterr, fragerr, linkerr);
                prog = null;
            }
            progmeta = { data: progdata, verterr, fragerr, linkerr };
            this.programs.set(render.raw.program, progmeta);
        }
        return progmeta;
    }

    getUniformbindings(render: RenderFunc, prog: WebGLProgram) {
        let gl = this.gl;
        let uninames = Object.keys(render.uniforms);
        let uniindices = gl.getUniformIndices(prog, uninames)!;
        let uniblocks = gl.getActiveUniforms(prog, uniindices, gl.UNIFORM_BLOCK_INDEX);
        let unioffsets = gl.getActiveUniforms(prog, uniindices, gl.UNIFORM_OFFSET);
        let unitypes = gl.getActiveUniforms(prog, uniindices, gl.UNIFORM_TYPE);
        let unistrides = gl.getActiveUniforms(prog, uniindices, gl.UNIFORM_ARRAY_STRIDE);

        let unipos: (WebGLUniformLocation | null)[] = [];

        for (let a in uninames) {
            unipos.push(uniblocks[a] != -1 ? null : gl.getUniformLocation(prog, uninames[a])!);
        }

        let blocks: { buf: WebGLBuffer, view: DataView }[] = [];
        let nblocks = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORM_BLOCKS);
        for (let a = 0; a < nblocks; a++) {
            let size = gl.getActiveUniformBlockParameter(prog, a, gl.UNIFORM_BLOCK_DATA_SIZE);
            blocks.push({
                view: new DataView(new ArrayBuffer(size)),
                buf: gl.createBuffer()!
            });
        }

        let srgbpos = gl.getUniformLocation(prog, "uOutputSrgb");
        let renderdepthpos = gl.getUniformLocation(prog, "uRenderDepth");
        let subviewpos = gl.getUniformLocation(prog, "uSubviewMatrix");
        let extra = { srgbpos, renderdepthpos, subviewpos };

        return { uniindices, uninames, uniblocks, unioffsets, unitypes, unistrides, unipos, blocks, extra };
    }

    getVertexArray(render: RenderFunc, prog: WebGLProgram) {
        let voaobj = this.voas.get(render.raw);
        if (!voaobj) {
            let gl = this.gl;
            let voa = gl.createVertexArray()!;
            gl.bindVertexArray(voa);
            //index buffer
            if (render.raw.vertexArray.indexBuffer) {
                let index = gl.createBuffer()!;
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, render.raw.vertexArray.indexBuffer, gl.STATIC_DRAW);
            } else {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }
            //attribute buffers
            let buffs = new Map<Uint8Array, WebGLBuffer>();
            for (let input of render.raw.program.inputs) {
                let attr = render.raw.vertexArray.attributes[input.location];
                let buff = buffs.get(attr.buffer);
                if (!buff) {
                    buff = gl.createBuffer()!;
                    buffs.set(attr.buffer, buff);

                    gl.bindBuffer(gl.ARRAY_BUFFER, buff);
                    gl.bufferData(gl.ARRAY_BUFFER, attr.buffer, gl.STATIC_DRAW);
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, buff);
                let loc = gl.getAttribLocation(prog, input.name);
                if (loc != -1) {
                    gl.vertexAttribPointer(loc, attr.vectorlength, attr.scalartype, attr.normalized, attr.stride, attr.offset);
                    gl.enableVertexAttribArray(loc);
                    gl.VERTEX_ATTRIB_ARRAY_NORMALIZED
                }
            }
            voaobj = { voa, transformed: null }
            this.voas.set(render.raw, voaobj);
        }
        return voaobj;
    }

    setExtraUniforms(prog: Progmeta, hittest = false) {
        let gl = this.gl;
        gl.uniformMatrix4fv(prog.unimeta.extra.subviewpos, false, (hittest ? new DOMMatrix() : this.subviewmatrix).toFloat32Array());
        gl.uniform1f(prog.unimeta.extra.srgbpos, +this.lineartosrgb);
        if (this.renderdepth && !hittest) {
            let depth = this.getDepthRange();
            let normnear = (depth[0] - this.depthrange[0]) / (this.depthrange[1] - this.depthrange[0]);
            let normgap = (depth[1] - depth[0]) / (this.depthrange[1] - this.depthrange[0]);
            gl.uniform3f(prog.unimeta.extra.renderdepthpos, 1, normnear, normgap);
        } else {
            gl.uniform3f(prog.unimeta.extra.renderdepthpos, 0, 0, 0);
        }
    }

    setUniforms(render: RenderFunc, prog: Progmeta) {
        if (!prog.prog) { return; }
        let gl = this.gl;
        let unimeta = prog.unimeta;

        for (let a in unimeta.uninames) {
            let uni = render.uniforms[unimeta.uninames[a]];
            let isint = unimeta.unitypes[a] == gl.SAMPLER_2D || unimeta.unitypes[a] == gl.SAMPLER_CUBE || unimeta.unitypes[a] == gl.SAMPLER_3D;
            if (unimeta.uniblocks[a] == -1) {
                let loc = unimeta.unipos[a];
                if (!loc) { debugger; }
                if (isint && uni[0].length == 1) { gl.uniform1iv(loc, uni.flat()); }
                else if (!isint && uni[0].length == 1) { gl.uniform1fv(loc, uni.flat()); }
                else if (!isint && uni[0].length == 2) { gl.uniform2fv(loc, uni.flat()); }
                else if (!isint && uni[0].length == 3) { gl.uniform3fv(loc, uni.flat()); }
                else if (!isint && uni[0].length == 4) { gl.uniform4fv(loc, uni.flat()); }
                else if (!isint && uni[0].length == 16) { gl.uniformMatrix4fv(loc, false, uni.flat()); }
                else {
                    throw new Error("unexpected");
                }
            } else {
                let offset = unimeta.unioffsets[a];
                let block = unimeta.blocks[unimeta.uniblocks[a]];

                // if (unitypes[a] == gl.FLOAT_MAT4) { uni = uni.map(transpose); }
                for (let row of uni) {
                    for (let b = 0; b < row.length; b++) {
                        if (isint) {
                            block.view.setUint32(offset + b * 4, row[b], true);
                        } else {
                            block.view.setFloat32(offset + b * 4, row[b], true);
                        }
                    }
                    offset += unimeta.unistrides[a];
                }
            }
        }
        //uniform blocks
        for (let [i, block] of unimeta.blocks.entries()) {
            gl.bindBuffer(gl.UNIFORM_BUFFER, block.buf);
            gl.bufferData(gl.UNIFORM_BUFFER, block.view, gl.DYNAMIC_DRAW);
            gl.uniformBlockBinding(prog.prog, i, i);
            gl.bindBufferBase(gl.UNIFORM_BUFFER, i, block.buf);
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);
        }
    }

    getTexture(sampler: patchrs.TextureSnapshot) {
        let tex = this.textures.get(sampler.base);
        if (!tex) {
            let gl = this.gl;
            console.log("loading texture " + sampler.texid);
            tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            let format = sampler.base.formatid == 35919 ? gl.SRGB8_ALPHA8 : gl.RGBA;
            if (sampler.base.format != "unknown") {
                let img = sampler.capture(0, 0, sampler.width, sampler.height);
                gl.texImage2D(gl.TEXTURE_2D, 0, format, sampler.width, sampler.height, gl.NONE, gl.RGBA, gl.UNSIGNED_BYTE, img);
            } else {
                console.log(`using dummy texture for id: ${sampler.base.texid} (${sampler.width}x${sampler.height}) format: ${sampler.base.formatid.toString(16)}`);
                let dummydata = new Uint8Array(sampler.width * sampler.height * 4);
                gl.texImage2D(gl.TEXTURE_2D, 0, format, sampler.width, sampler.height, gl.NONE, gl.RGBA, gl.UNSIGNED_BYTE, dummydata);
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            this.textures.set(sampler.base, tex);
        }
        return tex;
    }

    renderSubcall(render: RenderFunc) {
        let raw = render.raw;
        let gl = this.gl;
        if (this.width != raw.viewport.width || this.height != raw.viewport.height) {
            console.warn("viewports do not match");
            return;
        }
        let progmetaentry = this.getProgram(render);
        if (!progmetaentry.data) { return; }
        let progmeta = progmetaentry.data;
        gl.useProgram(progmeta.prog);

        //Vertex array
        let voaobj = this.getVertexArray(render, progmeta.prog);
        gl.bindVertexArray(voaobj.voa);

        //uniforms
        this.setUniforms(render, progmeta);
        this.setExtraUniforms(progmeta);

        //samplers
        for (let samplerid in raw.samplers) {
            let texture = raw.samplers[samplerid];
            let tex = this.getTexture(texture);
            gl.activeTexture(gl.TEXTURE0 + +samplerid);
            gl.bindTexture(gl.TEXTURE_2D, tex);
        }

        let rendermode = (raw.renderMode == "triangles" ? gl.TRIANGLES : raw.renderMode == "strips" ? gl.TRIANGLE_STRIP : raw.renderMode == "fans" ? gl.TRIANGLE_FAN : 0);
        for (let range of raw.renderRanges) {
            if (raw.vertexArray.indexBuffer) {
                gl.drawElements(rendermode, range.length, raw.indexType, range.start);
            } else {
                gl.drawArrays(rendermode, range.start, range.length);
            }
        }
        gl.bindVertexArray(null);
    }

    polygonProgram() {
        if (!this.cachedPolygonProgram) {
            let gl = this.gl;
            let prog = gl.createProgram()!;
            let vert = gl.createShader(gl.VERTEX_SHADER)!;
            gl.shaderSource(vert, `#version 300 es
                in highp vec2 pos;
                uniform highp mat4 uSubviewMatrix;
                void main() {
                    gl_Position = vec4(pos,0.,1.);
                    gl_Position = uSubviewMatrix * gl_Position;
                }
            `);
            let frag = gl.createShader(gl.FRAGMENT_SHADER)!;
            gl.shaderSource(frag, `#version 300 es
                precision mediump float;
                uniform vec3 vColor;
                out vec4 fragColor;
                void main(void) {
                    fragColor = vec4(vColor,0.3);
                }
            `);
            gl.compileShader(vert);
            gl.compileShader(frag);
            gl.attachShader(prog, vert);
            gl.attachShader(prog, frag);
            gl.linkProgram(prog);
            gl.validateProgram(prog);
            this.cachedPolygonProgram = prog;
        }
        return this.cachedPolygonProgram;
    }

    renderPolygon(pos0: number[], pos1: number[], pos2: number[], color: number[]) {
        let gl = this.gl;
        let prog = this.polygonProgram();
        gl.useProgram(prog);
        let voa = gl.createVertexArray()!;
        gl.bindVertexArray(voa);
        let buf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([pos0[0], pos0[1], pos1[0], pos1[1], pos2[0], pos2[1]]), gl.STATIC_DRAW);
        // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1]), gl.STATIC_DRAW);
        gl.bindAttribLocation(prog, 0, "pos");
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform3f(gl.getUniformLocation(prog, "vColor"), color[0] / 255, color[1] / 255, color[2] / 255);
        gl.uniformMatrix4fv(gl.getUniformLocation(prog, "uSubviewMatrix"), false, this.subviewmatrix.toFloat32Array());
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
        gl.bindVertexArray(null)
    }

    getDepthRange() {
        if (!this.measuredDepthRange) {
            let near = Infinity;
            let far = -Infinity;

            for (let func of this.renderlist) {
                let res = this.getRenderDepthRange(func);
                if (isFinite(res.near)) { near = Math.min(near, res.near); }
                if (isFinite(res.near)) { far = Math.max(far, res.far); }
            }
            this.measuredDepthRange = [near, far];

            // todo remove
            let depth = this.measuredDepthRange;
            let normnear = (depth[0] - this.depthrange[0]) / (this.depthrange[1] - this.depthrange[0]);
            let normgap = (depth[1] - depth[0]) / (this.depthrange[1] - this.depthrange[0]);
            console.log("depth", +near.toFixed(3), +far.toFixed(3), "norm", +normnear.toFixed(3), +(normnear + normgap).toFixed(3));

        }
        return this.measuredDepthRange!;
    }

    getRenderDepthRange(render: RenderFunc) {
        let near = Infinity;
        let far = -Infinity;
        let out = this.getTransformedMesh(render);
        if (out) {
            let w = this.cnv.width;
            let h = this.cnv.height;
            for (let range of render.raw.renderRanges) {
                for (let i = range.start; i < range.start + range.length; i += 3) {
                    let i0 = render.indices[i + 0];
                    let i1 = render.indices[i + 1];
                    let i2 = render.indices[i + 2];
                    let w0 = out[i0 * 4 + 3], w1 = out[i1 * 4 + 3], w2 = out[i2 * 4 + 3];
                    let x0 = out[i0 * 4 + 0] / w0, x1 = out[i1 * 4 + 0] / w1, x2 = out[i2 * 4 + 0] / w2;
                    let y0 = out[i0 * 4 + 1] / w0, y1 = out[i1 * 4 + 1] / w1, y2 = out[i2 * 4 + 1] / w2;
                    let z0 = out[i0 * 4 + 2] / w0, z1 = out[i1 * 4 + 2] / w1, z2 = out[i2 * 4 + 2] / w2;
                    // near = Math.min(near, z0, z1, z2);
                    // far = Math.max(far, z0, z1, z2);
                    if (x0 >= 0 && x0 < w && y0 >= 0 && y0 < h) { near = Math.min(near, z0); far = Math.max(far, z0); }
                    if (x1 >= 0 && x1 < w && y1 >= 0 && y1 < h) { near = Math.min(near, z1); far = Math.max(far, z1); }
                    if (x2 >= 0 && x2 < w && y2 >= 0 && y2 < h) { near = Math.min(near, z2); far = Math.max(far, z2); }
                }
            }
        }
        return { near, far };
    }

    getTransformedMesh(render: RenderFunc) {
        let progmetaentry = this.getProgram(render);
        if (!progmetaentry.data) { return null; }
        let progmeta = progmetaentry.data;
        let voaobj = this.getVertexArray(render, progmeta.prog);

        if (!voaobj.transformed) {
            let gl = this.gl;
            gl.useProgram(progmeta.prog);
            gl.bindVertexArray(voaobj.voa);

            //uniforms
            this.setUniforms(render, progmeta);
            this.setExtraUniforms(progmeta, true);

            const tf = gl.createTransformFeedback();
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
            const sumBuffer = gl.createBuffer()!;
            gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, sumBuffer);
            gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, render.nvertices * 4 * 4, gl.DYNAMIC_COPY);
            gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);

            // bind the buffers to the transform feedback
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, sumBuffer);

            // Create and fill out a transform feedback
            // gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.beginTransformFeedback(gl.POINTS);
            gl.enable(gl.RASTERIZER_DISCARD);

            let oldindex = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.drawArrays(gl.POINTS, 0, render.nvertices);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, oldindex);

            gl.endTransformFeedback();
            gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
            gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, sumBuffer);
            voaobj.transformed = new Float32Array(render.nvertices * 4);
            gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, voaobj.transformed);
            gl.deleteBuffer(sumBuffer);
        }
        return voaobj.transformed;
    }

    hittestSubcall(render: RenderFunc, x: number, y: number) {
        let matchlist: HittestResult[] = [];
        let raw = render.raw;
        if (this.width != raw.viewport.width || this.height != raw.viewport.height) {
            console.warn("viewports do not match");
            return matchlist;
        }

        let out = this.getTransformedMesh(render);
        if (!out) { return matchlist; }

        for (let range of render.raw.renderRanges) {
            for (let i = range.start; i < range.start + range.length; i += 3) {
                let i0 = render.indices[i + 0];
                let i1 = render.indices[i + 1];
                let i2 = render.indices[i + 2];
                let w0 = out[i0 * 4 + 3], w1 = out[i1 * 4 + 3], w2 = out[i2 * 4 + 3];
                let x0 = out[i0 * 4 + 0] / w0, x1 = out[i1 * 4 + 0] / w1, x2 = out[i2 * 4 + 0] / w2;
                let y0 = out[i0 * 4 + 1] / w0, y1 = out[i1 * 4 + 1] / w1, y2 = out[i2 * 4 + 1] / w2;
                let z0 = out[i0 * 4 + 2] / w0, z1 = out[i1 * 4 + 2] / w1, z2 = out[i2 * 4 + 2] / w2;
                let cross0 = (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0);
                let cross1 = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
                let cross2 = (x0 - x2) * (y - y2) - (x - x2) * (y0 - y2);
                let front = cross0 > 0 && cross1 > 0 && cross2 > 0;
                let back = cross0 < 0 && cross1 < 0 && cross2 < 0;
                if (front || back) {
                    let areax2 = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
                    let d0 = cross1 / areax2, d1 = cross2 / areax2, d2 = cross0 / areax2;
                    matchlist.push({
                        render,
                        weights: [d0, d1, d2],
                        z: d0 * z0 + d1 * z1 + d2 * z2,
                        area: areax2 / 2,
                        i0, i1, i2,
                        pos0: [x0, y0, z0],
                        pos1: [x1, y1, z1],
                        pos2: [x2, y2, z2]
                    });
                }
            }
        }
        return matchlist;
    }

    hittest(x: number, y: number) {
        let pos = new DOMPoint(x, y).matrixTransform(this.getWindowMatrix());
        pos = pos.matrixTransform(this.subviewmatrix.inverse());

        // this.render();
        // this.renderPolygon([pos.x, pos.y, pos.z], [pos.x + 0.1, pos.y, pos.z], [pos.x, pos.y + 0.1, pos.z], [255, 128, 255]);
        // return;

        let allresults: HittestResult[] = [];

        this.render();

        for (let render of this.renderlist) {
            let res = this.hittestSubcall(render, pos.x, pos.y);
            if (res.length != 0) {
                allresults.push(...res);
            }
        }

        let colors = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [128, 0, 0],
            [0, 128, 0],
            [0, 0, 128]
        ]

        // if (!this.zbuffer) {
        //     allresults.reverse();
        // } else {
        //     allresults.sort((a, b) => a.z - b.z);
        // }
        allresults.sort((a, b) => Math.abs(a.area) - Math.abs(b.area));

        let colorindex = 0;
        for (let res of allresults) {
            this.renderPolygon(res.pos0, res.pos1, res.pos2, colors[colorindex++ % colors.length]);
            break;
        }
        this.selected = allresults[0];
        console.log(this.selected);
        if (this.selected) {
            for (let attr of this.selected.render.raw.program.inputs) {
                let getter = this.selected.render.getters[attr.name];
                if (globalThis.filtervertexlogs && globalThis.filtervertexlogs != attr.name) { continue; }

                let subindices = new Array(attr.type.vectorLength).fill(0).map((v, i) => i);

                let i0 = this.selected.i0, i1 = this.selected.i1, i2 = this.selected.i2;
                let v0 = subindices.map(q => getter(i0, q));
                let v1 = subindices.map(q => getter(i1, q));
                let v2 = subindices.map(q => getter(i2, q));
                let mouseval = subindices.map(q => v0[q] * this.selected!.weights[0] + v1[q] * this.selected!.weights[1] + v2[q] * this.selected!.weights[2]);
                console.log(attr.name, "mouse", mouseval.map(q => +q.toFixed(2)), "vs", [v0, v1, v2].map(q => q.map(w => +w.toFixed(2))));
            }
        }
        console.log(allresults.map(q => q.z));
        return allresults;
    }

    render(funs = this.renderlist) {
        let wasempty = this.renderlist.length == 0;
        this.renderlist = funs;
        if (this.renderlist.length == 0) {
            return;
        }
        if (wasempty && funs.length != 0) {
            this.resetView();
            this.usezbuffer = !funs[0].progmeta.isUi;
            this.lineartosrgb = !funs[0].progmeta.isUi;
            this.renderdepth = !!funs[0].progmeta.isShadowRender;
        }
        let width = funs[0].raw.viewport.width;
        let height = funs[0].raw.viewport.height;
        //prepare render
        this.cnv.width = width;
        this.cnv.height = height;
        this.width = width;
        this.height = height;
        this.measuredDepthRange = null;

        let gl = this.gl;
        gl.viewport(0, 0, width, height);
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.depthFunc(gl.LESS);

        if (!this.usezbuffer) {
            gl.disable(gl.DEPTH_TEST);
            // gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.DEPTH_TEST);
            // gl.enable(gl.CULL_FACE);
        }
        // this.cnv.style.filter = (this.lineartosrgb ? "brightness(10)" : "");

        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthRange(this.depthrange[0], this.depthrange[1]);
        gl.clearColor(0.5, 0.5, 0.5, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let func of funs) {
            this.renderSubcall(func);
        }
    }

    reset() {
        this.voas.clear();
        this.programs.clear();
        this.textures.clear();
        this.width = -1;
        this.height = -1;
        this.cnv.width = 0;
        this.cnv.height = 0;
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.renderlist = [];
    }

    capture() {
        let gl = this.gl;
        let img = new ImageData(this.cnv.width, this.cnv.height)
        gl.readPixels(0, 0, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, img.data, 0);
        flipImagedata(img);
        return img;
    }
}

function transpose(arr: number[]) {
    return [
        arr[0], arr[4], arr[8], arr[12],
        arr[1], arr[5], arr[9], arr[13],
        arr[2], arr[6], arr[10], arr[14],
        arr[3], arr[7], arr[11], arr[15]
    ]
}

function replaceGlslMain(source: string, newmain: string) {
    source = source.replace(/void main\(\)\s*\{/, "void originalMain() {")
    source = source + "\n\n" + newmain;
    return source;
}

function convertGlsl(source: string) {

    let header = [
        `#version 300 es`,//highest version we can choose in webgl2
        `precision highp float;`,
        `precision mediump sampler2D;`,
        `precision mediump sampler3D;`,
        `precision mediump sampler2DShadow;`,
        `precision mediump sampler2DArray;`,
        `#define fma(a,b,c) ((a)*(b)+(c))`,//fma doesn't exist
        `#define textureGather(sampler, texCoord) vec4(texture(sampler, texCoord))`,//simply return the same sample 4x
    ];

    return header.join("\n") + "\n" + source
        .replace(/^\s*#version ([\w ]+)$/m, "//original version $1")//replaced in new header
        .replace(/\bprecise\b/g, "highp")//doesn't exist in webgl
}

globalThis.showTexture = async (id: number) => {
    let tex = await patchrs.native.capture(id, 0, 0, -1, -1);
    flipImagedata(tex);
    let img = tex.show();

    img.onclick = () => {
        let cnv = document.createElement("canvas");
        let ctx = cnv.getContext("2d")!;
        cnv.width = tex.width;
        cnv.height = tex.height;
        ctx.putImageData(tex, 0, 0);
        navigator.clipboard.write([
            new ClipboardItem({ 'image/png': new Promise<Blob>(d => cnv.toBlob(d as any)) })
        ]);
        img.remove();
    }

    return tex;
}