let nativeReleaseDir = "./build/release/";
let nativeDebugDir = "./build/debug/";


declare var __non_webpack_require__: any;

function resolvePath(...parts: string[]) {
  // const path = require("path") as typeof import("path");
  // return path.resolve(cwd, ...parts);

  // can't rely on path/fs modules here since we might be running in CEF
  const cwd = (() => {
    if (native) return native.debug.getCurrentWorkingDirectory()
    else if (typeof process != "undefined" && process.cwd) return process.cwd()
    else throw new Error("Can't determine cwd")
  })()

  return cwd + "/" + parts.join("/");// nasty
}

export var native: Alt1GlClient = null!;

export type VertexArray = {
  skipmask: number
}

export type TrackedTexture = {
  width: number,
  height: number,
  texid: number,
  format: string,
  formatid: number,
  // returns a section of the tracked texture. Some areas might be stale if this texture receives 3d images
  capture(subx: number, suby: number, w: number, h: number): ImageData,
  // updates the texture, can only be used on textures created via createTexture
  upload(img: ImageData): void,
  // gets the area that has been changed and not tracked, null if fully tracked
  getStaleRect(): { x: number, y: number, width: number, height: number } | null,
}
export type TextureSnapshot = {
  width: number,
  height: number,
  texid: number,
  detached: boolean,
  base: TrackedTexture,
  capture(subx: number, suby: number, w: number, h: number): ImageData,
  captureInto(img: ImageData, x: number, y: number, subx: number, suby: number, w: number, h: number): void,
  changesSince(oldtex: TextureSnapshot): { x: number, y: number, width: number, height: number }[],
  isChild(oldtex: TextureSnapshot): boolean,
  canCapture(): boolean,
  unref(): void,
  ref(): void,
  dispose(): void
}
export type GlShaderSource = {
  source: string,
  id: number,
  type: "fragment" | "vertex" | "other"
}
export type RenderInput = {
  buffer: Uint8Array,
  enabled: boolean,
  location: number,
  offset: number,
  scalartype: number,
  stride: number,
  vectorlength: number,
  normalized: boolean
}
export type PackedTypeInfo = {
  type: number,
  known: boolean,
  scalarType: number,
  scalarSize: number,
  vectorLength: number
}
export type GlUniformMeta = {
  name: string,
  blockArraystride: number,
  blockIndex: number,
  blockOffset: number,
  length: number,
  location: number,
  snapshotOffset: number,
  snapshotTracked: number,
  type: PackedTypeInfo
}
export type GlUniformArgument = {
  name: string
  type: number,
  length: number,
  snapshotOffset: number,
  snapshotSize: number
}
export type GlAttributeArgument = {
  length: number,
  location: number,
  type: number,
  name: string
}

export type GlInputMeta = {
  name: string,
  length: number,
  location: number,
  type: PackedTypeInfo
}
export type GlProgram = {
  vertexShader: GlShaderSource,
  fragmentShader: GlShaderSource,
  computeShader: GlShaderSource,
  programId: number,
  uniforms: GlUniformMeta[],
  uniformBufferSize: number,
  inputs: GlInputMeta[],
  skipmask: number
}

export type VertexArraySnapshot = {
  base: VertexArray,
  indexBuffer: Uint8Array,
  attributes: RenderInput[]
}

export type RenderRange = {
  start: number,
  length: number
}

export type OverlayUniformSource = {
  name: string,
  // the name of the uniform to copy from the original program
  // when type is buildin, this is the name of the builtin value `int framenr`, `vec2 mouse`, `float timestamp`, `vec4 viewport`
  sourceName: string,
  type: "program" | "builtin",
  // used in type program, leave undefined to target the program that triggered the overlay
  program?: GlProgram
}

export type RenderMode = "triangles" | "strips" | "fans";

export type RenderInvocation = {
  program: GlProgram,
  uniformState: Uint8Array,
  samplers: { [location: number]: TextureSnapshot },
  textures: { [location: number]: TrackedTexture },
  vertexArray: VertexArraySnapshot,
  renderRanges: RenderRange[],
  renderMode: RenderMode | "unknown",
  indexType: number,
  vertexObjectId: number,
  lastFrameTime: number,
  ownFrameTime: number,
  viewport: { x: number, y: number, width: number, height: number },
  framebufferColorTexture: TrackedTexture | undefined,
  framebufferColorTextureId: number,
  framebufferDepthTexture: TrackedTexture | undefined,
  framebufferDepthTextureId: number,
  framebufferId: number,
  framenr: number,
  computeTextures: { index: number, textureid: number, access: number, format: number }[],
  computeBuffers: { index: number, bufferid: number }[],
  dispose(): void
}
export type GlState = {
  programs: { [id: number]: GlProgram },
  textures: { [id: number]: TrackedTexture }
}

export type RecordRenderOptions = {
  maxframes?: number,
  timeout?: number,
  framecooldown?: number,
  // what features to capture
  // - vertexarray: capture vertex array object
  // - uniforms: capture uniform state
  // - textures: capture only what textures are bound at draw time, but not their contents
  // - texturesnapshot: capture texture snapshots as they were at draw time, does not include textures that are redrawn each frame
  // - texturecapture: fully captures textures as they were at draw, including textures that change every frame such as 3d render targets
  // - computebindings: captures information about SSBO and image bindings (different from textures)
  // - full: capture all features (not recommended)
  features?: ("vertexarray" | "uniforms" | "textures" | "texturesnapshot" | "texturecapture" | "computebindings" | "framebuffer" | "full")[],
} & RenderFilter;

export type RenderFilter = {
  // maximum matches per frame, default unlimited
  maxPerFrame?: number,
  // only match draw calls that use this VAO
  vertexObjectId?: number,
  // only match draw calls that use this program
  programId?: number,
  // only match draw calls that render to this framebuffer
  framebufferId?: number,
  // only match draw calls that render to a framebuffer with this texture attached
  framebufferTexture?: number,
  // only match draw calls that render to a framebuffer with depth texture attached
  framebufferDepth?: number,
  // don't match draw calls that match these bitflags on the vertexArray skipmask
  skipVerticesMask?: number,
  // match only draw calls that match these bitflags on the vertexArray skipmask
  useVerticesMask?: number,
  // don't match draw calls that match these bitflags on the program skipmask
  skipProgramMask?: number,
  // match only draw calls that match these bitflags on the program skipmask
  useProgramMask?: number,
  // also match glDispatchCompute calls (these don't have a vertex array and don't render to a framebuffer), default false
  includeCompute?: boolean,
  // include normal glDraw* calls, default true
  includeDraw?: boolean
}

export type RendererInfo = {
  glRenderer: string,
  glVendor: string,
  glVersion: string,
  glShaderVersion: string,
}

export type StreamRenderObject = {
  close: () => Promise<void>,
  // i dont know if this is hooked up right now, might be removed later
  ended: Promise<void>
}

export type GlOverlay = {
  getUniformState: () => Uint8Array,
  setUniformState: (data: Uint8Array) => void,
  stop: () => void
};

type GlOverlayOption = {
  // When to trigger the overlay, default "after"
  trigger?: "before" | "after" | "replace" | "frameend" | "passive",
  // Set to true to enabled translucent overlays. Default failse when program is provided, inherits from original render otherwise
  alphaBlend?: boolean,
  // Which index ranges to render, default all if vertex array is present, otherwise inherits from original render
  ranges?: RenderRange[],
  // The type of primitives to draw
  renderMode?: RenderMode,
  // A buffer containing uniform state to draw with, defaults to the programs last rendered uniforms. (also affects `uniformSources`)
  uniformBuffer?: Uint8Array,
  // A list of commands to generate uniform values at draw time
  uniformSources?: OverlayUniformSource[],
  // A list of textures to bind at draw time. Samplers of the original render remain bound unless shadowed here.
  samplers?: { [location: number]: TrackedTexture },
  // Max duration of the overlay in milliseconds, indefinite if not specified
  duration?: number
}

type InjectState = { memoryid: number, instanceid: number } | null;

type DebugApi = {
  // native helpers
  getCurrentWorkingDirectory(): string,
  readDirSync(dir: string): string[],
  readFileSync(file: string): Uint8Array,
  copyFileSync(from: string, to: string): void,
  statSync(file: string): { size: number, modifiedTime: number, isDirectory: boolean },
  getExePids(name: string, parent?: number): number[],

  // plugin management
  injectDll(pid: number, dllfile: string, memoryid?: number, instanceid?: number): InjectState;
  exitDll(): void,
  getRsHwnd(): number,

  //plugin debugging
  memoryState(): { size: number, free: number, used: number, sanity: boolean, allocs: number, namedobjects: number } | null,
  getAllGlObjects(): any;
  getGlObjectStats(): { size: number, count: number, counts: Record<string, number>, subsizes: Record<string, number> } | null,
  resetOpenGlState(): Promise<void>,
  killMemorySession(): Promise<void>,
  setLogCb(cb: (message: string) => void): void
};

export type Alt1GlClient = {
  //== alt1 replacement api ==
  getRsReady(): number,
  getRsX(): number
  getRsY(): number,
  getRsWidth(): number,
  getRsHeight(): number,
  // captures a texture from opengl. texid -1 means the current framebuffer. width/height -1 means full size
  capture(texid: number, x: number, y: number, w: number, h: number): Promise<ImageData>,

  //== core opengl ==
  recordRenderCalls(options?: RecordRenderOptions): Promise<RenderInvocation[]>,
  streamRenderCalls(options: RecordRenderOptions, callback: (progess: RenderInvocation[]) => void): StreamRenderObject,

  getOpenGlState(): Promise<GlState>,
  getRenderer(): RendererInfo | null,

  // debugging hook that captures all opengl calls
  setGlLogCb(cb: ((packet: { id: number, thread: number, data: Uint8Array }) => any) | null): void,
  getGlLogToggles(): Uint8Array,
  setGlLogToggles(arr: Uint8Array): void,

  //== upload/overlay ==
  createProgram(vertexshader: string, fragmentshader: string, inputs: GlAttributeArgument[], uniforms: GlUniformArgument[]): GlProgram;
  createVertexArray(indexbuffer: Uint8Array, inputs: RenderInput[]): VertexArraySnapshot;
  createTexture(img: ImageData): TrackedTexture;
  beginOverlay(trigger: RenderFilter, prog: GlProgram | undefined, vertexarray: VertexArraySnapshot | undefined, options: GlOverlayOption): GlOverlay;
  // stopOverlay(id: GlOverlay): void;

  debug: DebugApi
};

function sequentialFilename(dir: string, dirfiles: string[], template: `${string}#${string}`) {
  // can't actually read the dir since we don't know if we are in CEF, and the plugin might not be loaded yet
  let regex = new RegExp(`${template.replace("#", "(\\d+)")}$`);
  let maxnum = 0;
  for (let file of dirfiles) {
    let m = file.match(regex);
    if (m) { maxnum = Math.max(maxnum, +m[1]); }
  }
  return [resolvePath(dir, template.replace("#", "" + (maxnum + 1))), (maxnum == 0 ? "" : resolvePath(dir, template.replace("#", "" + maxnum)))];
}

//TODO does not fix shared memory state
function reloadDll() {
  const fs = require("fs") as typeof import("fs");
  let debugstat = null as ReturnType<typeof fs.statSync> | null;
  let releasestat = null as ReturnType<typeof fs.statSync> | null;
  try { debugstat = fs.statSync(resolvePath(nativeDebugDir, "addon.node")); } catch (e) { }
  try { releasestat = fs.statSync(resolvePath(nativeReleaseDir, "addon.node")); } catch (e) { }

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

  let origfile = resolvePath(pluginDir, "addon.node");
  let [newfile, lastfile] = sequentialFilename(pluginDir, fs.readdirSync(pluginDir), "addon-#.node");
  fs.copyFileSync(origfile, newfile);
  native = __non_webpack_require__(newfile);
}

if (globalThis.alt1gl) {
  // cef based or preloaded api in global scope
  native = globalThis.alt1gl;
} else if (typeof __non_webpack_require__ != "undefined") {
  reloadDll();
}
native.debug.setLogCb(e => {
	let m = e.match(/bufferdata (\d+)\->(\d+)/);
	if (m) {
		let dif = +m[1] - +m[2];
		if (dif > 1e6) {
			console.log("large alloc: " + dif);
		}
	} else {
		if (e.match(/purged pogram (\d+)/)) { return }
		console.info(e)
	}
});

export function hookFirstClient() {
	var pids = native.debug.getExePids("rs2client.exe");
	if (pids.length == 0) { console.log("no rs pid found"); return; }
	// slightly sketchy, on intel iGPU the client forks the process and the first pid just happens to be correct
	// hook the second process, since I also play my main in the background
	let hook = injectClient(pids[0]);
	if (!hook.details) { console.log("injectdll returned false"); }
}

type HookResult = {
  pid: number,
  dllname: string,
  details: { memoryid: number, instanceid: number } | null
}

export function injectClient(pid: number) {
  let debugstat = null as ReturnType<typeof native.debug.statSync> | null;
  let releasestat = null as ReturnType<typeof native.debug.statSync> | null
  try { debugstat = native.debug.statSync(resolvePath(nativeDebugDir, "addon.node")); } catch (e) { }
  try { releasestat = native.debug.statSync(resolvePath(nativeReleaseDir, "addon.node")); } catch (e) { }

  let nativeDir = "";
  if (debugstat && (!releasestat || debugstat.modifiedTime > releasestat.modifiedTime)) {
    console.log("using debug gl native");
    nativeDir = nativeDebugDir;
  } else if (releasestat) {
    console.log("using release gl native");
    nativeDir = nativeReleaseDir;
  } else {
    throw new Error("No native plugin found");
  }

  let origfile = resolvePath(nativeDir, "injected.dll");
  let [newfile, lastfile] = sequentialFilename(nativeDir, native.debug.readDirSync(nativeDir), "injected-#.dll");
  let needsnew: boolean;
  if (!lastfile) {
    needsnew = true;
  } else {
    let origfiledata = native.debug.readFileSync(origfile);
    let currentfiledata = native.debug.readFileSync(lastfile);
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
    native.debug.copyFileSync(origfile, newfile);
    dllname = newfile;
  } else {
    dllname = lastfile;
  }
  console.log(dllname);
  let res = native.debug.injectDll(pid, dllname);
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