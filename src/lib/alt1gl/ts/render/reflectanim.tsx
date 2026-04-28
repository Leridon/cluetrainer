import * as patchrs from "../util/patchrs_napi";
import { getUniformValue, getProgramMeta, ProgramMeta } from "./renderprogram";
import { CharacterRef, FilteredWorldMesh } from "../programs/filteredstate";

export type RecordAnimResult = {
	mesh: FilteredWorldMesh | null,
	boneids: number[],
	buf: AnimBuffer | null
}[];

export function compareAnimData(nullsamples: (number[] | undefined)[], data: (number[] | undefined)[]) {
	let channelcount = 0;
	let res = Math.sqrt(data.reduce((a, sample, i) => {
		let nullsample = nullsamples[i];
		if (!sample || !nullsample) { return a; }
		channelcount += sample.length;
		return sample.reduce((a, v, i) => a + Math.abs(nullsample![i] - v) ** 2, a);
	}, 0));
	return res / channelcount;
}

export async function recordAnimdata(chr: CharacterRef, duration: number) {
	let meshes: RecordAnimResult = chr.meshes.map(m => ({
		mesh: m,
		boneids: m?.cached.summary.usedbones ?? [],
		buf: null!
	}))
	for (let m of chr.meshes) {
		meshes.push();
	}
	let flag = patchrs.getVertexFlag();
	try {
		meshes.forEach(q => q.mesh && (q.mesh.varray.skipmask |= flag));
		let renders = await patchrs.native.recordRenderCalls({
			maxframes: 1000,
			timeout: duration,
			useVerticesMask: flag,
			features: ["uniforms", "vertexarray"]
		});

		let startime = renders[0].lastFrameTime;
		let endtime = renders[renders.length - 1].lastFrameTime;
		let framecount = renders[renders.length - 1].framenr - renders[0].framenr + 1;
		for (let render of renders) {
			let progmeta = getProgramMeta(render.program);
			let mesh = meshes.find(q => q.mesh?.varray == render.vertexArray.base);
			if (!mesh) { continue; }
			if (!progmeta.uBones) { continue; }
			if (progmeta.uTint) { continue; }
			if (!mesh.buf && mesh.mesh) {
				mesh.buf = new AnimBuffer(progmeta, mesh.mesh.cached.summary.usedbones, framecount, false);
			}

			mesh.buf!.addFrame(render);
		}
		return { meshes, startime, endtime };
	} finally {
		meshes.forEach(q => q.mesh && (q.mesh.varray.skipmask &= ~flag));
		patchrs.returnVertexFlags(flag);
	}
}

export class AnimBuffer {
	//bones[times[channels[]]]
	data: Float32Array;
	timestamps: Float32Array;
	headindex = 0;
	tailindex = 0;
	capacity: number;
	channelcount = 3;//xyz
	windowDuration = 0;
	progmeta: ProgramMeta;
	boneids: number[];
	isring: boolean;
	constructor(progmeta: ProgramMeta, boneids: number[], capacity: number, isring: boolean) {
		this.isring = isring;
		this.capacity = capacity;
		this.progmeta = progmeta;
		this.boneids = boneids;
		this.data = new Float32Array(boneids.length * this.capacity * this.channelcount);
		this.timestamps = new Float32Array(this.capacity);
	}

	addFrame(render: patchrs.RenderInvocation) {
		// if (this.headindex != this.tailindex && this.timestamps[this.headindex] == render.lastFrameTime) { return; }
		if (this.isring) {
			if (this.windowDuration > 0) {
				while (true) {
					let tailtime = this.timestamps[this.tailindex];
					if (tailtime < render.lastFrameTime - this.windowDuration && this.tailindex != this.headindex) {
						this.tailindex++;
					} else {
						break;
					}
				}
			}
		}

		let bonevalues = getUniformValue(render.uniformState, this.progmeta.uBones!);
		const channelstride = this.capacity * this.channelcount;
		const indexoffset = (this.headindex % this.capacity) * this.channelcount;
		for (let i = 0; i < this.boneids.length; i++) {
			let boneid = this.boneids[i];
			this.data[i * channelstride + indexoffset + 0] = bonevalues[boneid * 3 + 2][1];
			this.data[i * channelstride + indexoffset + 1] = bonevalues[boneid * 3 + 2][2];
			this.data[i * channelstride + indexoffset + 2] = bonevalues[boneid * 3 + 2][3];
		}
		this.timestamps[this.headindex % this.capacity] = render.lastFrameTime;
		this.headindex++;

		if (this.headindex > this.tailindex + this.capacity) {
			if (this.windowDuration == 0) {
				this.tailindex = this.headindex - this.capacity;
			} else {
				throw new Error("ring buffer overflow");
			}
		}
	}

	findSample(targettime: number) {
		let index0 = this.headindex - 1;
		let index1 = index0;
		let weight0 = 1;
		let time = this.timestamps[index0 % this.capacity];
		while (index0 > this.tailindex) {
			let prevtime = time;
			time = this.timestamps[index0 % this.capacity];
			if (time <= targettime) {
				//interpolate, probably overkill
				weight0 = (prevtime == time ? 1 : (targettime - time) / (prevtime - time));
				break;
			}
			index1 = index0;
			index0--;
		}
		let weight1 = 1 - weight0;
		return {
			time,
			offset0: index0 % this.capacity,
			offset1: index1 % this.capacity,
			//TODO re-enable interpolation or remove completely
			weight0: 1,
			weight1: 0
		};
	}

	sample(attime: number, dt: number, nframes: number) {
		let samples: ReturnType<AnimBuffer["findSample"]>[] = [];
		for (let fr = 0; fr < nframes; fr++) {
			samples.push(this.findSample(attime - dt * fr))
		}

		let res: number[] = [];
		for (let i = 0; i < this.boneids.length; i++) {
			let channeloffset = i * this.capacity * this.channelcount
			for (let sample of samples) {
				let head0 = channeloffset + sample.offset0 * this.channelcount;
				let head1 = channeloffset + sample.offset1 * this.channelcount;
				let x = this.data[head0 + 0] * sample.weight0 + this.data[head1 + 0] * sample.weight1;
				let y = this.data[head0 + 1] * sample.weight0 + this.data[head1 + 1] * sample.weight1;
				let z = this.data[head0 + 2] * sample.weight0 + this.data[head1 + 2] * sample.weight1;
				res.push(x, y, z);
			}
		}

		return res;
	}

	renderRawCnvPath(ctx: CanvasRenderingContext2D, boneindex: number, channel: number, offsetx: number, offsety: number, scalex: number, scaley: number) {
		const stride = this.capacity * this.channelcount;
		const baseindex = stride * boneindex;

		ctx.beginPath();
		for (let fr = this.tailindex; fr < this.headindex; fr++) {
			let froffset = fr % this.capacity;
			let time = this.timestamps[froffset];
			let value = this.data[baseindex + this.channelcount * froffset + channel];
			if (fr == this.tailindex) {
				ctx.moveTo((time - offsetx) * scalex, (value - offsety) * scaley);
			} else {
				ctx.lineTo((time - offsetx) * scalex, (value - offsety) * scaley);
			}
		}
	}
}
