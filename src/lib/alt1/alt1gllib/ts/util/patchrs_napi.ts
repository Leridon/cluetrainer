import { Alt1GlClient } from "./alt1gltypes";

let nativeReleaseDir = "./build/rundir_release/";
let nativeDebugDir = "./build/rundir/";

declare var __non_webpack_require__: any;
export var native: ElectronApi | typeof alt1 = null!;


type DebugApi = {
	// plugin management, handled internall by alt1 normally
	getExePids(name: string, parent?: number): number[],
	injectDll(pid: number, dllfile: string, heapmb?: number): boolean;
	getRsHwnd(): number,

	//plugin debugging
	getAllGlObjects(client: Alt1GlClient): any;
	killMemorySession(client: Alt1GlClient): Promise<void>,
	crash(): void,
};

export type ElectronApi = {
	events: typeof alt1["events"],
	on: typeof alt1["on"],
	off: typeof alt1["off"],
	once: typeof alt1["once"],
	emit: typeof alt1["emit"],

	//== alt1 replacement api ==
	getRsX(): number
	getRsY(): number,
	getRsWidth(): number,
	getRsHeight(): number,

	// main api entry point
	// opens a session that gives access to the OpenGL context of the game
	// only one session can be open at a time. Returns existing session if one is already open
	// the session can crash at which point all related objects become detached and you have to create a new session.
	getGlSession(): Promise<Alt1GlClient>,

	// unsafe debug api, only available in the electron version
	debug: DebugApi
};

function sequentialFilename(dir: string, dirfiles: string[], template: `${string}#${string}`) {
	const path = require("path") as typeof import("path");
	let regex = new RegExp(`${template.replace("#", "(\\d+)")}$`);
	let maxnum = 0;
	for (let file of dirfiles) {
		let m = file.match(regex);
		if (m) { maxnum = Math.max(maxnum, +m[1]); }
	}
	return [
		path.resolve(dir, template.replace("#", "" + (maxnum + 1))),
		(maxnum == 0 ? "" : path.resolve(dir, template.replace("#", "" + maxnum)))
	];
}

//TODO does not fix shared memory state
function reloadDll() {
	const fs = require("fs") as typeof import("fs");
	const path = require("path") as typeof import("path");

	let debugstat: ReturnType<typeof fs.statSync> | null = null;
	let releasestat: ReturnType<typeof fs.statSync> | null = null;
	try { debugstat = fs.statSync(path.resolve(nativeDebugDir, "addon.node")); } catch (e) { }
	try { releasestat = fs.statSync(path.resolve(nativeReleaseDir, "addon.node")); } catch (e) { }

	let pluginDir = "";
	if (debugstat && (!releasestat || debugstat.mtimeMs > releasestat.mtimeMs)) {
		console.log("using debug plugin");
		pluginDir = nativeDebugDir;
	} else if (releasestat) {
		console.log("using release plugin");
		pluginDir = nativeReleaseDir;
	} else {
		throw new Error("No native plugin found");
	}

	let origfile = path.resolve(pluginDir, "addon.node");
	let [newfile, lastfile] = sequentialFilename(pluginDir, fs.readdirSync(pluginDir), "addon-#.node");
	fs.copyFileSync(origfile, newfile);
	native = __non_webpack_require__(newfile);
}

if (typeof __non_webpack_require__ != "undefined") {
	reloadDll();
} else {
	// cef based api in global scope
	native = globalThis.alt1;
}

native.on("log", e => {
	let m = e.message.match(/bufferdata (\d+)\->(\d+)/);
	if (m) {
		let dif = +m[1] - +m[2];
		if (dif > 1e6) {
			console.log("large alloc: " + dif);
		}
	} else {
		console.info(e)
	}
});

export function getDebug() {
	if (!("debug" in native)) {
		throw new Error("Debug api not available in this environment");
	}
	return native.debug;
}
export function hookFirstClient() {
	if (!("debug" in native)) {
		console.log("debug api not available, hookFirstClient is not necessary in alt1");
		return;
	}
	var pids = getDebug().getExePids("rs2client.exe");
	if (pids.length == 0) { console.log("no rs pid found"); return; }
	// slightly sketchy, on intel iGPU the client forks the process and the first pid just happens to be correct
	let hook = injectClient(pids[0]);
	if (!hook.details) { console.log("injectdll returned false"); }
}

type HookResult = {
	pid: number,
	dllname: string,
	details: boolean
}

export function injectClient(pid: number) {
	const fs = require("fs") as typeof import("fs");
	const path = require("path") as typeof import("path");

	let debugstat: ReturnType<typeof fs.statSync> | null = null;
	let releasestat: ReturnType<typeof fs.statSync> | null = null;
	try { debugstat = fs.statSync(path.resolve(nativeDebugDir, "addon.node")); } catch (e) { }
	try { releasestat = fs.statSync(path.resolve(nativeReleaseDir, "addon.node")); } catch (e) { }

	let nativeDir = "";
	if (debugstat && (!releasestat || debugstat.mtimeMs > releasestat.mtimeMs)) {
		console.log("using debug gl native");
		nativeDir = nativeDebugDir;
	} else if (releasestat) {
		console.log("using release gl native");
		nativeDir = nativeReleaseDir;
	} else {
		throw new Error("No native plugin found");
	}

	let origfile = path.resolve(nativeDir, "Alt1GlHook.dll");
	let [newfile, lastfile] = sequentialFilename(nativeDir, fs.readdirSync(nativeDir), "Alt1GlHook-#.dll");
	let needsnew: boolean;
	if (!lastfile) {
		needsnew = true;
	} else {
		let origfiledata = fs.readFileSync(origfile);
		let currentfiledata = fs.readFileSync(lastfile);
		needsnew = false;
		if (origfiledata.length != currentfiledata.length) {
			needsnew = true;
		} else {
			for (let i = 0; i < origfiledata.length; i++) {
				if (origfiledata[i] != currentfiledata[i]) {
					needsnew = true;
					break;
				}
			}
		}
	}
	let dllname: string;
	if (needsnew) {
		fs.copyFileSync(origfile, newfile);
		dllname = newfile;
	} else {
		dllname = lastfile;
	}
	dllname = origfile;//TODO remove
	console.log(dllname);
	let res = getDebug().injectDll(pid, dllname);
	let hook: HookResult = { dllname, pid, details: res };
	return hook;
}

let vertexFlagCounter = new Array<boolean>(32).fill(false);
export function getVertexFlag() {
	let index = vertexFlagCounter.indexOf(false);
	if (index == -1) { throw new Error(); }
	vertexFlagCounter[index] = true;
	return 1 << index;
}
export function returnVertexFlags(flag: number) {
	for (let i = 0; i < 32; i++) {
		if (flag & (1 << i)) {
			vertexFlagCounter[i] = false;
		}
	}
}
let vertexProgCounter = new Array<boolean>(32).fill(false);
export function getProgramFlag() {
	let index = vertexProgCounter.indexOf(false);
	if (index == -1) { throw new Error(); }
	vertexProgCounter[index] = true;
	return 1 << index;
}
export function returnProgramFlags(flag: number) {
	for (let i = 0; i < 32; i++) {
		if (flag & (1 << i)) {
			vertexProgCounter[i] = false;
		}
	}
}