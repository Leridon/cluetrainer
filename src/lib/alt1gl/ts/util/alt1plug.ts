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
	var alt1 = {};
	Object.defineProperties(alt1, {
		rsX: { get: () => patchrs.native.getRsX() },
		rsY: { get: () => patchrs.native.getRsY() },
		rsWidth: { get: () => patchrs.native.getRsWidth() },
		rsHeight: { get: () => patchrs.native.getRsHeight() }
	});
	globalThis.alt1 ??= alt1 as any;

	var lib = { ...a1lib };
	lib.captureHold = function (x, y, w, h) {
		throw new Error("sync capture not supported");
	}
	lib.captureAsync = function (...args: [rect: a1lib.RectLike] | [x: number, y: number, width: number, height: number]) {
		var rect = a1lib.Rect.fromArgs(...args);
		return patchrs.native.capture(-1, rect.x, rect.y, rect.width, rect.height);
	}
	lib.resetEnvironment();
	lib.hasAlt1Version = function () { return true; }
	globalThis.a1lib = lib;
	return lib;
})();