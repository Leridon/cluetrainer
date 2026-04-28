import * as patchrs from "../util/patchrs_napi";
import { MeshMeta, MeshSprite } from "./renderprogram";
import * as a1lib from "alt1";
import { Matrix3 } from "three";
import { AsyncReturnType, bufferToBase64, fs, numbermat3x3 } from "../util/util";

const cacheDir = "./rundata/buffercache/";

export type KnownBuffer = {
	meshdatas: MeshMeta[],
	info: {
		type: string,
		name: string,
		rsModelIds: number[] | null
	},
	sprite: MeshSprite | null,
	spriteProm: Promise<MeshSprite> | null
}

type KnownBufferJson = AsyncReturnType<typeof packKnownBuffer>;

export async function packKnownBuffer(buf: KnownBuffer) {
	return {
		inputs: buf.meshdatas,
		info: buf.info,
		sprite: buf.sprite && {
			imgspace: buf.sprite.imgspace.elements,
			src: bufferToBase64(await buf.sprite.img.toFileBytes("image/png"))
		}
	}
}
export async function unpackKnownBuffer(buf: KnownBufferJson) {
	let inputs = buf.inputs;
	let r: KnownBuffer = {
		meshdatas: inputs,
		info: buf.info,
		sprite: null,
		spriteProm: null
	};
	if (buf.sprite) {
		r.spriteProm = a1lib.ImageDetect.imageDataFromBase64(buf.sprite.src).then(async img => {
			let sprite: MeshSprite = {
				img,
				gpuimg: await createImageBitmap(img),
				imgspace: new Matrix3().fromArray(buf.sprite!.imgspace as numbermat3x3)
			};
			r.sprite = sprite;
			return sprite;
		});
	}
	return r;
}

export async function saveKnowBuffer(buf: KnownBuffer) {
	await fs.mkdir(cacheDir, { recursive: true });
	return fs.writeFile(`${cacheDir}${buf.info.name}.mesh.json`, JSON.stringify(await packKnownBuffer(buf), undefined, "\t"));
}

export async function saveAllBuffers(knownBuffers: Map<patchrs.RenderInput, KnownBuffer>) {
	for (let entry of knownBuffers.entries()) {
		await saveKnowBuffer(entry[1]);
	}
}

export async function loadAllBuffers() {
	let knownBuffers: KnownBuffer[] = [];
	if (fs) {
		await fs.mkdir(cacheDir, { recursive: true });
		let files = await fs.readdir(cacheDir);

		for (let file of files) {
			if (file.match(/\.mesh\.json$/)) {
				let data = await fs.readFile(`${cacheDir}${file}`, "utf8");
				let obj = JSON.parse(data);
				let info = await unpackKnownBuffer(obj);
				knownBuffers.push(info);
			}
		}
	}
	return knownBuffers;
}

