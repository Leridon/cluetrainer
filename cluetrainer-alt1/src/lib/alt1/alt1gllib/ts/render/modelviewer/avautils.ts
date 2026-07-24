import { mat4 } from "gl-matrix";

export type Submodel = {
	vertexData: { indices: Uint16Array, buffer: ArrayBufferView, layout: ModelAttribute[] },
	modeltransform: mat4,
	drawmode: number,
	texture: ImageData,
	boneuniform: Float32Array,
	boneKeyframes: { time: number, offset: number }[],
}

export type ModelAttribute = {
	byteoffset: number,
	bytestride: number
	gltype: vartypeEnum,
	name: string,
	veclength: number,
	normalize: boolean,
	min: number[],
	max: number[]
};

export function modelAttributeGetter(attr: ModelAttribute, buffer: ArrayBuffer) {

	let typemeta = vartypes[attr.gltype];
	let view = new typemeta.constr!(buffer, attr.byteoffset);

	let stridestep = attr.bytestride / typemeta.size;

	return (v: number, vi: number) => {
		return view[v * stridestep + vi];
	}
}

export type vartypeNames = "f32" | "i8" | "i16" | "u8" | "u16" | "i32" | "u32" | "f64" | "f16";
export type vartypeEnum = 0x1400 | 0x1401 | 0x1402 | 0x1403 | 0x1404 | 0x1405 | 0x1406 | 0x140a | 0x140b;
export type vartypeMeta = {
	id: vartypeEnum,
	readfn: string,
	writefn: string,
	size: number,
	typeid: vartypeNames,
	constr: { new(buf: ArrayBufferLike, byteoffset?: number, length?: number): ArrayBufferView } | null,
	webgl: boolean
};
export var vartypes: { [type in vartypeEnum]: vartypeMeta } = {
	0x1400: { id: 0x1400, readfn: "getInt8", writefn: "setInt8", typeid: "i8", size: 1, constr: Int8Array, webgl: true },
	0x1401: { id: 0x1401, readfn: "getUint8", writefn: "setUint8", typeid: "u8", size: 1, constr: Uint8Array, webgl: true },
	0x1402: { id: 0x1402, readfn: "getInt16", writefn: "setInt16", typeid: "i16", size: 2, constr: Int16Array, webgl: true },
	0x1403: { id: 0x1403, readfn: "getUint16", writefn: "setUint16", typeid: "u16", size: 2, constr: Uint16Array, webgl: true },
	0x1404: { id: 0x1404, readfn: "getInt32", writefn: "setInt32", typeid: "i32", size: 4, constr: Int32Array, webgl: false },
	0x1405: { id: 0x1405, readfn: "getUint32", writefn: "setUint32", typeid: "u32", size: 4, constr: Uint32Array, webgl: false },
	0x1406: { id: 0x1406, readfn: "getFloat32", writefn: "setFloat32", typeid: "f32", size: 4, constr: Float32Array, webgl: true },
	0x140a: { id: 0x140a, readfn: "getFloat64", writefn: "setFloat64", typeid: "f64", size: 8, constr: Float64Array, webgl: false },
	0x140b: { id: 0x140b, readfn: "getFloat16", writefn: "setFloat16", typeid: "f16", size: 2, constr: null, webgl: false },//FUCK why
};

export type VertexInput = {
	name: string,
	sources: {
		getter: (i: number, vi: number) => number,
		indices: Uint32Array | Uint16Array,
	}[]
	arrlength: number,
	normalize?: boolean,
	type: vartypeNames
}

export function namedVartype(name: vartypeNames): vartypeMeta {
	for (var a in vartypes) {
		if (vartypes[a].typeid == name) { return vartypes[a as any as keyof typeof vartypes]; }
	}
	throw new Error("var type " + name + " not found");
}

export function buildVertexBuffer(inputs: VertexInput[]) {
	var sorted = inputs.sort((a, b) => namedVartype(a.type).size * b.arrlength - namedVartype(b.type).size * a.arrlength);
	var elemcount = inputs[0].sources.reduce((a, v) => a + v.indices.length, 0);

	//figure out a layout, could still reorder and fill gaps with smaller types
	var layout: ModelAttribute[] = [];
	var byteoffset = 0;
	var inpmap = new Map<ModelAttribute, VertexInput>()
	for (let inp of sorted) {
		var t = namedVartype(inp.type);
		byteoffset = Math.ceil(byteoffset / t.size) * t.size;
		var inpmeta: ModelAttribute = {
			gltype: t.id,
			byteoffset: byteoffset,
			name: inp.name,
			normalize: !!inp.normalize,
			veclength: inp.arrlength,
			bytestride: 0,
			min: [],
			max: [],
		}
		for (let i = 0; i < inp.arrlength; i++) {
			inpmeta.max![i] = -Infinity;
			inpmeta.min![i] = Infinity;
		}
		layout.push(inpmeta);
		inpmap.set(inpmeta, inp);
		byteoffset += t.size * inp.arrlength;
	}

	var inp0 = inpmap.get(layout[0])!.sources;
	var indexmap = new Map<number, Map<number, number>>();
	var indexcount = 0;
	var indices = new Uint16Array(elemcount);
	var entrycount = 0;
	for (let a = 0; a < inp0.length; a++) {
		var src = inp0[a];
		var map = new Map<number, number>();
		indexmap.set(a, map);
		for (let b = 0; b < src.indices.length; b++) {
			let oldindex = src.indices[b];
			if (!map.has(oldindex)) {
				indices[entrycount++] = indexcount;
				map.set(oldindex, indexcount++);
			} else {
				indices[entrycount++] = map.get(oldindex)!;
			}
		}
	}


	//copy data from input arraybuffer
	var stride = Math.ceil(byteoffset / 4) * 4;//always pad to 32bit
	var buffer: ArrayBufferLike = new ArrayBuffer(stride * indexcount);
	for (var meta of layout) {
		meta.bytestride = stride;
		var inp = inpmap.get(meta)!;
		for (let srci = 0; srci < inp.sources.length; srci++) {
			var source = inp.sources[srci];
			var map = indexmap.get(srci)!;
			var t = namedVartype(inp.type);
			var view = new t.constr!(buffer);
			for (let oldindex of map.keys()) {
				var newindex = map.get(oldindex)!;
				for (let b = 0; b < inp.arrlength; b++) {
					let v = source.getter(oldindex, b);
					view[(newindex * stride + meta.byteoffset) / t.size + b] = v;
					meta.max![b] = Math.max(meta.max![b], v);
					meta.min![b] = Math.min(meta.min![b], v);
				}
			}
		}
	}

	return {
		indices,
		buffer: new Uint8Array(buffer),
		stride,
		layout,
		vertexcount: indexcount
	}
}
