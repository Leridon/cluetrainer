import { RenderRect } from "./reflect2d";
import { RectLike } from "alt1";
import { KnownSpriteSheet, SpriteInfo } from "./spritecache";
import { renderGameUI } from "./render";
import * as patchrs from "../util/patchrs_napi";


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
}

export class UIRenderParser {
	els: RenderRect[];
	index: number;
	end: number;
	constructor(els: RenderRect[], index?: number, end?: number) {
		this.els = els;
		this.index = index ?? 0;
		this.end = end ?? els.length;
	}
	searchUIPattern<T extends string>(search: UISpriteCriteria<T>[]) {
		return searchUIPattern(this, search);
	}
	readFont() {
		return readFont(this);
	}
	boundToArea(bounds: RectLike) {
		for (let i = this.index; i < this.end; i++) {
			let r = this.els[i];
			if (r.x < bounds.x || r.y < bounds.y || r.x + r.width > bounds.x + bounds.width || r.y + r.height > bounds.y + bounds.height) {
				this.end = i;
			}
		}
	}
	skip(n: number) {
		this.index += n;
	}
	next() {
		if (this.index < this.end) {
			return this.els[this.index++];
		}
		return undefined;
	}
	nextKnown(limit = 0) {
		let count = 0;
		while (this.index < this.end && (limit == 0 || count++ < limit)) {
			let el = this.els[this.index++];
			if (el.sprite.known) { return el; }
		}
		return undefined;
	}
	peek(n = 0) {
		if (this.index + n < this.end) {
			return this.els[this.index + n];
		}
		return undefined;
	}
	branch() {
		return new UIRenderParser(this.els, this.index);
	}
	show(x?: number, y?: number, scale?: number) {
		if (typeof document == "undefined") {
			console.error("can't show in context without document");
			return;
		}
		let cnv = document.createElement("canvas");
		let ctx = cnv.getContext("2d")!;
		cnv.width = alt1.rsWidth;
		cnv.height = alt1.rsHeight;
		renderGameUI(ctx, new UIRenderTextureCache(), this.els, 0, this.els.length, false, undefined);
		cnv.style.position = "absolute";
		cnv.style.left = (x ?? 5) + "px";
		cnv.style.top = (y ?? 5) + "px";
		cnv.style.outline = "1px solid green";
		cnv.style.background = "gray";
		cnv.style.width = cnv.width * (scale ?? 1) + "px";
		cnv.style.height = cnv.height * (scale ?? 1) + "px";
		if (scale && scale > 1) { cnv.style.imageRendering = "pixelated"; }
		cnv.onclick = () => cnv.remove();
		document.body.appendChild(cnv);
	}
}

export type FontResult = ReturnType<typeof readFont>;

function readFont(parser: UIRenderParser) {
	let r = "";
	let el: RenderRect | undefined;
	let prev: RenderRect | undefined = undefined;
	let liney1 = 0;
	let liney2 = 0;
	let minx = 0;
	let miny = 0;
	let maxx = 0;
	let maxy = 0;
	let startindex = parser.index;
	let color: [number, number, number, number] | null = null;
	let font: KnownSpriteSheet | null = null;
	while (el = parser.peek(0)) {
		if (!el.sprite.known || !el.sprite.known.fontchr) { break; }
		if (!prev) {
			font = el.sprite.known.font;
			color = el.color;
			liney1 = el.y;
			liney2 = el.y + el.height;
			minx = el.x; miny = el.y; maxx = el.x + el.width; maxy = el.y + el.height;
		} else if (el.y > liney2 || el.y + el.height < liney1 || el.x < prev.x - 5 || el.x > prev.x + prev.width + 10) {
			break;
		}
		//is foreground of already read drop-shadow render
		if (prev && el.x == prev.x - 1) {
			parser.next();
			continue;
		}
		//space
		if (prev && el.x >= prev.x + prev.width + 3) {
			r += " ";
		}
		r += el.sprite.known.fontchr.chr;
		minx = Math.min(minx, el.x);
		miny = Math.min(miny, el.y);
		maxx = Math.max(maxx, el.x + el.width);
		maxy = Math.max(maxy, el.y + el.height);

		parser.next();
		prev = el;
	}
	return { text: r, x: minx, y: miny, width: maxx - minx, height: maxy - miny, startindex, endindex: parser.index, color, font };
}

export type UISpriteCriteria<T extends string> = {
	id?: number | number[],
	sprite?: SpriteInfo | SpriteInfo[],
	string?: string,
	repeat?: number | [number, number],
	color?: [number, number, number, number],
	not?: UISpriteCriteria<never>[],
	ref?: T
}

function matchRenderRect(crit: UISpriteCriteria<any>, render: RenderRect | undefined) {
	if (!render) { return false; }

	if (crit.sprite) {
		if (Array.isArray(crit.sprite)) {
			// TODO deal with synonyms?
			if (!crit.sprite.find(q => render.sprite.known == q)) { return false; }
		} else {
			if (render.sprite.known != crit.sprite) { return false; }
		}
	}
	if (crit.id != undefined) {
		if (Array.isArray(crit.id)) {
			// TODO deal with synonyms?
			if (!crit.id.find(q => render.sprite.known?.id == q)) { return false; }
		} else {
			if (render.sprite.known?.id != crit.id) { return false; }
		}
	}
	if (crit.color) {
		if (crit.color[0] != render.color[0]) { return false; }
		if (crit.color[1] != render.color[1]) { return false; }
		if (crit.color[2] != render.color[2]) { return false; }
		if (crit.color[3] != render.color[3]) { return false; }
	}
	if (crit.not) {
		for (let neg of crit.not) {
			if (matchRenderRect(neg, render)) { return false; }
		}
	}
	return true;
}

function searchAllUIPatterns<T extends string>(els: RenderRect[], search: UISpriteCriteria<T>[]) {
	let parser = new UIRenderParser(els);
	let res: { [id in T]: UISearchRef }[] = [];
	while (parser.peek(0)) {
		searchUIPattern(parser, search);
	}
	return res;
}

export type UISearchRef = { index: number, endindex: number, match: RenderRect, allmatches: RenderRect[], text: string };


function matchUIElement<T extends string>(parser: UIRenderParser, q: UISpriteCriteria<T>, peek: boolean, refs: { [id in T]: UISearchRef }) {
	let startindex = parser.index;
	let el = parser.peek();
	if (!el) { return 0; }
	if (typeof q.string != "undefined") {
		if (!el.sprite.known?.fontchr) { return 0; }
		let text = readFont(parser);
		if (typeof q.string == "string" && !text.text.toLowerCase().includes(q.string.toLowerCase())) {
			parser.index = startindex;
			return 0;
		}
		if (!peek && q.ref) {
			if (!refs[q.ref]) {
				refs[q.ref] = {
					allmatches: [],
					index: text.startindex,
					endindex: text.endindex,
					match: parser.els[text.startindex],
					text: ""
				};
			}
			refs[q.ref].allmatches.push(...parser.els.slice(text.startindex, text.endindex));
			refs[q.ref].endindex = text.endindex;
			refs[q.ref].text += (refs[q.ref].text != "" ? " " : "") + text.text;
		}
		if (peek) {
			parser.index = startindex;
		}
		return parser.index - startindex;
	}
	if ((!q.sprite && q.id == undefined) || matchRenderRect(q, el)) {
		if (!peek && q.ref) {
			if (!refs[q.ref]) {
				refs[q.ref] = {
					allmatches: [],
					endindex: parser.index,
					index: parser.index - 1,
					match: el,
					text: ""
				}
			}
			refs[q.ref].allmatches.push(el);
			refs[q.ref].endindex = parser.index;
		}
		if (!peek) {
			parser.skip(1);
		}
		return 1;
	}
	return 0;
}


function matchUIPattern<T extends string>(parser: UIRenderParser, search: UISpriteCriteria<T>[]) {
	let refs: { [id in T]: UISearchRef } = {} as any;

	let loop = (qindex: number) => {
		if (qindex >= search.length) { return qindex; }
		let q = search[qindex];
		let minmatches = (Array.isArray(q.repeat) ? q.repeat[0] : q.repeat) ?? 1;
		let maxmatches = (Array.isArray(q.repeat) ? q.repeat[1] : q.repeat) ?? 1;
		let matchcount = 0;
		let startindex = parser.index;
		while (true) {
			if (matchcount >= minmatches) {
				let depth = loop(qindex + 1);
				//prevent backtracking
				if (depth != qindex + 1) { return depth; }
			}
			if (matchcount < maxmatches && matchUIElement(parser, q, false, refs)) {
				matchcount++;
				continue;
			}
			if (matchcount >= minmatches) {
				return loop(qindex + 1);
			}
			parser.index = startindex;
			return qindex;
		}
	}
	let depth = loop(0);
	if (depth != search.length) { return null; }
	return refs;
}

function searchUIPattern<T extends string>(parser: UIRenderParser, search: UISpriteCriteria<T>[]) {
	let startindex = parser.index;
	let el: RenderRect | undefined;
	while (el = parser.nextKnown()) {
		parser.skip(-1);
		if (matchUIElement(parser, search[0], true, {} as any)) {
			let oldindex = parser.index;
			let refs = matchUIPattern(parser, search);
			if (refs) { return refs; }
			parser.index = oldindex;
		}
		parser.skip(1);
	}
	parser.index = startindex;
	return null;
}