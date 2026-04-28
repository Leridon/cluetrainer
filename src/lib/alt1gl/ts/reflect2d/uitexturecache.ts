import * as patchrs from "../util/patchrs_napi";

/**
 * Cache for efficiently managing UI texture snapshots.
 * Reuses canvas elements and applies incremental updates when possible.
 */
export class UIRenderTextureCache {
	cache = new Map<patchrs.TextureSnapshot, HTMLCanvasElement>();

	getTexture(snap: patchrs.TextureSnapshot) {
		let cnv = this.cache.get(snap);
		if (!cnv) {
			// try to find a parent snapshot to update from
			for (let [oldsnap, oldcnv] of this.cache) {
				if (snap.isChild(oldsnap)) {
					cnv = oldcnv;
					let ctx = cnv.getContext("2d")!;
					let changesize = 0;
					for (let edit of snap.changesSince(oldsnap)) {
						let imgdata = snap.capture(edit.x, edit.y, edit.width, edit.height);
						ctx.putImageData(imgdata, edit.x, edit.y);
						changesize += edit.width * edit.height;
					}
					this.cache.delete(oldsnap);
					this.cache.set(snap, cnv);
					break;
				}
			}
		}
		if (!cnv) {
			// original capture
			cnv = document.createElement("canvas");
			cnv.width = snap.width;
			cnv.height = snap.height;
			let ctx = cnv.getContext("2d")!;
			let img = snap.capture(0, 0, snap.width, snap.height);
			ctx.putImageData(img, 0, 0);
			this.cache.set(snap, cnv);
		}
		return cnv;
	}

	getSubcache(snap: patchrs.TextureSnapshot) {
		let cnv = this.getTexture(snap);
		let ctx = cnv.getContext("2d")!;
		return new AtlasTextureSnapshotCache(snap, ctx, this);
	}
}

class AtlasTextureSnapshotCache {
	snap: patchrs.TextureSnapshot;
	ctx: CanvasRenderingContext2D;
	cache: UIRenderTextureCache;
	fragments = new Map<number, HTMLCanvasElement>();

	constructor(snap: patchrs.TextureSnapshot, ctx: CanvasRenderingContext2D, cache: UIRenderTextureCache) {
		this.snap = snap;
		this.ctx = ctx;
		this.cache = cache;
	}

	makeFragment(x: number, y: number, width: number, height: number, sprite?: { hash?: number }) {
		let hash = sprite?.hash ?? 0;
		let cnv = this.fragments.get(hash);
		if (!cnv) {
			cnv = document.createElement("canvas");
			cnv.width = width;
			cnv.height = height;
			let ctx = cnv.getContext("2d")!;
			ctx.drawImage(this.cache.getTexture(this.snap), x, y, width, height, 0, 0, width, height);
			this.fragments.set(hash, cnv);
		}
		return cnv;
	}
}
