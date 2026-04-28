import { RenderRect } from "../reflect2d/reflect2d";


import "./reflect3d.scss";
import { TextureSnapshot } from "../util/alt1gltypes";
import { ReffingMap } from "../util/disposehelpers";

type GameUIRenderState = {
	playing: boolean,
	showBorders: boolean,
	pxperuipx: number,
	selectedElement: RenderRect | null,
	mode: "ui" | "tex",
	filterStartindex: number,
	filterEndIndex: number
}


export class UIRenderTextureCache {
	cache = new ReffingMap<TextureSnapshot, HTMLCanvasElement>();

	getTexture(snap: TextureSnapshot) {
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

	[Symbol.dispose]() {
		this.cache[Symbol.dispose]();
	}
}