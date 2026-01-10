import { crc32 } from "../util/crc32";
import { AtlasSnapshotFragment } from "./reflect2d";

// sprite hash files generated using runeapps model viewer https://runeapps.org/modelviewer
// scripts->cli->run
// alternatively use cli version and prepend `node dist/cli.js -o openrs2last`

// extract -m spritehash --batchsize=1000000
const spritehashes = require("!!file-loader?name=data/[name].[ext]!./data/spritehash.batch.json");
// extract -m fonthash --batchsize=1000000
const fontfile = require("!!file-loader?name=data/[name].[ext]!./data/fonthash.batch.json");
// created manually using the tools in UI State
const chat12ptfile = require("!!file-loader?name=data/[name].[ext]!./data/chat12pt.json");

export type FontCharacterJson = {
    chr: string,
    charcode: number,
    x: number,
    y: number,
    width: number,
    height: number,
    bearingy: number,
    hash: number
}

export type ParsedFontJson = {
    fontid: number,
    spriteid: number,
    characters: (FontCharacterJson | null)[],
    median: number,
    baseline: number,
    maxascent: number,
    maxdescent: number,
    scale: number,
    sheethash: number,
    sheetwidth: number,
    sheetheight: number,
    sheet: string
}

type CustomJsonFont = {
    sheetwidth: number,
    sheetheight: number,
    sheethash: number,
    spriteid: number,
    characters: FontCharacterJson[],
    unknownchars: UknownFontChar[]
}

type SpriteCacheJson = {
    id: number,
    sub: number,
    hash: number
};

export type FontSpriteChar = FontCharacterJson;

export class SpriteInfo {
    id: number;
    subid: number;
    hash: number;
    fontchr: FontSpriteChar | null = null;
    font: KnownSpriteSheet | null = null;
    synonym: SpriteInfo;//circular linked list of synonyms
    constructor(id: number, subid: number, hash: number) {
        this.id = id;
        this.subid = subid;
        this.hash = hash;
        this.synonym = this;
    }
}

export function imgcrc(img: ImageData) {
    let data = img.data.slice();
    // for some reason *some times* 0 blue gets turned into 1 blue
    // always set it to 1 for hash computation
    for (let i = 0; i < data.length; i += 4) { if (data[i + 2] == 0) { data[i + 2] = 1; } }
    return crc32(data);
}

type UknownFontChar = {
    x: number,
    y: number,
    charcode: number
}

export class KnownSpriteSheet {
    spriteid: number;
    subs = new Set<SpriteInfo>();
    unknownsubs: UknownFontChar[] = [];
    fontfile: ParsedFontJson | null = null;

    basesprite: SpriteInfo;
    sheetwidth: number;
    sheetheight: number;
    constructor(spriteid: number, width: number, height: number, sheethash: number) {
        this.spriteid = spriteid
        this.basesprite = new SpriteInfo(spriteid, 0, sheethash);
        this.basesprite.font = this;
        this.sheetwidth = width;
        this.sheetheight = height;
    }

    addFontFile(fontfile: ParsedFontJson) {
        this.fontfile = fontfile;
        for (let chr of fontfile.characters) {
            if (!chr) { continue; }
            let sub = new SpriteInfo(fontfile.spriteid, chr.charcode, chr.hash);
            this.subs.add(sub);
            sub.font = this;
            sub.fontchr = chr;
        }
    }

    addUknownSub(dx: number, dy: number, charcode: number) {
        this.unknownsubs.push({ x: dx, y: dy, charcode: charcode });
    }

    addCharSprite(charcode: number, dx: number, dy: number, width: number, height: number, hash: number) {
        let known = new SpriteInfo(this.spriteid, charcode, hash);
        known.font = this;
        known.fontchr = {
            chr: String.fromCharCode(charcode),
            charcode: charcode,
            x: dx,
            y: dy,
            width: width,
            height: height,
            hash: known.hash,
            bearingy: 0,//unknown
        };
        this.subs.add(known);
        return known;
    }

    identifyMissingCharacter(charcode: number, dx: number, dy: number, width: number, height: number, hash: number) {
        let known = this.addCharSprite(charcode, dx, dy, width, height, hash);
        this.unknownsubs = this.unknownsubs.filter(c => c.charcode != charcode);
        console.log(`font char "${String.fromCharCode(charcode)}" matched by containment in font ${this.spriteid}`);
        return known;
    }

    resizeSheetBox() {
        if (this.unknownsubs.length == 0 && this.subs.size == 0) {
            throw new Error("no subs to size from");
        }
        let minx = Math.min.apply(null, [...this.subs.values().map(q => q.fontchr!.x), ...this.unknownsubs.map(q => q.x)]);
        let miny = Math.min.apply(null, [...this.subs.values().map(q => q.fontchr!.y), ...this.unknownsubs.map(q => q.y)]);
        let maxx = Math.max.apply(null, [...this.subs.values().map(q => q.fontchr!.x + q.fontchr!.width), ...this.unknownsubs.map(q => q.x + 1)]);
        let maxy = Math.max.apply(null, [...this.subs.values().map(q => q.fontchr!.y + q.fontchr!.height), ...this.unknownsubs.map(q => q.y + 1)]);

        this.sheetwidth = maxx - minx;
        this.sheetheight = maxy - miny;
        this.basesprite.hash = 0;

        for (let sub of this.subs) {
            sub.fontchr!.x -= minx;
            sub.fontchr!.y -= miny;
        }
        for (let chr of this.unknownsubs) {
            chr.x -= minx;
            chr.y -= miny;
        }

        return { dx: minx, dy: miny };
    }

    toJSON() {
        let res: CustomJsonFont = {
            sheetwidth: this.sheetwidth,
            sheetheight: this.sheetheight,
            sheethash: this.basesprite.hash,
            spriteid: this.spriteid,
            characters: [...this.subs].map(s => s.fontchr).filter(c => c != null),
            unknownchars: [...this.unknownsubs],
        };
        return res;
    }
}

const whitePixelImage = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
export const emptySpriteInfo = new SpriteInfo(-1, 0, imgcrc(whitePixelImage));

export class SpriteCache {
    hashes = new Map<number, SpriteInfo>();
    fonts = new Map<number, KnownSpriteSheet>();
    readyResolvers = Promise.withResolvers<void>();
    ready = this.readyResolvers.promise;

    constructor() {
        this.hashes.set(emptySpriteInfo.hash, emptySpriteInfo);
    }

    addSprite(info: SpriteInfo) {
        let prev = this.hashes.get(info.hash);
        if (prev) {
            info.synonym = prev.synonym
            prev.synonym = info;
        } else {
            this.hashes.set(info.hash, info);
        }
        return info;
    }

    loadSpriteList(list: SpriteCacheJson[]) {
        list.forEach(spr => this.addSprite(new SpriteInfo(spr.id, spr.sub, spr.hash)));
    }

    loadCacheFontFile(fonts: ParsedFontJson[]) {
        for (let fontjson of fonts) {
            let font = new KnownSpriteSheet(fontjson.spriteid, fontjson.sheetwidth, fontjson.sheetheight, fontjson.sheethash);
            font.addFontFile(fontjson);
            this.fonts.set(font.spriteid, font);
            font.subs.forEach(sub => this.addSprite(sub));
        }
    }
    loadCustomFontFile(fontjson: CustomJsonFont) {
        let font = new KnownSpriteSheet(fontjson.spriteid, fontjson.sheetwidth, fontjson.sheetheight, fontjson.sheethash);
        for (let chr of fontjson.characters) {
            font.addCharSprite(chr.charcode, chr.x, chr.y, chr.width, chr.height, chr.hash);
        }
        for (let unk of fontjson.unknownchars) {
            font.addUknownSub(unk.x, unk.y, unk.charcode);
        }
        // TODO need unique id
        this.fonts.set(font.spriteid, font);
        font.subs.forEach(sub => this.addSprite(sub));
    }

    async downloadCacheData() {
        let spritedata: SpriteCacheJson[] = await fetch(spritehashes.default).then(res => res.json());
        this.loadSpriteList(spritedata);

        let fontdata: ParsedFontJson[] = await fetch(fontfile.default).then(res => res.json());
        this.loadCacheFontFile(fontdata);

        let chat12ptdata: CustomJsonFont = await fetch(chat12ptfile.default).then(res => res.json());
        this.loadCustomFontFile(chat12ptdata);
    }
}


function imageMemCompare(a: ImageData, b: ImageData) {
    if (a.width != b.width || a.height != b.height) { return false; }
    // let simpletrue = simpleCompare(b, a, 0, 0, 5) < Infinity;
    // return simpletrue;
    let memtrue = true;
    for (let i = 0; i < a.data.length; i += 4) {
        if (a.data[i + 3] != b.data[i + 3]) { memtrue = false; break; }
        if (a.data[i + 3] == 0) { continue; }
        if (a.data[i + 0] != b.data[i + 0]) { memtrue = false; break; }
        if (a.data[i + 1] != b.data[i + 1]) { memtrue = false; break; }
        if (a.data[i + 2] != b.data[i + 2]) { memtrue = false; break; }
    }
    // // if (simpletrue != memtrue) {
    // // 	debugger;
    // // }

    return memtrue;
}