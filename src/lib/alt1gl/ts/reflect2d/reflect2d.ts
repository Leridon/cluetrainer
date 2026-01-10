import * as patchrs from "../util/patchrs_napi";
import { getProgramMeta, getRenderFunc } from "../render/renderprogram";
import { emptySpriteInfo, imgcrc, KnownSpriteSheet, SpriteCache, SpriteInfo } from "./spritecache";
import { RectLike } from "alt1";
import * as a1lib from "alt1";

export type GameUIState = ReturnType<typeof getUIState>;


export type AtlasSnapshotFragment = {
	x: number,
	y: number,
	width: number,
	height: number,
	pixelhash: number,
	basetex: patchrs.TextureSnapshot,
	known: SpriteInfo | null,
}

export type RenderRect = {
	sprite: AtlasSnapshotFragment,
	x: number,
	y: number,
	width: number,
	height: number,
	samplex: number,
	sampley: number,
	samplewidth: number,
	sampleheight: number,
	m12: number,
	m21: number,
	color: [number, number, number, number]
};

export function rectsHaveOverlap(a: a1lib.RectLike, b: a1lib.RectLike) {
	let overlapx = (a.x >= b.x && a.x < b.x + b.width || b.x >= a.x && b.x < a.x + a.width);
	let overlapy = (a.y >= b.y && a.y < b.y + b.height || b.y >= a.y && b.y < a.y + a.height);
	return overlapx && overlapy;
}

export function rectContainsPoint(rect: a1lib.RectLike, px: number, py: number) {
	return (px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height);
}

export function pointBoxDistance(x1: number, y1: number, x2: number, y2: number) {
	return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

class AtlasTextureSnapshotCache {
	sprites = new Map<number, AtlasSnapshotFragment>();
	fontsheets: { font: KnownSpriteSheet, frag: AtlasSnapshotFragment }[] = [];
	whitesprite: AtlasSnapshotFragment;
	lastChanges: RectLike[] = [];
	snapshot: patchrs.TextureSnapshot;

	constructor(snap: patchrs.TextureSnapshot) {
		this.snapshot = snap;
		this.whitesprite = {
			x: -1, y: -1, height: 1, width: 1,
			pixelhash: 0,
			basetex: snap,
			known: emptySpriteInfo,
		}
	}

	cacheKey(x: number, y: number) {
		return (x << 16) | y;
	}

	adsorbKnowns(old: AtlasTextureSnapshotCache) {
		if (!this.snapshot.isChild(old.snapshot)) {
			return false;
		}
		let edits = this.snapshot.changesSince(old.snapshot);
		this.lastChanges = edits;
		// keep known sprites that do not overlap edits
		for (let [key, val] of old.sprites.entries()) {
			if (!edits.some(edit => rectsHaveOverlap(edit, val))) {
				val.basetex = this.snapshot;
				this.sprites.set(key, val);
			}
		}
		for (let sheet of old.fontsheets) {
			if (!edits.some(edit => rectsHaveOverlap(edit, sheet.frag))) {
				this.fontsheets.push(sheet);
			}
		}
		return true;
	}

	removeFragment(frag: AtlasSnapshotFragment) {
		let oldkey = this.cacheKey(frag.x, frag.y);
		this.sprites.delete(oldkey);
	}

	findFragment(sprites: SpriteCache, x: number, y: number, w: number, h: number) {
		let key = this.cacheKey(x, y);
		// let frag = this.sprites.find(q => q.x == x && q.y == y && q.width == w && q.height == h);
		let frag = this.sprites.get(key);
		if (frag && (frag.width != w || frag.height != h)) {
			console.log("overwrote atlas sprite with different size");
			frag = undefined;
		}
		if (!frag) {
			frag = this.getFragment(sprites, x, y, w, h, null)!;
		}
		return frag;
	}

	getHash(x: number, y: number, w: number, h: number) {
		let buf = (this.snapshot.canCapture() ? this.snapshot.capture(x, y, w, h) : new ImageData(w, h));
		return imgcrc(buf);
	}

	makeFragment(x: number, y: number, w: number, h: number, known: SpriteInfo | null = null) {
		let frag: AtlasSnapshotFragment = {
			x: x, y: y, width: w, height: h,
			pixelhash: this.getHash(x, y, w, h),
			basetex: this.snapshot,
			known: known,
		}
		return frag;
	}

	getFragment(sprites: SpriteCache, x: number, y: number, w: number, h: number, ifmatched: SpriteInfo | null) {
		let key = this.cacheKey(x, y);
		let hash = this.getHash(x, y, w, h);
		if (ifmatched && ifmatched.hash != hash) {
			return null;
		}
		let frag: AtlasSnapshotFragment = {
			x: x, y: y, width: w, height: h,
			pixelhash: hash,
			basetex: this.snapshot,
			known: null,
		}
		this.sprites.set(key, frag);
		if (ifmatched) {
			frag.known = ifmatched;
		} else {
			let spritematch = sprites.hashes.get(hash);
			if (spritematch) {
				frag.known = spritematch;
			} else {
				this.tryMatchFontChar(sprites, frag);
			}
		}

		if (frag.known && frag.known.font) {
			if (frag.known.fontchr) {
				this.tryIdentifyFont(sprites, frag);
			}
		}

		return frag;
	}

	tryMatchFontChar(sprites: SpriteCache, frag: AtlasSnapshotFragment) {
		if (frag.known) { return; }
		for (let { frag: fontfrag, font } of this.fontsheets) {
			if (!rectsHaveOverlap(fontfrag, frag)) { continue; }
			let match = font.unknownsubs.find(unk => rectContainsPoint(frag, fontfrag.x + unk.x, fontfrag.y + unk.y));
			let charcode = match?.charcode ?? "�".charCodeAt(0);
			frag.known = font.identifyMissingCharacter(charcode, frag.x - frag.x, frag.y - frag.y, frag.width, frag.height, frag.pixelhash);
			sprites.hashes.set(frag.pixelhash, frag.known);
			break;
		}
	}

	tryIdentifyFont(sprites: SpriteCache, charfrag: AtlasSnapshotFragment) {
		if (!charfrag.known || !charfrag.known.fontchr || !charfrag.known.font) {
			return;
		}
		let font = charfrag.known.font;
		let fontchr = charfrag.known.fontchr;
		let fontx = charfrag.x - fontchr.x;
		let fonty = charfrag.y - fontchr.y;
		if (this.fontsheets.some(f => f.frag.x == fontx && f.frag.y == fonty)) {
			return;
		}

		let basekey = this.cacheKey(fontx, fonty);
		let basesprite = this.sprites.get(basekey);
		if (!basesprite || basesprite.known != charfrag.known.font?.basesprite) {
			let fontw = font.sheetwidth;
			let fonth = font.sheetheight;
			if (fontw == -1 || fonth == -1) {
				throw new Error("incomplete font");
			}
			let hash = this.getHash(fontx, fonty, fontw, fonth);
			if (hash == font.basesprite.hash) {
				let basefrag = this.makeFragment(fontx, fonty, fontw, fonth, font.basesprite);
				this.fontsheets.push({ font: font, frag: basefrag });
				console.log(`font ${font.spriteid} base matched by char ${fontchr.charcode}`);
				// detect fragments that belong to this font
				for (let chr of font.subs.values()) {
					let fontchr = chr.fontchr!
					this.getFragment(sprites, fontx + fontchr.x, fonty + fontchr.y, fontchr.width, fontchr.height, chr);
				}
				// try find fragments 
				for (let frag of this.sprites.values()) {
					if (frag.known || !rectsHaveOverlap(frag, basefrag)) { continue; }
					let match = font.unknownsubs.find(unkchr => rectContainsPoint(frag, fontx + unkchr.x, fonty + unkchr.y));
					let charcode = match?.charcode ?? "�".charCodeAt(0);
					let known = font.identifyMissingCharacter(charcode, frag.x - fontx, frag.y - fonty, frag.width, frag.height, frag.pixelhash);
					frag.known = known;
					sprites.hashes.set(frag.pixelhash, known);
				}
			}
		}
	}
}

export class AtlasTracker {
	cache = new Map<patchrs.TextureSnapshot, AtlasTextureSnapshotCache>();
	spriteCache: SpriteCache;

	constructor(spriteCache: SpriteCache) {
		this.spriteCache = spriteCache;
	}

	getSubcache(tex: patchrs.TextureSnapshot) {
		let subcache = this.cache.get(tex);
		if (!subcache) {
			subcache = new AtlasTextureSnapshotCache(tex);
			for (let [key, val] of this.cache.entries()) {
				if (subcache.adsorbKnowns(val)) {
					this.cache.delete(key);
					break;
				}
			}
			this.cache.set(tex, subcache);
		}
		return subcache;
	}
}

export function getUIState(renders: patchrs.RenderInvocation[], cache: AtlasTracker) {
	let elements: RenderRect[] = [];
	for (let render of renders) {
		let progmeta = getProgramMeta(render.program);
		if (!progmeta.isUi) { continue; }
		let data = getRenderFunc(render);
		if (!data.uniforms["uDiffuseMap"]) { continue; }
		let posget = data.getters["aVertexPosition2D"];
		let texget = data.getters["aTextureUV"];
		let texminget = data.getters["aTextureUVAtlasMin"];
		let texextget = data.getters["aTextureUVAtlasExtents"];
		let colget = data.getters["aVertexColour"];
		let samplerid = data.uniforms["uDiffuseMap"][0][0];
		let tex = render.samplers[samplerid];
		if (!tex) {
			// TODO fix underlying, this seems to happen after for some reason the uniform buffer is all 0
			console.log("ui texture sampler not found");
			continue;
		}

		let subcache = cache.getSubcache(tex);

		const eps = 0.4;//bias for weird rounding situation
		for (let a = 0; a < data.indices.length; a += 6) {
			let botleft = data.indices[a + 3];
			let topright = data.indices[a + 1];
			let botright = data.indices[a + 0];
			let topleft = data.indices[a + 2];

			let samplex = Math.floor(tex.width * texget(topleft, 0) + eps);
			let sampley = Math.floor(tex.height * texget(topleft, 1) + eps);
			let samplew = Math.floor(tex.width * texget(botright, 0) + eps) - samplex;
			let sampleh = Math.floor(tex.height * texget(botright, 1) + eps) - sampley;

			let texboxx = Math.floor(tex.width * texminget(topleft, 0) + eps);
			let texboxy = Math.floor(tex.height * texminget(topleft, 1) + eps);
			let texboxw = Math.floor(tex.width * texextget(topleft, 0) + eps);
			let texboxh = Math.floor(tex.height * texextget(topleft, 1) + eps);

			//deal with 1px profile sweeping, they have 0 width attribute arguments
			if (texboxw == 0 && samplew == 0 && texboxh != 0) { texboxw = 1; samplew = 1; }
			if (texboxh == 0 && sampleh == 0 && texboxw != 0) { texboxh = 1; sampleh = 1; }

			let xb = posget(botleft, 0);
			let yb = posget(botleft, 1);
			let dxx = posget(botright, 0) - xb;
			let dxy = posget(botright, 1) - yb;
			let dyx = posget(topleft, 0) - xb;
			let dyy = posget(topleft, 1) - yb;

			texboxw = Math.abs(texboxw);
			texboxh = Math.abs(texboxh);

			let frag: AtlasSnapshotFragment | undefined;
			//hardcoded case in shader, this produces white
			if (samplex < -60000 || sampley < -60000) {
				frag = subcache.whitesprite;
			} else {
				if (dxx == 0 || dyy == 0) {
					continue;
				}
				if (samplew == 0 || sampleh == 0) {
					console.log("skipped zero size tex");
					continue;
				}
				if (texboxw == 0 || texboxh == 0) {
					console.log("skipped zero size tex bounding box");
					continue;
				}

				frag = subcache.findFragment(cache.spriteCache, texboxx, texboxy, texboxw, texboxh);
			}
			let el: RenderRect = {
				sprite: frag,
				x: xb, y: yb,
				width: dxx, height: dyy,
				m12: dyx, m21: dxy,
				samplex: samplex - texboxx,
				sampley: sampley - texboxy,
				samplewidth: samplew,
				sampleheight: sampleh,
				color: [colget(botleft, 0), colget(botleft, 1), colget(botleft, 2), colget(botleft, 3)]
			}

			elements.push(el);
		}
	}
	return { elements, frametime: renders[0]?.ownFrameTime ?? 0, lastframetime: renders[0]?.lastFrameTime ?? 0 };
}
