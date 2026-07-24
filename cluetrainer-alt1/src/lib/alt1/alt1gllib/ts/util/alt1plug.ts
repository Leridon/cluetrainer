import * as patchrs from "./patchrs_napi";
import * as a1lib from "alt1";

declare global {
	namespace alt1 {
		export var rsX: number;
		export var rsY: number;
		export var rsWidth: number;
		export var rsHeight: number;
	}
}

export default (() => {
	if (globalThis.alt1) {
		return globalThis.alt1;
	}
	var alt1 = {};
	Object.defineProperties(alt1, {
		rsX: { get: () => ("getRsX" in patchrs.native ? patchrs.native.getRsX() : 0) },
		rsY: { get: () => ("getRsY" in patchrs.native ? patchrs.native.getRsY() : 0) },
		rsWidth: { get: () => ("getRsWidth" in patchrs.native ? patchrs.native.getRsWidth() : 0) },
		rsHeight: { get: () => ("getRsHeight" in patchrs.native ? patchrs.native.getRsHeight() : 0) },
		getGlSession: { value: () => patchrs.native.getGlSession() },
	});
	globalThis.alt1 ??= alt1 as any;

	var lib = { ...a1lib };
	lib.captureHold = function (x, y, w, h) {
		throw new Error("sync capture not supported");
	}
	// TODO need to handle gl session lifetime in order to polyfil this here
	// lib.captureAsync = function (...args: [rect: a1lib.RectLike] | [x: number, y: number, width: number, height: number]) {
	// 	var rect = a1lib.Rect.fromArgs(...args);
	// 	return patchrs.native.capture(-1, rect.x, rect.y, rect.width, rect.height);
	// }
	lib.resetEnvironment();
	lib.hasAlt1Version = function () { return true; }
	globalThis.a1lib = lib;
	return lib;
})();