import * as patchrs from "./util/patchrs_napi";

console.log(patchrs.native);
console.log("Preload ran first");

declare global {
    interface Window {
        alt1gl: typeof patchrs.native;
    }
}

window.alt1gl = patchrs.native;