
import { Matrix3 } from "three";
import "../util/halffloat";
import * as patchrs from "../util/patchrs_napi";
import { vartypeMeta, vartypes } from "./modelviewer/avautils";
import { CrcBuilder } from "../util/crc32";

const spriteShaderFragment = require("!raw-loader!./shaders/sprite_fragment.glsl").default;
const spriteShaderVertex = require("!raw-loader!./shaders/sprite_vertex.glsl").default;

var cachedPrograms = new WeakMap<patchrs.GlProgram, ProgramMeta>();
var vertexPosAliases = ["aVertexPosition_BoneLabel", "aWaterPosition_Depth", "aVertexPosition2D", "aVertexPosition"];





export type RenderFunc = ReturnType<typeof getRenderFunc>;
export type ProgramMeta = ReturnType<typeof fetchProgramMeta>;

export function getProgramMeta(prog: patchrs.GlProgram) {
	if (cachedPrograms.has(prog)) {
		return cachedPrograms.get(prog)!;
	}
	var r = fetchProgramMeta(prog);
	cachedPrograms.set(prog, r);
	return r;
}

function fetchProgramMeta(prog: patchrs.GlProgram) {
	var fragdefines: string[] = [];
	var vertdefines: string[] = [];
	var reg = /^#define\s+(\w+)\s*$/gm;
	let m: RegExpExecArray | null;
	while (m = reg.exec(prog.fragmentShader.source)) { fragdefines.push(m[1]); }
	while (m = reg.exec(prog.vertexShader.source)) { vertdefines.push(m[1]); }
	let isTinted = !!prog.fragmentShader.source.match(/\bgl_FragColor\s*=\s*uTint\b/);
	let isUiScaler = !!prog.fragmentShader.source.match(/\bLanczosShaderConsts\b/);

	let uTint = prog.uniforms.find(q => q.name == "uTint");
	let uHighlightScale = prog.uniforms.find(q => q.name == "uHighlightScale");
	let uBoneTransforms = prog.uniforms.find(q => q.name == "uBoneTransforms[0]");
	let uViewMatrix = prog.uniforms.find(q => q.name == "uViewMatrix");
	let uProjectionMatrix = prog.uniforms.find(q => q.name == "uProjectionMatrix");
	let uSrcUVRegion = prog.uniforms.find(q => q.name == "uSrcUVRegion");
	let uColourRemapWeightings = prog.uniforms.find(q => q.name == "uColourRemapWeightings");

	let aTexUV = prog.inputs.find(q => q.name == "aTextureUV");
	let aVertexNormal = prog.inputs.find(q => q.name == "aVertexNormal_BatchFlags");
	let aParticleSize = prog.inputs.find(q => q.name == "aBillboardSize" || q.name == "aParticleSize");
	let aMaterialSettingsSlotXY3 = prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY3");

	let aVertexPosition2D = prog.inputs.find(q => q.name == "aVertexPosition2D");
	let aPos = prog.inputs.find(i => vertexPosAliases.indexOf(i.name) != -1);

	let isLighted = fragdefines.includes("AMBIENT_LIGHTING") || fragdefines.includes("DIFFUSE_LIGHTING") || fragdefines.includes("ALBEDO_LIGHTING");
	let isShadowRender = vertdefines.includes("MODEL_GEOMETRY_SHADOW_VS");

	return {
		uModelMatrix: prog.uniforms.find(q => q.name == "uModelMatrix"),
		uBones: uBoneTransforms,
		uTint: uTint,
		uHighlightScale: uHighlightScale,
		uViewMatrix: uViewMatrix,
		uProjectionMatrix: uProjectionMatrix,

		aPos: aPos,
		aColor: prog.inputs.find(q => q.name == "aVertexColour"),
		aTexUV: aTexUV,
		aTexMetaLookup: prog.inputs.find(q => q.name == "aMaterialSettingsSlotXY_TilePositionXZ"),
		aBones: prog.inputs.find(q => q.name == "aVertexPosition_BoneLabel"),
		aSkinbones: prog.inputs.find(q => q.name == "aVertexSkinBones"),
		aVertexNormal_BatchFlags: aVertexNormal,
		aParticleSize: aParticleSize,

		isPostProcess: !!uColourRemapWeightings,
		isCompute: prog.computeShader.source.length != 0,
		isFloor: !!aMaterialSettingsSlotXY3,
		isFloorWater: !!aPos && aPos.name == "aWaterPosition_Depth",
		isAnimated: !!uBoneTransforms,
		isUi: !!aVertexPosition2D,
		isUiScaler: isUiScaler,
		isUiGameCopy: !!uSrcUVRegion,
		isParticles: !!aParticleSize,
		isLighted,
		isShadowRender,
		isTinted,
		isMainMesh: isLighted && !aVertexPosition2D && !aParticleSize,

		raw: prog,
		fragdefines,
		vertdefines,
		flags: {
			vertexcolor: fragdefines.includes("VERTEX_COLOUR"),
			texalpha: fragdefines.includes("TEXTURE_ALPHA_USAGE"),
			alpha: fragdefines.includes("ALPHA_ENABLED"),
			forceOpaque: fragdefines.includes("FORCE_OPAQUE"),
			albedoTexture: !!aTexUV,
			//TODO rt7 materials
			metalTexture: false,
			roughnessTexture: false
		}
	}
}

export function getRenderFunc(json: patchrs.RenderInvocation) {
	var program = getProgramMeta(json.program);
	var uniforms = decodeUniformBuffer(json.uniformState, program)

	var ntriangles = 0;
	for (let a = 0; a < json.renderRanges.length; a++) {
		if (json.renderMode == "triangles") { ntriangles += json.renderRanges[a].length / 3; }
		else { ntriangles += json.renderRanges[a].length - 2; }
	}
	var indices = new Uint32Array(ntriangles * 3);
	var nvertices = json.vertexArray.attributes[0].buffer.byteLength / json.vertexArray.attributes[0].stride;

	if (!json.vertexArray.indexBuffer || json.vertexArray.indexBuffer.byteLength == 0) {
		var id = 0;
		var offset = 0;
		//TODO don't know length in this mode, currently not working
		for (let a = 0; a < json.renderRanges.length; a++) {
			for (let b = 0; b < json.renderRanges[a].length;) {
				if (json.renderMode == "strips" && b != 0) { id -= 2; b -= 2; }
				indices[offset++] = id++;
				indices[offset++] = id++;
				indices[offset++] = id++;
				b += 3;
			}
		}
	}
	else {
		//convert and normalize vertex attributes
		var buf = json.vertexArray.indexBuffer;
		var indextype = vartypes[json.indexType as keyof typeof vartypes];
		var bufview = new indextype.constr!(buf.buffer, buf.byteOffset, buf.byteLength / indextype.size);
		var indexsize = indextype.size;
		var c = 0;
		for (let a = 0; a < json.renderRanges.length; a++) {
			let b = 0;
			let ptr = json.renderRanges[a].start / indexsize;
			while (b < json.renderRanges[a].length) {
				if (json.renderMode == "strips" && b != 0) { b -= 2; }
				indices[c++] = bufview[ptr + b++];
				indices[c++] = bufview[ptr + b++];
				indices[c++] = bufview[ptr + b++];
			}
		}
	}

	var getters: { [varname: string]: (i: number, vi: number) => number } = {};
	for (var a in program.raw.inputs) {
		var proginp = program.raw.inputs[a];
		var inp = json.vertexArray.attributes[proginp.location];
		if (inp) {
			// TODO this would be way more efficient with getAttributeView
			let buf = new DataView(inp.buffer.buffer, inp.buffer.byteOffset, inp.buffer.byteLength);
			var type = vartypes[inp.scalartype as keyof typeof vartypes];
			getters[proginp.name] = (function (inp: patchrs.RenderInput, buf: DataView, type: vartypeMeta) {
				return function (i: number, vi: number) {
					if (vi < inp.vectorlength) { return buf[type.readfn](inp.offset + i * inp.stride + vi * type.size, true); }
					return (vi == 3 ? 1 : 1);
				}
			})(inp, buf, type);
		} else {
			getters[proginp.name] = () => 0;
		}
	}

	var keyframes = [{ time: 0, uniforms }];

	var utexatlasmeta = program.raw.uniforms.find(u => u.name == "uTextureAtlasSettings");
	var utexatlas = program.raw.uniforms.find(u => u.name == "uTextureAtlas");

	var texture: { atlas: patchrs.TextureSnapshot, atlasmeta: patchrs.TextureSnapshot } | null = null;
	if (utexatlasmeta && utexatlas) {
		let atlas = json.samplers[uniforms[utexatlas.name][0][0]];
		let atlasmeta = json.samplers[uniforms[utexatlasmeta.name][0][0]];

		if (atlas && atlasmeta) {
			texture = { atlas, atlasmeta };
		}
	}

	return { uniforms, nvertices, raw: json, indices, getters, progmeta: program, keyframes, texture };
}

export function decodeUniformBuffer(snap: Uint8Array, program: ProgramMeta) {
	var uniforms: { [name: string]: number[][] } = {};
	for (let uni of program.raw.uniforms) {
		if (!uni.snapshotTracked) { continue; }
		uniforms[uni.name] = getUniformValue(snap, uni);
	}
	return uniforms;
}

export function getUniformValue(snap: Uint8Array, uni: patchrs.GlUniformMeta) {
	var t = vartypes[uni.type.scalarType];
	var v: number[][] = [];
	var unireader = new DataView(snap.buffer, snap.byteOffset, snap.byteLength);
	for (let a = 0; a < uni.length; a++) {
		var sub: number[] = [];
		v.push(sub);
		for (let b = 0; b < uni.type.vectorLength; b++) {
			sub.push(unireader[t.readfn](uni.snapshotOffset + uni.type.vectorLength * uni.type.scalarSize * a + uni.type.scalarSize * b, true));
		}
	}
	return v;
}
var cachedSpriteRenderContext = null as null | {
	canvas: HTMLCanvasElement,
	gl: WebGL2RenderingContext,
	uTransform: WebGLUniformLocation,
	aPos: number,
	aCol: number
};

function getAttributeView(attr: patchrs.RenderInput) {
	const type = vartypes[attr.scalartype as keyof typeof vartypes];

	const stride = Math.floor(attr.stride / type.size);
	const len = Math.floor(attr.buffer.byteLength / attr.stride);

	const view = new type.constr!(attr.buffer.buffer, attr.buffer.byteOffset + attr.offset, len * stride - attr.offset);

	return [view, len, stride] as const;
}

export type MeshMeta = {
	vertexcenter: [number, number, number],
	vertexcount: number,
	posbufferhash: number,
	usedbones: number[]
}

export function generateMeshMeta(render: patchrs.RenderInvocation, progmeta: ProgramMeta) {
	let posinput = render.vertexArray.attributes[progmeta.aPos!.location];
	let [view, len, stride] = getAttributeView(posinput);

	let hash = new CrcBuilder();
	let sumx = 0, sumy = 0, sumz = 0;
	for (let i = 0; i < len; i++) {
		sumx += view[i * stride + 0];
		sumy += view[i * stride + 1];
		sumz += view[i * stride + 2];

		hash.addUint16(view[i * stride + 0]);
		hash.addUint16(view[i * stride + 1]);
		hash.addUint16(view[i * stride + 2]);
	}

	let boneids: number[] = [];
	if (progmeta.aSkinbones) {
		let boneinput = render.vertexArray.attributes[progmeta.aSkinbones.location];
		let [boneview, bonelen, bonestride] = getAttributeView(boneinput);
		let boneset = new Set<number>();
		for (let i = 0; i < bonelen; i++) {
			boneset.add(boneview[i * bonestride + 0]);
			boneset.add(boneview[i * bonestride + 1]);
			boneset.add(boneview[i * bonestride + 2]);
			boneset.add(boneview[i * bonestride + 3]);
		}
		boneids = [...boneset];
	} else if (progmeta.aBones) {
		if (posinput.vectorlength != 4) { throw new Error("expecting bone to be packed in lo(pos[3])"); }
		let boneset = new Set<number>();
		for (let i = 0; i < len; i++) {
			boneset.add(view[i * stride + 3] % 256);
		}
		boneids = [...boneset];
	}

	let r: MeshMeta = {
		vertexcount: len,
		vertexcenter: [sumx / len, sumy / len, sumz / len],
		posbufferhash: hash.get(),
		usedbones: boneids
	};
	return r;
}

export type MeshSprite = {
	img: ImageData,
	gpuimg: ImageBitmap,
	imgspace: Matrix3
}

export async function renderToSprite(renders: RenderFunc[], pxperunit: number, camera: "topdown" | "front" | "side" = "topdown") {
	const stride = 6;
	let meshes: { indices: Uint32Array, buf: Float32Array }[] = [];
	let max = [-Infinity, -Infinity, -Infinity];
	let min = [Infinity, Infinity, Infinity];
	for (let render of renders) {
		let buf = new Float32Array(stride * render.nvertices);
		let colget = (render.progmeta.aColor ? render.getters[render.progmeta.aColor.name] : ((i: number, vi: number) => vi == 3 ? 255 : 128));
		let posget = render.getters[render.progmeta.aPos!.name];//TODO could be null
		for (let a = 0; a < render.nvertices; a++) {
			let base = a * stride;
			buf[base + 0] = posget(a, 0);
			buf[base + 1] = posget(a, 1);
			buf[base + 2] = posget(a, 2);
			buf[base + 3] = colget(a, 0) / 255;
			buf[base + 4] = colget(a, 1) / 255;
			buf[base + 5] = colget(a, 2) / 255;

			max[0] = Math.max(max[0], buf[base + 0]);
			max[1] = Math.max(max[1], buf[base + 1]);
			max[2] = Math.max(max[2], buf[base + 2]);

			min[0] = Math.min(min[0], buf[base + 0]);
			min[1] = Math.min(min[1], buf[base + 1]);
			min[2] = Math.min(min[2], buf[base + 2]);
		}
		let indices = render.indices;
		meshes.push({ buf, indices });
	}

	let dx = Math.floor(min[0] * pxperunit);
	let dy = Math.floor(min[2] * pxperunit);
	let xsize = Math.ceil(Math.max(2, (max[0] - min[0]) * pxperunit));
	let ysize = Math.ceil(Math.max(2, (max[1] - min[1]) * pxperunit));
	let zsize = Math.ceil(Math.max(2, (max[2] - min[2]) * pxperunit));


	if (!cachedSpriteRenderContext) {
		let canvas = document.createElement("canvas");
		let gl = canvas.getContext("webgl2")!;

		let frag = gl.createShader(gl.FRAGMENT_SHADER)!;
		gl.shaderSource(frag, spriteShaderFragment);
		gl.compileShader(frag);
		let errfrag = gl.getShaderInfoLog(frag);
		if (errfrag) { throw new Error(errfrag); }
		let vert = gl.createShader(gl.VERTEX_SHADER)!;
		gl.shaderSource(vert, spriteShaderVertex);
		gl.compileShader(vert);
		let errvert = gl.getShaderInfoLog(vert);
		if (errvert) { throw new Error(errvert); }

		let shaderProgram = gl.createProgram()!;
		gl.attachShader(shaderProgram, vert);
		gl.attachShader(shaderProgram, frag);
		gl.linkProgram(shaderProgram);
		gl.useProgram(shaderProgram);

		let aPos = gl.getAttribLocation(shaderProgram, "aPos");
		let aCol = gl.getAttribLocation(shaderProgram, "aCol");

		let uTransform = gl.getUniformLocation(shaderProgram, "uTransform")!;

		gl.enableVertexAttribArray(aPos);
		gl.enableVertexAttribArray(aCol);

		cachedSpriteRenderContext = { gl, canvas, uTransform, aPos, aCol };
	}
	let { canvas, gl, uTransform, aPos, aCol } = cachedSpriteRenderContext;


	let depthscale = 1 / Math.max(max[1], -min[1]);
	let modeltoviewx = pxperunit / xsize * 2;
	let modeltoviewy = pxperunit / ysize * 2;
	let modeltoviewz = pxperunit / zsize * 2;
	let view: Float32Array;
	let width: number;
	let height: number;
	if (camera == "topdown") {
		view = Float32Array.from([
			modeltoviewx, 0, 0, -min[0] * modeltoviewx - 1,
			0, 0, modeltoviewz, -min[2] * modeltoviewz - 1,
			0, -depthscale, 0, 0,
			0, 0, 0, 1
		]);
		width = xsize;
		height = zsize;
	} else if (camera == "front") {
		view = Float32Array.from([
			modeltoviewx, 0, 0, -min[0] * modeltoviewx - 1,
			0, -modeltoviewy, 0, max[1] * modeltoviewy - 1,
			0, 0, depthscale, 0,
			0, 0, 0, 1
		]);
		width = xsize;
		height = ysize;
	} else if (camera == "side") {
		view = Float32Array.from([
			0, 0, -modeltoviewz, max[2] * modeltoviewz - 1,
			0, -modeltoviewy, 0, max[1] * modeltoviewy - 1,
			modeltoviewx, 0, 0, -min[0] * modeltoviewx - 1,
			0, 0, 0, 1
		]);
		width = zsize;
		height = ysize;
	} else {
		throw new Error("unknown camera");
	}

	gl.uniformMatrix4fv(uTransform, true, view);

	canvas.width = width;
	canvas.height = height;
	gl.viewport(0, 0, width, height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LESS);
	gl.disable(gl.CULL_FACE);
	gl.depthRange(-1000, 1000);

	for (let mesh of meshes) {
		let index = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
		let attr = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, attr);
		gl.bufferData(gl.ARRAY_BUFFER, mesh.buf, gl.STATIC_DRAW);

		gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride * mesh.buf.BYTES_PER_ELEMENT, 0);
		gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, stride * mesh.buf.BYTES_PER_ELEMENT, 3 * mesh.buf.BYTES_PER_ELEMENT);

		gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_INT, 0);

		gl.deleteBuffer(attr);
		gl.deleteBuffer(index);
	}

	//This also works but gives flipped image
	let img = new ImageData(canvas.width, canvas.height)
	gl.readPixels(0, 0, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, img.data, 0);
	let gpuimg = await createImageBitmap(canvas, { imageOrientation: "flipY" });//wait why is this flipped once more?
	// let imgspace = mat3.create();
	// mat3.scale(imgspace, imgspace, [1 / pxperunit, 1 / pxperunit]);
	// mat3.translate(imgspace, imgspace, [dx, dy]);
	let imgspace = new Matrix3()
		.translate(dx, dy)
		.scale(1 / pxperunit, 1 / pxperunit);
	//img.show();

	// let cnv2d = document.createElement("canvas");
	// cnv2d.width = width;
	// cnv2d.height = height;
	// let ctx2d = cnv2d.getContext("2d");
	// ctx2d.drawImage(canvas, 0, 0);
	// let img = ctx2d.getImageData(0, 0, width, height);
	// let gpuimg = await createImageBitmap(img);
	// let imgspace = mat3.create();
	// mat3.scale(imgspace, imgspace, [1 / pxperunit, 1 / pxperunit]);
	// mat3.translate(imgspace, imgspace, [dx, dy]);
	// mat3.scale(imgspace, imgspace, [1, -1]);
	// mat3.translate(imgspace, imgspace, [0, -height]);

	let r: MeshSprite = { imgspace, gpuimg, img };
	return r;
}
