import { mat4 } from "gl-matrix";
import { ModelAttribute, Submodel, vartypeEnum, vartypes, buildVertexBuffer, modelAttributeGetter, namedVartype } from "./avautils";
import { ImageDetect } from "alt1/base";

export var magicbytes = [0x12, 0x0B, 0x00, 0xB5];

var chunkTypes = {
	modeltransform: { id: 1 },
	boneuniform: { id: 2 },
	vertexbuffer: { id: 3 },
	vertexindices: { id: 4 },
	drawmode: { id: 5 },
	texture: { id: 6 },
	vertexattribute: { id: 7 },
	bonekeyframes: { id: 8 }
}

function attributeToBuffer(attr: ModelAttribute) {
	const numvars = 6;
	const stroffset = numvars * 4;
	let buf = new ArrayBuffer(stroffset + attr.name.length);
	let view = new Int32Array(buf, 0, numvars);
	view[0] = attr.byteoffset;
	view[1] = attr.bytestride;
	view[2] = attr.gltype;
	view[3] = (attr.normalize ? 1 : 0);
	view[4] = attr.veclength;
	var strview = new Uint8Array(buf, stroffset, attr.name.length);
	for (let a = 0; a < attr.name.length; a++) { strview[a] = attr.name.charCodeAt(a); }
	return new Uint8Array(buf);
}

function bufferToAttribute(buf: Uint8Array) {
	const numvars = 6;
	const stroffset = numvars * 4;
	let view = new Int32Array(buf.buffer, buf.byteOffset, numvars);
	var strview = new Uint8Array(buf.buffer, buf.byteOffset + stroffset, buf.byteLength - stroffset);
	var attr: ModelAttribute = {
		byteoffset: view[0],
		bytestride: view[1],
		gltype: view[2] as vartypeEnum,
		normalize: !!view[3],
		veclength: view[4],
		name: String.fromCharCode.apply(null, strview as any),
		min: new Array(view[4]).fill(0),
		max: new Array(view[4]).fill(0)
	}
	return attr;
}

export function checksum(data: ArrayBuffer) {
	var sum = 0;
	var view = new Uint8Array(data);
	for (var a = 0; a < view.length; a++) {
		sum = sum + view[a] & 0xffffff;
	}
	return sum;
}

function matvecmul4(mat: ArrayLike<number>, vec: ArrayLike<number>) {
	return [
		mat[0] * vec[0] + mat[4] * vec[1] + mat[8] * vec[2] + mat[12] * vec[3],
		mat[1] * vec[0] + mat[5] * vec[1] + mat[9] * vec[2] + mat[13] * vec[3],
		mat[2] * vec[0] + mat[6] * vec[1] + mat[10] * vec[2] + mat[14] * vec[3],
		mat[3] * vec[0] + mat[7] * vec[1] + mat[11] * vec[2] + mat[15] * vec[3]
	];
}

export async function saveToSTL(model: Submodel, headerstr: string) {
	var attrsize = 0;
	var trianglesize = 50 + attrsize;
	var nsurf = model.vertexData.indices.length / 3;
	var data = new ArrayBuffer(80 + 4 + trianglesize * nsurf);
	var view = new DataView(data);
	var encoder = new TextEncoder();
	encoder.encodeInto(headerstr, new Uint8Array(view.buffer, 0, 80));
	var i = 80;
	view.setUint32(i, nsurf, true); i += 4;

	//vertices
	var posattr = model.vertexData.layout.find(v => v.name == "aVertexPosition");
	var boneattr = model.vertexData.layout.find(v => v.name == "aBoneId");
	if (!posattr || !boneattr) { throw new Error("Model has no valid aVertexPosition attribute"); }

	var vertexview = new DataView(model.vertexData.buffer.buffer, model.vertexData.buffer.byteOffset, model.vertexData.buffer.byteLength);
	var posattrtype = vartypes[posattr.gltype];
	var boneattrtype = vartypes[boneattr.gltype];
	var posgetter = (vertex: number, i: number) => vertexview[posattrtype.readfn](posattr!.byteoffset + vertex * posattr!.bytestride + i * posattrtype.size, true);
	var bonegetter = (vertex: number) => vertexview[boneattrtype.readfn](boneattr!.byteoffset + vertex * boneattr!.bytestride, true);
	var boneoffset = (model.boneKeyframes.length == 0 ? 0 : model.boneKeyframes[0].offset);
	for (let a = 0; a < nsurf; a++) {
		//normals - mostly ignored by software, set to 0
		view.setFloat32(i, 0, true); i += 4;
		view.setFloat32(i, 0, true); i += 4;
		view.setFloat32(i, 0, true); i += 4;
		//vertices
		for (let b = 0; b < 3; b++) {
			var vertexid = model.vertexData.indices[a * 3 + b];
			var boneid = bonegetter(vertexid);
			var pos = [posgetter(vertexid, 0), posgetter(vertexid, 1), posgetter(vertexid, 2), 1];
			var matrix = model.boneuniform.slice(boneoffset + 16 * boneid, boneoffset + 16 * boneid + 16);
			var transed = matvecmul4(matrix, pos);
			view.setFloat32(i, transed[0], true); i += 4;
			view.setFloat32(i, transed[1], true); i += 4;
			view.setFloat32(i, transed[2], true); i += 4;
		}
		view.setUint16(i, 0, true); i += 2;
	}
	return data;
}

export async function saveModel(model: Submodel) {
	type FileChunk = {
		buf: ArrayBufferView,
		type: keyof typeof chunkTypes
	}
	var teximgbuffer = model.texture.toFileBytes("image/webp", 0.8);

	var chunks: FileChunk[] = [
		{ type: "drawmode", buf: new Uint32Array([model.drawmode]) },
		{ type: "modeltransform", buf: new Float32Array(model.modeltransform) },
		{ type: "vertexbuffer", buf: new Uint8Array(model.vertexData.buffer.buffer, model.vertexData.buffer.byteLength, model.vertexData.buffer.byteLength) },
		{ type: "vertexindices", buf: model.vertexData.indices },
		{ type: "boneuniform", buf: model.boneuniform },
		{ type: "bonekeyframes", buf: new Int32Array([model.boneKeyframes.length].concat(...model.boneKeyframes.map(q => [q.time, q.offset]))) },
		{ type: "texture", buf: await teximgbuffer },
	];

	for (let attr of model.vertexData.layout) {
		chunks.push({ type: "vertexattribute", buf: attributeToBuffer(attr) })
	}

	const byteallign = 8;
	var size = 8;
	for (let chunk of chunks) { size += Math.ceil(chunk.buf.byteLength / byteallign) * byteallign + 4 + 4 + 4 + 4; }
	var bytes = new Uint8Array(size);
	var view = new DataView(bytes.buffer);

	//header
	var index = 0;
	for (; index < magicbytes.length; index++) { view.setUint8(index, magicbytes[index]); }
	var index = 8;

	for (let chunk of chunks) {
		var chunktype = chunkTypes[chunk.type];
		var allignedlength = Math.ceil(chunk.buf.byteLength / byteallign) * byteallign;
		view.setUint32(index, chunktype.id, true); index += 4;
		view.setUint32(index, chunk.buf.byteLength, true); index += 4;
		view.setUint32(index, allignedlength, true); index += 4;
		index += 4;//reserve 4 bytes/keep allignment
		bytes.set(new Uint8Array(chunk.buf.buffer), index); index += allignedlength;
	}
	return bytes;
}

export function isModelFile(data: Uint8Array) {
	for (var index = 0; index < magicbytes.length; index++) {
		if (data[index] != magicbytes[index]) { return false; }
	}
	return true;
}

export async function loadModel(data: ArrayBuffer) {
	var model: Partial<Submodel> = {};
	//defaults
	model.vertexData = {
		buffer: null!,
		indices: null!,
		layout: [],
	};
	model.boneKeyframes = [{ time: 0, offset: 0 }];
	//read model
	var view = new DataView(data);
	if (!isModelFile(new Uint8Array(data))) { throw new Error("Invalid model file"); }
	var index = 8;
	while (index < data.byteLength) {
		var id = view.getUint32(index, true); index += 4;
		var length = view.getUint32(index, true); index += 4;
		var allignedlength = view.getUint32(index, true); index += 4;
		index += 4;//alligned/reserved
		var type = Object.keys(chunkTypes).find(t => chunkTypes[t].id == id) as keyof typeof chunkTypes;
		if (type == "boneuniform") {
			model.boneuniform = new Float32Array(data, index, length / 4);
		} else if (type == "drawmode") {
			model.drawmode = new Uint32Array(data, index, length / 4)[0];
		} else if (type == "modeltransform") {
			model.modeltransform = mat4.fromValues.apply(null, new Float32Array(data, index, length / 4) as any);
		} else if (type == "texture") {
			var texblob = new Blob([new Uint8Array(data, index, length)], { type: "image/*" });
			var url = URL.createObjectURL(texblob);
			model.texture = await ImageDetect.imageDataFromUrl(url);
			URL.revokeObjectURL(url);
		} else if (type == "vertexbuffer") {
			model.vertexData.buffer = new Uint8Array(data.slice(index, index + length));
		} else if (type == "vertexindices") {
			model.vertexData.indices = new Uint16Array(data, index, length / 2);
		} else if (type == "vertexattribute") {
			model.vertexData.layout.push(bufferToAttribute(new Uint8Array(data, index, length)))
		} else if (type == "bonekeyframes") {
			model.boneKeyframes = [];
			let content = new Int32Array(data, index, length / 4);
			let i = 0;
			let len = content[i++];
			for (let a = 0; a < len; a++) { model.boneKeyframes.push({ time: content[i++], offset: content[i++] }); }
		} else {
			throw new Error("unknown model chunk");
		}
		index += allignedlength;
	}

	return model as Submodel;
}