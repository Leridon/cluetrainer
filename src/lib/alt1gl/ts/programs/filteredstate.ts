import * as patchrs from "../util/patchrs_napi";
import { KnownBuffer } from "../render/assetcache";
import { WorldMesh, WorldPosition2d, getGameState, tilesize } from "../render/reflect3d";
import { generateMeshMeta, getProgramMeta, getUniformValue, MeshMeta, ProgramMeta } from "../render/renderprogram";
import { Matrix4 } from "three";
import { numbermat4x4, timedRetryCb, TypedEmitter, fs } from "../util/util";
import { boundMethod } from "autobind-decorator";
import { AnimBuffer, compareAnimData } from "../render/reflectanim";
import * as physics from "./physicsmock";
import { crc32, crc32Interlaced, CrcBuilder } from "../util/crc32";
import { vartypes } from "../render/modelviewer/avautils";

export type CharacterRef = {
	char: physics.Character,
	meshpos: WorldPosition2d,
	prevpos: WorldPosition2d,
	modelMatrix: Matrix4,
	lastmove: number,
	proof: CharacterProof,
	lastupdate: number,
	meshes: (FilteredWorldMesh | null)[],
	lastanim: { time: number, anim: AnimationProof | null }
}

export type FilteredWorldMesh = {
	worldCharacter: CharacterRef | null,
	varray: patchrs.VertexArray,
	program: ProgramMeta,
	cached: MeshCacheEntry,
	lastupdate: number,
	pos: WorldPosition2d,
	modelMatrix: Matrix4,
	dxdt: number,
	dzdt: number,
	animbuffer: AnimBuffer
}
export type AnimationProof = {
	name: string,
	data: (number[] | undefined)[],
	interval: number,
	nsample: number,
	maxdiff: number
}
type CharacterProof = {
	config: () => physics.CharacterConfig,
	known: KnownBuffer,
	animations: AnimationProof[]
}

export type MeshCacheEntry = {
	summary: MeshMeta,
	known: KnownBuffer,
	knownMeshIndex: number,
	vertexPosition: Uint8Array,
	vertexArrays: patchrs.VertexArray[],
	densestIndices: Uint8Array,
	lastuse: number
}

export type ModelHash = {
	id: number,
	sub: number,
	uvshead: number,
	uvsfull: number,
	normalshead: number,
	normalsfull: number,
	poshead: number,
	posfull: number,
	indexpos: { id: number, head: number, full: number, count: number }[],
	verts: number
};

export type NpcData = {
	name: string,
	size: number,
	models: number[]
};



const matchvertices = 20;
const maxfullvertices = 1000;
const uvhashbuff = new Uint16Array(2 * maxfullvertices);
const uvhashbuffbytes = new Uint8Array(uvhashbuff.buffer);

function hashModelUvs(attr: patchrs.RenderInput, startvertex: number, nvertex: number) {
	for (let i = 0; i < nvertex; i++) {
		let offset = attr.offset + attr.stride * (startvertex + i);
		uvhashbuff[i * 2 + 0] = readUint16LE(attr.buffer, offset + 0);
		uvhashbuff[i * 2 + 1] = readUint16LE(attr.buffer, offset + 2);
	}
	return crc32(uvhashbuffbytes, undefined, 0, nvertex * 4);
}

function readUint16LE(buff: Uint8Array, offset: number) {
	return buff[offset] | (buff[offset + 1] << 8);
}

//TODO GC this
export class BufferCache {
	//TODO remove
	player: KnownBuffer = { info: { name: "player", type: "player", rsModelIds: null }, meshdatas: [], sprite: null, spriteProm: null };

	knownPosBufferHashes = new Map<number, KnownBuffer>();
	namedKnownbuffers = new Map<string, KnownBuffer>();
	cachedAttributeBuffers = new WeakMap<Uint8Array, MeshCacheEntry>();
	cachedVertexArrays = new WeakMap<patchrs.VertexArray, MeshCacheEntry>();

	//experimental model lookup from game cache
	fragmentUvHashes = new Map<number, ModelHash[]>();
	fragmentNormalHashes = new Map<number, ModelHash[]>();
	fragmentPosHashes = new Map<number, ModelHash[]>();
	fragmentIndexPosHashes = new Map<number, ModelHash["indexpos"]>();
	modelToNpc = new Map<number, NpcData[]>();

	obsoleteMeshFlag = patchrs.getVertexFlag();
	knownMeshFlag = patchrs.getVertexFlag();

	unknownProgramFlag = patchrs.getProgramFlag();
	uiProgramFlag = patchrs.getProgramFlag();
	objectProgramFlag = patchrs.getProgramFlag();
	highlightProgramFlag = patchrs.getProgramFlag();

	addKnown(known: KnownBuffer) {
		this.namedKnownbuffers.set(known.info.name, known);
		for (let mesh of known.meshdatas) {
			this.knownPosBufferHashes.set(mesh.posbufferhash, known);
		}
	}

	clone() {
		let r = new BufferCache();
		//can grow
		r.knownPosBufferHashes = new Map(this.knownPosBufferHashes);
		r.namedKnownbuffers = new Map(this.namedKnownbuffers);

		//static don't clone
		r.fragmentUvHashes = this.fragmentUvHashes
		r.fragmentNormalHashes = this.fragmentNormalHashes;
		r.fragmentPosHashes = this.fragmentPosHashes;
		r.fragmentIndexPosHashes = this.fragmentIndexPosHashes;
		r.modelToNpc = this.modelToNpc;

		return r;
	}

	async loadFromFiles(dirlevels: string[] = []) {
		let basedir = "./ts/assetcache/";
		let dir = `${basedir}${dirlevels.reduce((a, v) => a + v + "/", "")}`;
		let files = (!fs ? [] : await fs.readdir(dir, { withFileTypes: true }));
		for (let file of files) {
			if (file.isFile()) {
				let hashfile = file.name.match(/^modelhash.*?\.json$/);
				if (hashfile) {
					let text = await fs.readFile(`${dir}${file.name}`, "utf-8");
					let data: ModelHash[] = JSON.parse(text);
					for (let entry of data) {
						let uvgroup = this.fragmentUvHashes.get(entry.uvshead);
						if (!uvgroup) {
							uvgroup = [];
							this.fragmentUvHashes.set(entry.uvshead, uvgroup);
						}
						uvgroup.push(entry);

						let normalgroup = this.fragmentNormalHashes.get(entry.normalshead);
						if (!normalgroup) {
							normalgroup = [];
							this.fragmentNormalHashes.set(entry.normalshead, normalgroup);
						}
						normalgroup.push(entry);

						let posgroup = this.fragmentNormalHashes.get(entry.poshead);
						if (!posgroup) {
							posgroup = [];
							this.fragmentPosHashes.set(entry.poshead, posgroup);
						}
						posgroup.push(entry);

						for (let indexpos of entry.indexpos) {
							let posgroup = this.fragmentIndexPosHashes.get(indexpos.head);
							if (!posgroup) {
								posgroup = [];
								this.fragmentIndexPosHashes.set(indexpos.head, posgroup);
							}
							posgroup.push(indexpos);
						}
					}
					console.log(`loaded ${data.length} model fragment hashes`);
				}

				let npcfile = file.name.match(/^npcmodels.*?\.json$/);
				if (npcfile) {
					let text = await fs.readFile(`${dir}${file.name}`, "utf-8");
					let data: NpcData[] = JSON.parse(text);

					for (let npc of data) {
						for (let modelid of npc.models) {
							let group = this.modelToNpc.get(modelid);
							if (!group) {
								group = [];
								this.modelToNpc.set(modelid, group);
							}
							group.push(npc);
						}
					}
				}
			}
		}
	}

	identifyRender(render: patchrs.RenderInvocation, progmeta: ProgramMeta) {
		let vertexObject = render.vertexArray.base;
		let posattr = render.vertexArray.attributes[progmeta.aPos!.location];
		let indexbuffer = render.vertexArray.indexBuffer;

		let attrmatch = this.cachedAttributeBuffers.get(posattr.buffer);
		let varraymatch = this.cachedVertexArrays.get(vertexObject);
		let match = attrmatch || varraymatch;
		if (!match) {
			let inputmeta = generateMeshMeta(render, progmeta);
			let known = this.knownPosBufferHashes.get(inputmeta.posbufferhash);
			if (!known) {
				let modelids = this.identifyVertexPosindex(render, progmeta);
				known = {
					spriteProm: null,
					sprite: null,
					info: { name: "", type: "unknown", rsModelIds: modelids },
					meshdatas: [inputmeta]
				};
				this.knownPosBufferHashes.set(inputmeta.posbufferhash, known);
			}
			//TODO there should be a better way to find which buffer we are
			let subindex = known.meshdatas.findIndex(q => q.posbufferhash == inputmeta.posbufferhash);
			if (subindex == -1) { throw new Error(); }
			match = {
				summary: inputmeta,
				known,
				lastuse: Date.now(),
				vertexArrays: [vertexObject],
				vertexPosition: posattr.buffer,
				densestIndices: indexbuffer,
				knownMeshIndex: subindex
			};
		}
		if (match.densestIndices != indexbuffer && indexbuffer.length > match.densestIndices.length) {
			match.densestIndices = indexbuffer;
		}
		if (!varraymatch) {
			this.cachedVertexArrays.set(vertexObject, match);
			match.vertexArrays.push(vertexObject);
			vertexObject.skipmask |= (match.known.info.name == "" && match.known.info.type == "unknown" ? this.obsoleteMeshFlag : this.knownMeshFlag);
		}
		if (!attrmatch) {
			this.cachedAttributeBuffers.set(posattr.buffer, match);
		}

		return match;
	}


	identifyVertexPosindex(render: patchrs.RenderInvocation, progmeta: ProgramMeta) {
		if (!progmeta.aPos) { return null; }//TODO check pos data type
		let posattr = render.vertexArray.attributes[progmeta.aPos.location];

		if (!progmeta.aTexMetaLookup) { return null; }//TODO check data type
		let matattr = render.vertexArray.attributes[progmeta.aTexMetaLookup.location];

		if (!render.vertexArray.indexBuffer || render.indexType != 0x1403) {//GL_UNSIGNED_SHORT
			return null;
		}
		let indexview = new Uint16Array(render.vertexArray.indexBuffer.buffer, render.vertexArray.indexBuffer.byteOffset, render.vertexArray.indexBuffer.byteLength / 2);

		let modelids: number[] = [];
		let nprims = indexview.length / 3 | 0;

		let nextmatchange = () => {
			for (let i = primindex; i < nprims; i++) {
				let attrindex = indexview[i * 3];
				let id = readUint16LE(matattr.buffer, matattr.offset + matattr.stride * attrindex);
				if (id != matid) {
					matid = id;
					return i;
				}
			}
			return nprims;
		}
		let matid = readUint16LE(matattr.buffer, matattr.offset + matattr.stride * indexview[0]);
		let matend = 0;
		let primindex = 0;
		while (primindex + matchvertices < nprims) {
			if (primindex + matchvertices >= matend) {
				matend = nextmatchange();
			}

			let crcbuilder = new CrcBuilder();
			for (let i = 0; i < matchvertices; i++) {
				for (let j = 0; j < 3; j++) {
					let attrindex = indexview[(primindex + i) * 3 + j];
					let index = posattr.offset + attrindex * posattr.stride;
					crcbuilder.addUint16(readUint16LE(posattr.buffer, index + 0));
					crcbuilder.addUint16(readUint16LE(posattr.buffer, index + 2));
					crcbuilder.addUint16(readUint16LE(posattr.buffer, index + 4));
				}
			}
			let crc = crcbuilder.get();


			let posmatches = this.fragmentIndexPosHashes.get(crc)?.filter(sub => {
				if (primindex + sub.count >= nprims) { return false; }

				let builder2 = new CrcBuilder(crc);
				for (let i = matchvertices; i < sub.count; i++) {
					for (let j = 0; j < 3; j++) {
						let attrindex = indexview[(primindex + i) * 3 + j];
						let index = posattr.offset + attrindex * posattr.stride;
						builder2.addUint16(readUint16LE(posattr.buffer, index + 0));
						builder2.addUint16(readUint16LE(posattr.buffer, index + 2));
						builder2.addUint16(readUint16LE(posattr.buffer, index + 4));
					}
				}
				return sub.full == builder2.get();
			});

			// console.log(posmatches);
			let samesize = posmatches && posmatches.length >= 1 && posmatches.every(q => q.count == posmatches![0].count);
			if (posmatches && samesize) {
				primindex += posmatches[0].count;
				if (posmatches.length == 1) {
					modelids.push(posmatches[0].id);
				}
			} else {
				// if (matend != nprims) {
				// 	console.log("skipped", matend - primindex, "prims");
				// }
				primindex = matend;
			}
		}
		// console.log("result", modelids);
		return modelids;
	}

	identifyVertexObject(render: patchrs.RenderInvocation, cache: BufferCache) {
		let progmeta = getProgramMeta(render.program);

		let modelids: number[] = [];

		let uvattr: patchrs.RenderInput | undefined = progmeta.aTexUV && render.vertexArray.attributes[progmeta.aTexUV.location];
		if (uvattr && uvattr.vectorlength != 2 && uvattr.scalartype != 0x140B) {
			uvattr = undefined;
		}
		let normalattr: patchrs.RenderInput | undefined = progmeta.aVertexNormal_BatchFlags && render.vertexArray.attributes[progmeta.aVertexNormal_BatchFlags.location];
		if (normalattr && normalattr.vectorlength != 4 && normalattr.scalartype != 0x1401) {
			normalattr = undefined;
		}
		let posattr: patchrs.RenderInput | undefined = progmeta.aPos && render.vertexArray.attributes[progmeta.aPos.location];
		if (posattr && posattr.vectorlength != 4 && posattr.scalartype != 0x140B) {
			posattr = undefined;
		}

		let nvertex = 0;
		if (uvattr) { nvertex = Math.ceil((uvattr.buffer.byteLength - uvattr.offset - uvattr.vectorlength * progmeta.aTexUV!.type.scalarSize) / uvattr.stride); }
		if (normalattr) { nvertex = Math.ceil((normalattr.buffer.byteLength - normalattr.offset - normalattr.vectorlength * progmeta.aVertexNormal_BatchFlags!.type.scalarSize) / normalattr.stride); }
		if (nvertex) {
			for (let start = 0; start + matchvertices < nvertex;) {
				let uvmatches: ModelHash[] | undefined = undefined;
				let normalmatches: ModelHash[] | undefined = undefined;
				let posmatches: ModelHash[] | undefined = undefined;

				if (uvattr) {
					let uvheadhash = hashModelUvs(uvattr, start, matchvertices);

					uvmatches = cache.fragmentUvHashes.get(uvheadhash)?.filter(q => {
						if (start + q.verts >= nvertex) { return false; }
						let fullhash = hashModelUvs(uvattr!, start, Math.min(q.verts, maxfullvertices));
						return q.uvsfull == fullhash;
					});
				}

				if (normalattr) {
					let normalheadhash = crc32Interlaced(normalattr.buffer, start * normalattr.stride + normalattr.offset, normalattr.stride, 3, matchvertices);
					normalmatches = cache.fragmentNormalHashes.get(normalheadhash)?.filter(q => {
						if (start + q.verts >= nvertex) { return false; }
						let fullhash = crc32Interlaced(normalattr!.buffer, start * normalattr!.stride + normalattr!.offset, normalattr!.stride, 3, Math.min(q.verts, maxfullvertices));
						return q.normalsfull == fullhash;
					});
				}
				if (posattr) {
					let posheadhash = crc32Interlaced(posattr.buffer, start * posattr.stride + posattr.offset, posattr.stride, 6, matchvertices);
					posmatches = cache.fragmentPosHashes.get(posheadhash)?.filter(q => {
						if (start + q.verts >= nvertex) { return false; }
						let fullhash = crc32Interlaced(posattr!.buffer, start * posattr!.stride + posattr!.offset, posattr!.stride, 6, Math.min(q.verts, maxfullvertices));
						return q.posfull == fullhash;
					});
				}

				let didincr = false;
				if (uvmatches && uvmatches.length == 1) {
					if (!didincr) {
						modelids.push(uvmatches[0].id);
						start += uvmatches[0].verts;
						didincr = true;
					}
				}
				if (normalmatches && normalmatches.length == 1) {
					if (!didincr) {
						modelids.push(normalmatches[0].id);
						start += normalmatches[0].verts;
						didincr = true;
					}
				}
				if (posmatches && posmatches.length == 1) {
					if (!didincr) {
						modelids.push(posmatches[0].id);
						start += posmatches[0].verts;
						didincr = true;
					}
				}

				console.log("uv,norm,pos", uvmatches, normalmatches, posmatches);
				if ((!uvmatches || uvmatches.length == 0) && (!normalmatches || normalmatches.length == 0) && (!posmatches || posmatches.length == 0)) {
					console.log("vertesleft", nvertex - start);
				}


				if (uvmatches && uvmatches.length != 1) {
					// console.log("multiple uvs", uvmatches);
				}
				if (normalmatches && normalmatches.length != 1) {
					// console.log("multiple nor", normalmatches);
				}
				if (!didincr) {
					break;
				}
			}
		}
		console.log(modelids);
		return modelids;
	}

	getMeshData(render: patchrs.RenderInvocation) {
		let progmeta = getProgramMeta(render.program);
		if (progmeta.isUi) {
			progmeta.raw.skipmask |= this.uiProgramFlag;
			return null;
		}
		if ((!progmeta.isMainMesh && !progmeta.isTinted) || !progmeta.uModelMatrix) {
			progmeta.raw.skipmask |= this.unknownProgramFlag;
			return null;
		}
		let meshType: WorldMesh["meshType"] = "mesh";

		if (progmeta.isTinted && progmeta.uTint) {
			let tint = getUniformValue(render.uniformState, progmeta.uTint)[0];
			let occdif = tintDiff(tint, [0, 0, 0, 0.5]);
			let nulldif = tintDiff(tint, [0, 0, 0, 0]);

			render.program.skipmask |= this.highlightProgramFlag;

			if (occdif < 0.2) {
				meshType = "occlusion";
			} else {
				meshType = "highlight";
			}
		}
		let hasBones = !!progmeta.uBones;
		let isFloor = progmeta.isFloor;
		let rotmatrix = getUniformValue(render.uniformState, progmeta.uModelMatrix)[0] as numbermat4x4;
		var x2d = rotmatrix[12] / tilesize;
		var y2d = rotmatrix[13] / tilesize;
		var z2d = rotmatrix[14] / tilesize;

		let yRotation = -Math.atan2(rotmatrix[8], rotmatrix[0]);
		let known = this.identifyRender(render, progmeta);
		// identifyVertexObject(render, cache);
		// identifyVertexPosindex(render, cache);
		let r: WorldMesh = {
			modelMatrix: new Matrix4().fromArray(rotmatrix),
			position2d: { xnew: x2d, ynew: y2d, znew: z2d, yRotation: yRotation },
			hasBones, isFloor, meshType,
			mesh: render.vertexArray.base,
			render,
			progmeta,
			cached: known
		};
		return r;
	}
}


//TODO remove?
function compareBuffers(a: patchrs.RenderInput, b: patchrs.RenderInput) {
	if (a.vectorlength < 3 || b.vectorlength < 3) {
		throw new Error("length 3 aVertexPos attribute expected");
	}
	if (a.buffer.byteLength / a.stride != b.buffer.byteLength / b.stride) {
		return false;
	}
	if (a.scalartype != b.scalartype) {
		return false;
	}
	const type = vartypes[a.scalartype as keyof typeof vartypes];

	const step = 1;
	const stridea = Math.floor(a.stride / type.size) * step;
	const strideb = Math.floor(b.stride / type.size) * step;
	const len = Math.floor(a.buffer.byteLength / a.stride);

	const viewa = new type.constr!(a.buffer.buffer, a.buffer.byteOffset, len * stridea);
	const viewb = new type.constr!(b.buffer.buffer, b.buffer.byteOffset, len * strideb);

	let offseta = a.offset / type.size;
	let offsetb = b.offset / type.size;
	for (let i = 0; i < len; i += step) {
		if (
			viewa[offseta + i * stridea] != viewb[offsetb + i * strideb] ||
			viewa[offseta + i * stridea + 1] != viewb[offsetb + i * strideb + 1] ||
			viewa[offseta + i * stridea + 2] != viewb[offsetb + i * strideb + 2]
		) { return false; }
	}
	return true;
}

function tintDiff(tint: number[], other: number[]) {
	return Math.abs(tint[0] - other[0]) + Math.abs(tint[1] - other[1]) + Math.abs(tint[2] - other[2]) + Math.abs(tint[3] - other[3]);
}

export class FilteredGameState extends TypedEmitter<{ update: void }> {
	cachedBuffers: BufferCache;
	world = new physics.World(0, 0, 0, 0, 0);
	worldTickOffset = 0;
	worldPlayer: physics.Character;
	player: CharacterRef;

	state = new Map<MeshCacheEntry, Set<FilteredWorldMesh>>();
	charstates = new Set<CharacterRef>();

	characterproofs = new WeakMap<KnownBuffer, CharacterProof>();

	lastUpdateTime = 0;
	lastTimestep = 0;
	lastTickTime = 0;
	viewMatrix: Matrix4 | null = null;

	lastreflect: ReturnType<typeof getGameState> | null = null;

	npcsstream: { refcount: number, raw: patchrs.StreamRenderObject, close(): void } | null;

	sparseFilters: patchrs.RecordRenderOptions;

	constructor(cache: BufferCache) {
		super();
		this.cachedBuffers = cache;
		this.sparseFilters = {
			skipVerticesMask: this.cachedBuffers.obsoleteMeshFlag,
			skipProgramMask: this.cachedBuffers.unknownProgramFlag | this.cachedBuffers.uiProgramFlag,
			useProgramMask: this.cachedBuffers.highlightProgramFlag,
		};

		let playerpos: WorldPosition2d = { xnew: 0, ynew: 0, znew: 0, yRotation: 0 };
		this.player = {
			char: this.world.addCharacter(physics.defaultPlayerConfig(), { x: 0, z: 0 }),
			lastmove: 0,
			lastupdate: 0,
			meshes: [],
			proof: null!,
			meshpos: playerpos,
			prevpos: playerpos,
			modelMatrix: new Matrix4(),
			lastanim: { time: 0, anim: null }
		}
		this.worldPlayer = this.player.char;
	}

	async fullCapture(sparse = false) {
		let renders = await patchrs.native.recordRenderCalls({
			features: ["vertexarray", "uniforms"],
			...(sparse ? this.sparseFilters : {})
		});
		let newstate = getGameState(renders, this.cachedBuffers);
		this.lastreflect = newstate;
		this.updateRenders(renders);

		this.emit("update", undefined);
	}

	track(sparse = false) {
		if (!this.npcsstream) {
			let settings: patchrs.RecordRenderOptions = {
				features: ["vertexarray", "uniforms"],
				framecooldown: 300,//50
				...(sparse ? this.sparseFilters : {})
			};
			let raw = patchrs.native.streamRenderCalls(settings, this.updateRenders);
			let res = this.npcsstream = {
				raw,
				refcount: 0,
				close: () => {
					res.refcount--;
					if (res.refcount <= 0) {
						res.raw.close();
						this.npcsstream = null;
					}
				}
			}
		}
		this.npcsstream.refcount++;
		return this.npcsstream;
	}

	isRenderSkipped(render: patchrs.RenderInvocation) {
		let filter = this.sparseFilters;
		let skipvao = (filter.skipVerticesMask != undefined && (render.vertexArray.base.skipmask & filter.skipVerticesMask) != 0);
		let usevao = (filter.useVerticesMask != undefined && (render.vertexArray.base.skipmask & filter.useVerticesMask) != 0);
		let skipprog = (filter.skipProgramMask != undefined && (render.program.skipmask & filter.skipProgramMask) != 0);
		let useprog = (filter.useProgramMask != undefined && (render.program.skipmask & filter.useProgramMask) != 0);
		let skip = skipvao || skipprog;
		let use = usevao || useprog;
		return skip && !use;
	}

	findCharacterInfo(id: number) {
		for (let chr of this.charstates) {
			if (chr.char.id == id) { return chr; }
		}
		return null;
	}

	addCharacterInit(name: string, animations: AnimationProof[], config: () => physics.CharacterConfig) {
		let known = this.cachedBuffers.namedKnownbuffers.get(name);
		if (!known) {
			console.warn("no named buffer with name " + name);
			return;
		}
		this.characterproofs.set(known, { config, known, animations });
	}

	findLoc(nameOrId: number | string, x: number, z: number, maxerror: number) {
		let lowname = (typeof nameOrId == "string" ? nameOrId.toLowerCase() : "");
		for (let chunk of this.world.cachedChunks) {
			for (let meta of chunk.chunkmetas) {
				let id = -1;
				if (typeof nameOrId == "string") {
					let match = Object.entries(meta.locdatas).find(([id, loc]) => loc.name.toLowerCase() == lowname);
					if (match) { id = +match[0]; }
					else { continue; }
				} else {
					id = nameOrId;
				}
				let match = meta.locs.find(q => q.id == id && Math.max(Math.abs(q.x - x), Math.abs(q.z - z)) <= maxerror);
				if (match) {
					return { instance: match, loc: meta.locdatas[id] };
				}
			}
		}
		return null;
	}

	distanceTo(x: number, z: number) {
		return Math.max(Math.abs(this.worldPlayer!.x - x), Math.abs(this.worldPlayer!.z - z));
	}

	@boundMethod
	updateRenders(renders: patchrs.RenderInvocation[]) {
		this.lastreflect = getGameState(renders, this.cachedBuffers);

		console.log("updaterenders", renders.length, renders.filter(q => !this.isRenderSkipped(q)).length);
		let foundview = false;
		for (let render of renders) {
			let mesh = this.cachedBuffers.getMeshData(render);
			if (!mesh) {
				//TODO track how many times we captured a useless call
				continue;
			}
			if (!foundview) {
				let projuni = mesh.progmeta.raw.uniforms.find(q => q.name == "uViewProjMatrix")
				if (projuni) {
					this.viewMatrix = new Matrix4().fromArray(getUniformValue(mesh.render.uniformState, projuni)[0]);
					foundview = true;
				}
			}
			if (render.lastFrameTime > this.lastUpdateTime) {
				this.lastUpdateTime = render.lastFrameTime;
			}
			if (mesh.meshType == "occlusion") {
				if (updateCharRefPos(this.player, mesh, render)) {
					this.playerMoved();
				}
				continue;
			}
			if (mesh.meshType != "mesh") {
				continue;
			}
			if (mesh.cached.known.info.name != "") {
				let group = this.state.get(mesh.cached);
				if (!group) {
					group = new Set();
					this.state.set(mesh.cached, group);
				}
				let time = render.lastFrameTime;
				let closest: FilteredWorldMesh | null = null;
				let best = Infinity;
				for (let prev of group) {
					let dt = time - prev.lastupdate;
					if (dt > 0) {
						let x = prev.pos.xnew + prev.dxdt * dt;
						let z = prev.pos.znew + prev.dzdt * dt;
						let d = Math.hypot(x - mesh.position2d.xnew, z - mesh.position2d.znew);
						if (d < best) {
							best = d;
							closest = prev;
						}
					}
				}
				if (closest) {
					let dt = time - closest.lastupdate;
					closest.dxdt = (mesh.position2d.xnew - closest.pos.xnew) / dt;
					closest.dzdt = (mesh.position2d.znew - closest.pos.znew) / dt;
					closest.pos = mesh.position2d;
					closest.lastupdate = time;
				} else {
					closest = {
						varray: mesh.mesh,
						program: mesh.progmeta,
						cached: mesh.cached,
						pos: mesh.position2d,
						lastupdate: time,
						dxdt: 0,
						dzdt: 0,
						worldCharacter: null,
						animbuffer: new AnimBuffer(mesh.progmeta, mesh.cached.summary.usedbones, 10, true),
						modelMatrix: mesh.modelMatrix
					};
					group.add(closest);
				}
				if (closest.worldCharacter) {
					closest.animbuffer.addFrame(render);
					updateCharRefPos(closest.worldCharacter, mesh, render);
				}
			}
		}

		if (this.lastUpdateTime > this.lastTickTime + 600) {
			this.synchronizeEntities();
		}

		this.emit("update", undefined);
	}

	synchronizeEntities() {
		let time = this.lastUpdateTime;
		for (let [mesh, group] of this.state) {
			for (let obj of group) {
				if (obj.lastupdate != time) {
					if (obj.worldCharacter) {
						obj.worldCharacter.meshes[mesh.knownMeshIndex] = null;
						if (obj.worldCharacter.meshes.every(q => q == null)) {
							this.world.removeCharacter(obj.worldCharacter.char);
							this.charstates.delete(obj.worldCharacter);
							console.log("removed char " + obj.worldCharacter.char.config.name);
						}
						obj.worldCharacter = null;
					}
					group.delete(obj);
					if (group.size == 0) {
						this.state.delete(mesh);
					}
					continue;
				}
				if (!obj.worldCharacter) {
					let proof = this.characterproofs.get(mesh.known);
					if (proof) {
						let pos = obj.pos;
						if (!obj.worldCharacter) {
							for (let chr of this.charstates) {
								if (chr.proof == proof && chr.meshpos.xnew == pos.xnew && chr.meshpos.ynew == pos.ynew && chr.meshpos.znew == pos.znew && chr.meshpos.yRotation == pos.yRotation) {
									obj.worldCharacter = chr;
									chr.meshes[mesh.knownMeshIndex] = obj;
									break;
								}
							}
						}
						if (!obj.worldCharacter) {
							let ref: CharacterRef = {
								char: this.world.addCharacter(proof.config(), { x: 0, z: 0 }),
								prevpos: obj.pos,
								meshpos: obj.pos,
								lastmove: time,
								lastupdate: time,
								proof,
								meshes: mesh.known.meshdatas.map(q => null),
								modelMatrix: obj.modelMatrix,
								lastanim: { time: 0, anim: null }
							};
							ref.meshes[mesh.knownMeshIndex] = obj;
							this.charstates.add(ref);
							console.log("added char " + ref.char.config.name);
							obj.worldCharacter = ref;
						}
					}
				}
			}
		}
		this.lastTickTime = time;
	}

	playerMoved() {
		const subchunksize = 4;
		const minrange = 32;
		const targetsize = minrange * 2 + subchunksize;
		let targetx = Math.floor((this.worldPlayer.x - minrange) / subchunksize) * subchunksize;
		let targety = Math.floor((this.worldPlayer.z - minrange) / subchunksize) * subchunksize;
		if (this.world.xoffset != targetx || this.world.zoffset != targety || this.world.width != targetsize || this.world.height != targetsize) {
			this.world.moveGrid(targetx, targety, targetsize, targetsize);
			this.world.preloadChunks().then(q => this.world.loadFromPreloads());
		}
	}
}

function updateCharRefPos(chr: CharacterRef, mesh: WorldMesh, render: patchrs.RenderInvocation) {
	let offset = chr.char.config.size / 2;
	let time = render.lastFrameTime;
	if (chr.lastupdate == time) {
		return false;
	}

	let nearestx = Math.round(mesh.position2d.xnew - offset);
	let nearestz = Math.round(mesh.position2d.znew - offset);

	let nearestdist1 = Math.hypot(chr.prevpos.xnew - (nearestx + offset), chr.prevpos.znew - (nearestz + offset));
	let nearestdist2 = Math.hypot(chr.meshpos.xnew - (nearestx + offset), chr.meshpos.znew - (nearestz + offset));
	let nearestdist3 = Math.hypot(mesh.position2d.xnew - (nearestx + offset), mesh.position2d.znew - (nearestz + offset));

	let hadcheckpoint = false;
	//standard walk over point
	hadcheckpoint ||= (nearestdist2 < 0.3 && nearestdist2 <= nearestdist1 && nearestdist3 > nearestdist2);
	//come to standstill on top of point
	hadcheckpoint ||= nearestdist3 == 0 && nearestdist2 > 0;
	//teleport or gap in measurements
	hadcheckpoint ||= nearestdist2 > 3;
	//standstill on top of point while char is desynced
	hadcheckpoint ||= nearestdist3 == 0 && chr.char.x != nearestx && chr.char.z != nearestz && chr.lastmove < time - 1000;

	chr.prevpos = chr.meshpos;
	chr.meshpos = mesh.position2d;
	chr.lastupdate = time;
	if (chr.meshpos.xnew != mesh.position2d.xnew || chr.meshpos.znew != mesh.position2d.znew) {
		chr.lastmove = time;
	}

	if (hadcheckpoint) {
		if (chr.char.x != nearestx || chr.char.z != nearestz) {
			chr.char.stepTile({ x: nearestx, z: nearestz });
		}
		for (let _ of chr.char.tick()) { }
	}


	if (chr.proof && chr.proof.animations.length != 0) {
		//TODO standardize this
		let animsettings = chr.proof.animations[0];
		let samples = chr.meshes.map(q => q?.animbuffer.sample(chr.lastupdate, animsettings.interval, animsettings.nsample));

		for (let anim of chr.proof.animations) {
			let d = compareAnimData(anim.data, samples);
			if (d < anim.maxdiff) {
				console.log("triggered anim", anim.name);
				chr.lastanim = {
					time: chr.lastupdate,
					anim: anim
				}
			}
		}
	}

	return hadcheckpoint;
}