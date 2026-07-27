import { UIRenderTextureCache } from "../controlpanel/gameuiview";
import { AtlasSnapshotFragment, AtlasTracker, RenderRect } from "./reflect2d";

export function renderGameUITextureUsage(ctx: CanvasRenderingContext2D, atlas: AtlasTracker, texturecache: UIRenderTextureCache, elements: RenderRect[], startindex: number, endindex: number, showBorders: boolean, selectedSprite: AtlasSnapshotFragment) {
    let texture = texturecache.getTexture(selectedSprite.basetex);
    ctx.drawImage(texture, 0, 0);

    ctx.fillStyle = "blue";
    ctx.strokeStyle = "blue";
    let subcache = atlas.getSubcache(selectedSprite.basetex);
    for (let sprite of subcache.sprites.values()) {
        ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height);
    }

    for (let { frag, font } of subcache.fontsheets) {
        ctx.fillStyle = "purple";
        ctx.strokeStyle = "purple";
        ctx.strokeRect(frag.x, frag.y, frag.width, frag.height);

        for (let unkchr of font.unknownsubs) {
            ctx.fillRect(frag.x + unkchr.x - 5, frag.y + unkchr.y - 0.5, 10, 1);
            ctx.fillRect(frag.x + unkchr.x - 0.5, frag.y + unkchr.y - 5, 1, 10);
        }
    }

    for (let i = startindex; i < endindex && i < elements.length; i++) {
        let el = elements[i];
        if (el.sprite.basetex != selectedSprite.basetex) { continue; }

        ctx.lineWidth = (el.sprite == selectedSprite ? 4 : 1);
        ctx.strokeStyle = (el.sprite.known ? (el.sprite.known.subid == -1 ? "purple" : "green") : "red");
        ctx.strokeRect(el.samplex + el.sprite.x, el.sampley + el.sprite.y, el.samplewidth, el.sampleheight);
    }

}

export function renderGameUI(ctx: CanvasRenderingContext2D, texturecache: UIRenderTextureCache, elements: RenderRect[], startindex: number, endindex: number, showBorders: boolean, selectedSprite: AtlasSnapshotFragment | undefined) {
    for (let i = startindex; i < elements.length && i < endindex; i++) {
        let el = elements[i];
        let texture = texturecache.getTexture(el.sprite.basetex);

        ctx.save();

        // sign flipping magic because drawImage doesn't support negative width/height for flipping
        // rotation+flip is still broken
        let widthsign = Math.sign(el.samplewidth);
        let heightsign = -Math.sign(el.sampleheight);

        let paintwidth = el.width * widthsign;
        let paintheight = el.height * heightsign;
        let samplex = el.samplex + (widthsign == -1 ? el.samplewidth : 0);
        let sampley = el.sampley + (heightsign == -1 ? el.sampleheight : 0);
        let samplewidth = Math.abs(el.samplewidth);
        let sampleheight = Math.abs(el.sampleheight);

        ctx.transform(
            widthsign, el.m21 / paintwidth,
            el.m12 / paintheight, heightsign,
            el.x + (widthsign == -1 ? el.width : 0), el.y + (heightsign == -1 ? el.height : 0),
        );

        for (let srcx = samplex; srcx < samplex + samplewidth;) {
            let srcx2 = Math.min(samplex + samplewidth, (Math.floor(srcx / el.sprite.width) + 1) * el.sprite.width);
            for (let srcy = sampley; srcy < sampley + sampleheight;) {
                let srcy2 = Math.min(sampley + sampleheight, (Math.floor(srcy / el.sprite.height) + 1) * el.sprite.height);

                ctx.drawImage(texture,
                    el.sprite.x + srcx % el.sprite.width,
                    el.sprite.y + srcy % el.sprite.height,
                    srcx2 - srcx,
                    srcy2 - srcy,
                    (srcx - samplex) / samplewidth * el.width,
                    (srcy - sampley) / sampleheight * el.height,
                    (srcx2 - srcx) / samplewidth * el.width,
                    (srcy2 - srcy) / sampleheight * el.height
                );
                srcy = srcy2;
            }
            srcx = srcx2;
        }

        if (showBorders) {
            ctx.lineWidth = (selectedSprite && el.sprite == selectedSprite ? 4 : 1);
            ctx.strokeStyle = (el.sprite.known ? (el.sprite.known.subid == -1 ? "purple" : "green") : "red");
            ctx.strokeRect(0, 0, el.width, el.height);
        }
        ctx.restore();
    }
}