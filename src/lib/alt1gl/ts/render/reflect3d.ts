import * as patchrs from "../util/patchrs_napi";
import { getRenderFunc, RenderFunc, ProgramMeta, getUniformValue } from "./renderprogram";
import { KnownBuffer } from "./assetcache";
import { BufferCache, MeshCacheEntry } from "../programs/filteredstate";
import { Matrix4, Vector3 } from "three";
export const tilesize = 512;
export const mapsquaretiles = 64;
export const maprendergrouptiles = 16;

export type GameState = ReturnType<typeof getGameState>;
type FloorData = ReturnType<typeof mapFloorVertices>;

export type WorldPosition2d = {
	xnew: number,
	ynew: number,
	znew: number,
	yRotation: number,
}

type MeshType = "mesh" | "occlusion" | "highlight" | "null";
export type WorldMesh = {
	modelMatrix: Matrix4,
	position2d: WorldPosition2d,
	mesh: patchrs.VertexArray,
	progmeta: ProgramMeta,
	render: patchrs.RenderInvocation
	cached: MeshCacheEntry,
	meshType: MeshType,
	hasBones: boolean,
	isFloor: boolean
}

export type WorldObject = {
	meshes: WorldMesh[],
	typeMatch: KnownBuffer,
	floorData: FloorData | null,
	master: WorldMesh
}

export type MeshGroup = {
	modelmatrix: Matrix4,
	position: WorldPosition2d,
	meshes: WorldMesh[]
}

export function modelToScreen(obj: WorldObject, viewproj: Matrix4) {
	return new Vector3(...obj.typeMatch.meshdatas[0].vertexcenter)
		.applyMatrix4(obj.master.modelMatrix)
		.applyMatrix4(viewproj);
}

export function findFloorPoint(floorrenders: WorldMesh[], x: number, z: number) {
	let tilex = Math.floor(x / tilesize);
	let tilez = Math.floor(z / tilesize);
	let center2dx = (Math.floor(tilex / mapsquaretiles) + 0.5) * mapsquaretiles;
	let center2dz = (Math.floor(tilez / mapsquaretiles) + 0.5) * mapsquaretiles;
	let min = Infinity;
	let best: WorldMesh | null = null;
	for (let render of floorrenders) {
		if (!render.isFloor) { continue; }
		let d = Math.abs(render.position2d.xnew * tilesize - center2dx) + Math.abs(render.position2d.znew * tilesize - center2dz);
		if (d < min) {
			min = d;
			best = render;
		}
	}
	if (!best) { return null; }

	let floor = mapFloorVertices([getRenderFunc(best.render)]);
	let modelx = Math.round(best.position2d.xnew);
	let modelz = Math.round(best.position2d.znew);
	let offsetx = floor.offsetx - modelx;
	let offsetz = floor.offsetz - modelz;
	let y11 = floor.data[(tilex + offsetx) + (tilez + offsetz) * floor.stride];
	let y12 = floor.data[(tilex + offsetx) + (tilez + 1 + offsetz) * floor.stride];
	let y21 = floor.data[(tilex + 1 + offsetx) + (tilez + offsetz) * floor.stride];
	let y22 = floor.data[(tilex + 1 + offsetx) + (tilez + 1 + offsetz) * floor.stride];
	let y = (y11 + y12 + y21 + y22) / 4;
	return { pos: new Vector3((tilex - modelx + 0.5) * tilesize, y, (tilez - modelz + 0.5) * tilesize), model: best };
}

export function mapFloorVertices(renders: RenderFunc[]) {
	const stride = mapsquaretiles + 1;
	const offsetx = mapsquaretiles / 2 + 1;
	const offsetz = mapsquaretiles / 2 + 1;

	//only do first mesh, this should be the bottom one because of pre-ordering
	let render = renders[0];
	let data = new Float32Array(stride * stride);
	for (let a = 0; a < data.length; a++) { data[a] = -1; }
	let posget = render.getters[render.progmeta.aPos!.name];
	for (let a = 0; a < render.indices.length; a++) {
		let i = render.indices[a];
		let x = posget(i, 0);
		let y = posget(i, 1);
		let z = posget(i, 2);
		let xindex = (x - 1) / tilesize + offsetx;
		let zindex = (z - 1) / tilesize + offsetz;

		if (xindex % 1 == 0 || zindex % 1 == 0) {
			data[xindex + stride * zindex] = y;
		}
	}
	return { stride, offsetx, offsetz, data };
}

export function parseGameState(renders: patchrs.RenderInvocation[], cache: BufferCache) {
	return renders.map(q => cache.getMeshData(q)).filter(q => !!q);
}

export function parseGameStateStructure(renders: patchrs.RenderInvocation[], cache: BufferCache) {
	let meshgroups: MeshGroup[] = [];
	let allmeshes: WorldMesh[] = [];

	for (let render of renders) {
		let mesh = cache.getMeshData(render);
		if (!mesh) { continue; }
		allmeshes.push(mesh);
		let pos = mesh.modelMatrix;

		let group = meshgroups.find(q => q.modelmatrix.equals(pos));
		if (!group) {
			group = {
				modelmatrix: pos,
				meshes: [],
				position: mesh.position2d
			}
			meshgroups.push(group);
		}
		group.meshes.push(mesh);
	}
	return { meshgroups, allmeshes };
}

export function getGameState(renders: patchrs.RenderInvocation[], cache: BufferCache) {
	let { meshgroups, allmeshes } = parseGameStateStructure(renders, cache);
	let playergroup: WorldObject | null = null;
	let highlightgroup: WorldObject | null = null;
	let objects: WorldObject[] = [];
	let viewProjectionMatrix: Matrix4 | null = null;

	for (let group of meshgroups) {
		let unexplained = new Set(group.meshes);

		for (let mesh of group.meshes) {
			if (mesh.meshType == "occlusion") {
				if (!playergroup) {
					playergroup = { master: mesh, meshes: [], floorData: null, typeMatch: cache.player };
					objects.push(playergroup);
				}

				for (let m of unexplained) {
					if (m.render.vertexObjectId == mesh.render.vertexObjectId) {
						playergroup.meshes.push(m);
						unexplained.delete(m);
					}
				}
				playergroup.meshes.push(mesh);
				unexplained.delete(mesh);
			} else if (mesh.meshType == "highlight") {
				// if (!highlightgroup) {
				// 	highlightgroup = { master: mesh, meshes: [], floorData: null, typeMatch:null! };
				// 	objects.push(highlightgroup);
				// }

				// highlightgroup.meshes.push(mesh);
				unexplained.delete(mesh);
			}

			if (!viewProjectionMatrix) {
				let projuni = mesh.progmeta.raw.uniforms.find(q => q.name == "uViewProjMatrix")
				if (projuni) {
					viewProjectionMatrix = new Matrix4().fromArray(getUniformValue(mesh.render.uniformState, projuni)[0]);
				}
			}
		}

		// //try to identify npcs directly from the mesh geometry and the model database
		// let modeluses = new Set<number>();
		// for (let mesh of unexplained) {
		// 	let modelids = mesh.known.info.rsModelIds;
		// 	if (modelids) {
		// 		for (let id of modelids) {
		// 			modeluses.add(id);
		// 		}
		// 	}
		// }
		// while (true) {
		// 	let possiblenpcs = new Map<NpcData, number>();
		// 	for (let key of modeluses) {
		// 		let npcs = cache.modelToNpc.get(key);
		// 		if (npcs) {
		// 			for (let npc of npcs) {
		// 				possiblenpcs.set(npc, (possiblenpcs.get(npc) ?? 0) + 1);
		// 			}
		// 		}
		// 	}
		// 	let winner: [NpcData, number] | null = null;;
		// 	for (let pos of possiblenpcs.entries()) {
		// 		if (!winner || pos[1] > winner[1]) {
		// 			winner = pos;
		// 		}
		// 	}
		// 	if (winner) {
		// 		let npcobj = winner[0];
		// 		for (let modelid of npcobj.models) {
		// 			modeluses.delete(modelid);
		// 		}
		// 		let meshes: WorldMesh[] = [];
		// 		for (let mesh of unexplained) {
		// 			if (mesh.known.info.rsModelIds) {
		// 				for (let id of mesh.known.info.rsModelIds) {
		// 					if (npcobj.models.includes(id)) {
		// 						unexplained.delete(mesh);
		// 						meshes.push(mesh);
		// 						mesh.known.info.name = `npc-${npcobj.name}`;
		// 						break;
		// 					}
		// 				}
		// 			}
		// 		}
		// 		let obj: WorldObject = {
		// 			master: meshes[0],
		// 			meshes,
		// 			typeMatch: meshes[0].known,
		// 			floorData: null
		// 		};
		// 		objects.push(obj);
		// 		npcs.push({
		// 			npc: npcobj,
		// 			object: obj,
		// 			position: group.position
		// 		});
		// 	} else {
		// 		break;
		// 	}
		// }
		for (let mesh of unexplained) {
			if (mesh.progmeta.isMainMesh) {
				objects.push({ master: mesh, meshes: [mesh], floorData: null, typeMatch: mesh.cached.known });
			}
		}
	}

	objects.sort((a, b) => {
		if (a.master.isFloor && !b.master.isFloor) { return -1; }
		if (b.master.isFloor && !a.master.isFloor) { return 1; }
		if (a.master.isFloor && b.master.isFloor) {
			let aimg = a.typeMatch.sprite?.img;
			let bimg = b.typeMatch.sprite?.img;
			return (bimg ? bimg.width * bimg.height : 0) - (aimg ? aimg.width * aimg.height : 0);
		}
		return b.master.position2d.ynew - b.master.position2d.ynew;
	});

	let r = { playergroup, highlightgroup, objects, viewProjectionMatrix, groups: meshgroups, allmeshes };
	return r;
}
