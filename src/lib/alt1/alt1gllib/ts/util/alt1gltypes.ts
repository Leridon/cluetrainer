import * as a1lib from "alt1"
import { TypedEmitter } from "./util"

/** Represents a vertex array object (VAO, also known as mesh). This object can not be inspected directly. */
export declare class VertexArray {
    /** 32-bit bitflags that can be modified to flag this program as belonging to a certain class of meshes. You can use the skipmask to filter for specific classes of programs in captures or overlays. */
    skipmask: number;
}

/**
 * Supports reference counting and deterministic cleanup via the dispose symbol. This way GL no longer have to wait for GC to free resources.
 * 
 */
export declare interface GlRefCounted {
    /** Increases internal reference count */
    ref(): this;
    /** Decreases internal reference count */
    unref(): this;
    /** Immediately frees internal resources */
    detach(): void;
    /** Calls unref internally */
    [Symbol.dispose](): void;
}

/** Represents a texture whose contents are tracked and kept in RAM. */
export declare class TrackedTexture implements GlRefCounted {
    private constructor();
    ref(): typeof this;
    unref(): typeof this;
    detach(): void;
    [Symbol.dispose](): void;

    width: number;
    height: number;
    /** internal OpenGL id of the texture */
    texid: number;
    /** a string containing the format if the format is a known format, or "unknown" if the format is not supported */
    format: string;
    /** internal OpenGL constant of the format */
    formatid: number;
    /** High performance capture of a section of the tracked texture. Some areas might be stale if this texture is used as render target. */
    capture(subx: number, suby: number, w: number, h: number): ImageData;
    /** Updates the texture, can only be used on textures created via createTexture */
    upload(img: ImageData): void;
    /** Gets the area that has been changed and not tracked, null if fully tracked */
    getStaleRect(): { x: number, y: number, width: number, height: number } | null;
}

/** Contains a snapshot of a tracked texture at a specific point in time. This object does not store the entire texture, but instead stores only the differences between the texture at the time of the snapshot and the base texture or a later snapshot. */
export declare class TextureSnapshot implements GlRefCounted {
    private constructor();
    ref(): typeof this;
    unref(): typeof this;
    detach(): void;
    [Symbol.dispose](): void;

    width: number;
    height: number;
    /** Internal OpenGL id of the texture this snapshot was taken from. */
    texid: number;
    /** True if the snapshot is no longer attached to the base TrackedTexture. This indicates that the snapshot object contains the actual texture instead of a patch list. */
    detached: boolean;
    /** the base tracked texture from which this snapshot was taken */
    base: TrackedTexture;
    /** High performance capture of the snapshot */
    capture(subx: number, suby: number, w: number, h: number): ImageData;
    /** same as capture, but avoids allocating a new ImageData object */
    captureInto(img: ImageData, x: number, y: number, subx: number, suby: number, w: number, h: number): void;
    /** Returns the changed areas between this snapshot and the provided snapshot. Throws if this.isChild(oldtex) is false */
    changesSince(oldtex: TextureSnapshot): { x: number, y: number, width: number, height: number }[];
    /** Returns true if this snapshot is an older version of the provided snapshot */
    isChild(oldtex: TextureSnapshot): boolean;
    /** false if the snapshot is detached or uses an unknown pixel format */
    canCapture(): boolean;
    unref(): void;
    ref(): void;
    dispose(): void;
}
export type GlShaderSource = {
    /** GLSL source code of the shader stage */
    source: string,
    /** internal OpenGL id of the shader */
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

/** Represents an OpenGL program. A program is responsible for rendering a mesh to the screen. It uses the vertex shader to compute the position of the vertices on the screen. The fragment shader computes the color of each pixel.
*/
export declare class GlProgram implements GlRefCounted {
    private constructor();
    ref(): typeof this;
    unref(): typeof this;
    detach(): void;
    [Symbol.dispose](): void;

    /** The vertex shader used by this program. undefined if the program is a compute program */
    vertexShader: GlShaderSource;
    /** The fragment shader used by this program. undefined if the program is a compute program. */
    fragmentShader: GlShaderSource;
    /** The compute shader used by this program. undefined if the program is not a compute program. */
    computeShader: GlShaderSource;
    /** Internal OpenGL id of the program. */
    programId: number;
    /** Contents and layout of the combined uniform buffer when this program is captured. */
    uniforms: GlUniformMeta[];
    /** Byte size of uniform snapshots captured for this program, or when this program is rendered in an overlay. */
    uniformBufferSize: number;
    /** The name, type, and location of vertex attributes that this program expects. */
    inputs: GlInputMeta[];
    /** 32-bit bitflags that can be modified to flag this program as belonging to a certain class of programs. You can use the skipmask to filter for specific classes of programs in captures or overlays. */
    skipmask: number;
}

/** Represents a vertex array object (VAO, also known as mesh) as it was at the time of capture */
export declare class VertexArraySnapshot implements GlRefCounted {
    private constructor();
    ref(): typeof this;
    unref(): typeof this;
    detach(): void;
    [Symbol.dispose](): void;

    /** The base vertex array object that this snapshot was taken from. */
    base: VertexArray;
    /** The index buffer of the vertex array. The internal integer type is captured as part of RenderInvocation.indexType */
    indexBuffer: Uint8Array;
    /** The attributes of the vertex array. The meaning of the attributes can be derived from the GlProgram used in the render invocation */
    attributes: RenderInput[];
}

export type RenderRange = {
    /** The index of the first element to render */
    start: number,
    /** The number of elements to render */
    length: number
}

/**
 * This object is used to update uniforms at draw time for overlays. It describes where in the uniform buffer to copy data from, and what to copy. The source can either be the original program's last rendered uniform values, or some built-in values like framenr or mouse position.
 */
export type OverlayUniformSource = {
    /** Name of the uniform that should be updated */
    name: string,
    /**
     * The type of source to copy from. When type is "program", the overlay system will copy data from the original program's last rendered uniform values for this uniform. When type is "builtin", the overlay system will generate the value at the time of the render. See sourceName for a list of built-in values
     */
    type: "program" | "builtin",
    /**
     * The name of the uniform to copy from the original program
     * when type is builtin, this is the name of the builtin value `int framenr`, `vec2 mouse`, `float timestamp`, `vec4 viewport`
     */
    sourceName: string,
    /** Can be set to target a different program when copying a uniform from a program. */
    program?: GlProgram
}

export type RenderMode = "triangles" | "strips" | "fans";


export type DisposableArray<T> = T[] & {
    /** 
     * disposes all render invocations in the list. This way you can do:
     * ```js
     * function doSomething() {
     *   using renders = await session.recordRenderCalls({...});
     *   // do something with renders
     * 
     *   // `using` will automatically call symbol.dispose on all render invocations at the end of the block
     *   // this will recursively dispose all contained objects like textures and vertex arrays
     * }```
     */
    [Symbol.dispose](): void;
};

/**
 * Represents a single OpenGL render call that was captured via recordRenderCalls or streamRenderCalls. Contains all state that was captured about that render call.
 */
export declare class RenderInvocation implements GlRefCounted {
    private constructor();
    ref(): typeof this;
    unref(): typeof this;
    detach(): void;
    [Symbol.dispose](): void;

    /** The program used for this render invocation */
    program: GlProgram;
    /** The state of the uniforms at the time of the render invocation. program.uniforms contains the memory layout of this buffer */
    uniformState: Uint8Array;
    /** Requires "texturesnapshot" or "texturecapture" feature at capture time. Map of sampler locations to their corresponding texture snapshots. Contains the exact texture state as it was at the time of the render. */
    samplers: { [location: number]: TextureSnapshot };
    /** Requires "textures" feature at capture time. Map of sampler locations to their corresponding tracked textures. No snapshot is made in this mode so texture state may change over time. */
    textures: { [location: number]: TrackedTexture };
    /** Requires "vertexarray" feature at capture time. The vertex array object (VAO) used for this render invocation. Contains the state of the vertex buffers and attributes. */
    vertexArray: VertexArraySnapshot;
    /** The index ranges that were rendered in this invocation. */
    renderRanges: RenderRange[];
    /** Primitive mode of the render call. "unknown" if the render was a line render or a compute call */
    renderMode: RenderMode | "unknown";
    /** OpenGL type constant of the index type of the vertex array */
    indexType: number;
    /** Id of the VAO bound during the render */
    vertexObjectId: number;
    /** Timestamp of the previous frameswap that started the current frame */
    lastFrameTime: number;
    /** Timestamp of the current frameswap call of which this render is a part */
    ownFrameTime: number;
    /** The viewport dimensions of the target framebuffer at the time of the render invocation */
    viewport: { x: number, y: number, width: number, height: number };
    /** Requires "framebuffer" feature at capture time. The color texture attached to the framebuffer at the time of the render invocation. undefined if the framebuffer was the default framebuffer */
    framebufferColorTexture: TrackedTexture | undefined;
    /** Id of the color texture attached to the framebuffer at the time of the render invocation. 0 if the framebuffer was the default framebuffer */
    framebufferColorTextureId: number;
    /** Requires "framebuffer" feature at capture time. The depth texture attached to the framebuffer at the time of the render invocation. undefined if there was no depth texture or if the framebuffer was the default framebuffer */
    framebufferDepthTexture: TrackedTexture | undefined;
    /** Id of the depth texture attached to the framebuffer at the time of the render invocation. 0 if there was no depth texture or if the framebuffer was the default framebuffer */
    framebufferDepthTextureId: number;
    /** Id of the framebuffer used for this render invocation. 0 if the default framebuffer was used */
    framebufferId: number;
    /** The frame number of that this render was part of. Increases by 1 for every frame output to the screen */
    framenr: number;
    /** Requires "computebindings" feature at capture time. The textures bound to the compute shader at the time of the render invocation. */
    computeTextures: { index: number, textureid: number, access: number, format: number }[];
    /** Requires "computebindings" feature at capture time. The buffers bound to the compute shader at the time of the render invocation. */
    computeBuffers: { index: number, bufferid: number }[];
}

/**
 * @deprecated
 */
export type GlState = {
    programs: { [id: number]: GlProgram },
    textures: { [id: number]: TrackedTexture }
}

export type RecordRenderOptions = {
    /**
     * maximum number of frames to capture, default unlimited
     */
    maxframes?: number,
    /**
     * maximum duration of the recording in ms, default unlimited
     */
    timeout?: number,
    /**
     * minimal time to wait between frames in ms when using streamRenderCalls, default 100ms. Set to 0 to capture every frame, but be aware that this can result in a very high number of render calls and might cause performance issues.
     */
    framecooldown?: number,
    /**
     * what features to capture
     * - vertexarray: capture vertex array object
     * - uniforms: capture uniform state
     * - textures: capture only what textures are bound at draw time, but not their contents
     * - texturesnapshot: capture texture snapshots as they were at draw time, does not include textures that are redrawn each frame
     * - texturecapture: fully captures textures as they were at draw, including textures that change every frame such as 3d render targets
     * - computebindings: captures information about SSBO and image bindings (different from textures)
     * - framebuffer: capture the framebuffer attachments at draw time
     * - full: capture all features (not recommended)
     */
    features?: ("vertexarray" | "uniforms" | "textures" | "texturesnapshot" | "texturecapture" | "computebindings" | "framebuffer" | "full")[],
} & RenderFilter;

export type RenderFilter = {
    /** maximum matches per frame, default unlimited */
    maxPerFrame?: number,
    /** only match draw calls that use this VAO */
    vertexObjectId?: number,
    /** only match draw calls that use this program */
    programId?: number,
    /** only match draw calls that render to this framebuffer */
    framebufferId?: number,
    /** only match draw calls that render to a framebuffer with this texture attached */
    framebufferTexture?: number,
    /** only match draw calls that render to a framebuffer with depth texture attached */
    framebufferDepth?: number,
    /** don't match draw calls that overlap these bitflags on the vertexArray skipmask */
    skipVerticesMask?: number,
    /** match only draw calls that overlap these bitflags on the vertexArray skipmask */
    useVerticesMask?: number,
    /** don't match draw calls that overlap these bitflags on the program skipmask */
    skipProgramMask?: number,
    /** match only draw calls that overlap these bitflags on the program skipmask */
    useProgramMask?: number,
    /** also match glDispatchCompute calls (these don't have a vertex array and don't render to a framebuffer), default false */
    includeCompute?: boolean,
    /** include normal glDraw* calls, default true */
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

export declare class GlOverlay {
    private constructor();
    /** Gets the current uniform state as a buffer. Can be used to inspect changes made to the uniform state by the overlay renders */
    getUniformState: () => Uint8Array;
    /** Update the uniform state with the provided buffer. */
    setUniformState: (data: Uint8Array) => void;
    /** stop drawing the overlay and release related resources */
    stop: () => void;
};

export type GlOverlayOption = {
    /** When to trigger the overlay, default "after". "before"/"after" render the overlay before or after the original render. "replace" prevents the original render and only draws the overlay. "frameend" triggers at the end of the frame, only useful for 2d overlays. "passive" does not affect rendering, this option can be used to trigger side-effects like updating captured uniforms. */
    trigger?: "before" | "after" | "replace" | "frameend" | "passive",
    /** Set to true to enabled translucent overlays. Default false when program is provided, inherits from original render otherwise */
    alphaBlend?: boolean,
    /** Which index ranges to render, default all if vertex array is present, otherwise inherits from original render */
    ranges?: RenderRange[],
    /** The type of primitives to draw */
    renderMode?: RenderMode,
    /** A buffer containing uniform state to draw with, defaults to the programs last rendered uniforms. (also affects `uniformSources`) */
    uniformBuffer?: Uint8Array,
    /** A list of commands to generate uniform values at draw time */
    uniformSources?: OverlayUniformSource[],
    /** A list of textures to bind at draw time. Samplers of the original render remain bound unless shadowed here. */
    samplers?: { [location: number]: TrackedTexture },
    /** Max duration of the overlay in milliseconds, indefinite if not specified */
    duration?: number
}

type HeapState = {
    size: number,
    free: number,
    used: number,
    // sanity: boolean,
    // allocs: number,
    // namedobjects: number,
    externalMemorySize: number,
    externalCount: number
}

/**
 * Represents a communication channel between the js world and the gl tracker running inside RS.
 * Currently only one session can exist at a time and this object is reused across sessions, but this will likely change in the future
 */
export declare class Alt1GlClient extends TypedEmitter<{ close: undefined }> {
    private constructor();

    /**
     * Captures a texture from OpenGL. texid -1 means the current framebuffer. width/height -1 means full size
     * @param texid the texture id to capture, -1 for the current framebuffer
     * @param x the x offset to capture from
     * @param y the y offset to capture from
     * @param w the width to capture, enter -1 to capture the full width of the texture
     * @param h the height to capture, enter -1 to capture the full height of the texture
     */
    capture(texid: number, x: number, y: number, w: number, h: number): Promise<ImageData>;

    //== core opengl ==
    /**
     * Records OpenGL render calls for one frame. This is the main way to get information about what is being rendered in RS. Either pass a filter to only capture specific calls, or only select specific information to capture about each call. Doing a full capture without filters results in a very large capture and should be avoided.
     * @param options Options object to filter which render calls to record and what information to capture about them
     */
    recordRenderCalls(options?: RecordRenderOptions): Promise<DisposableArray<RenderInvocation>>;
    /**
     * Similar to recordRenderCalls, but continuously streams render calls at the end of every frame until stopped. 
     * Defaults to a 100ms cooldown between frames to avoid overwhelming the client.
     * @param options Options object to filter which render calls to record and what information to capture about them.
     * @param callback Called at the end of every frame (when not on cooldown) with an array of matched render calls that frame.
     */
    streamRenderCalls(options: RecordRenderOptions, callback: (progress: DisposableArray<RenderInvocation>) => void): StreamRenderObject;

    /**
     * Gets the current state of the OpenGL context, including all programs and textures. This is a heavy call that should be avoided if possible. Use recordRenderCalls to get incremental information about programs and textures as they are used by render calls instead.
     */
    getOpenGlState(): Promise<GlState>;
    /**
     * Gets information about the renderer/driver versions, can be used to determine what features are likely supported by the driver
     */
    getRenderer(): RendererInfo;
    /**
     * Used for debugging/development, sets a callback that is called for every OpenGL call with the raw data of that call. Should not be used outside of debug apps (like the control panel app)
     * @param cb Callback function that receives the raw OpenGL call data, or null to disable the callback
     */
    setGlLogCb(cb: ((packet: { id: number, thread: number, data: Uint8Array }) => any) | null): void;
    /**
     * Gets a list of boolean toggles for what OpenGL calls ids to track in the gl log callback, used for debugging/development. Should not be used outside of debug apps (like the control panel app)
     * @return an array where each byte contains 0 or 1 for whether the OpenGL call with the corresponding id in the gl log callback is tracked
     */
    getGlLogToggles(): Uint8Array;
    /**
     * Updates the list of boolean toggles for what OpenGL calls ids to track in the gl log callback, used for debugging/development. Should not be used outside of debug apps (like the control panel app)
     * @param arr should be the same length as the array returned by getGlLogToggles, each byte contains 0 or 1 for whether to track the OpenGL call with the corresponding id in the gl log callback
     */
    setGlLogToggles(arr: Uint8Array): void;
    /**
     * Used to debug injected native code for OpenGL errors. If enabled the gl hooks will call glGetError in many places and emit them to `alt1.on("log", ...)`. On some drivers this can cause a significant performance decrease.
     */
    setCheckGlErrors(enabled: boolean): void;

    //== upload/overlay ==
    /**
     * Creates a shader program that can be used for overlays. Only vertex and fragment shaders stages are supported. The shader is compiled and linked at first use, so errors will only be thrown when the program is used for the first time.
     * @param vertexshader GLSL source code for the vertex shader stage
     * @param fragmentshader GLSL source code for the fragment shader stage
     * @param inputs A list of expected attributes on the bound vertex arrays at draw time
     * @param uniforms A list of uniforms that must be set at draw time. Uniforms are expected to be packed into a buffer instead of normal uniform uploads, this array describes how they are packed.
     */
    createProgram(vertexshader: string, fragmentshader: string, inputs: GlAttributeArgument[], uniforms: GlUniformArgument[]): GlProgram;
    /**
     * Creates a vertex array object (VAO) and its respective buffers that can be used for overlays. Outside of OpenGL this is called a mesh.
     * @param indexbuffer The element array buffer for this VAO. Indexes values are expected to be uint16 internally (TODO typing is weird here)
     * @param inputs A list of attributes and their respective buffers. Js Buffers are reused within one VAO creation so interleaved attributes are supported. Buffers are not reused across multiple VAOs
     */
    createVertexArray(indexbuffer: Uint8Array, inputs: RenderInput[]): VertexArraySnapshot;
    /**
     * Creates a texture that can be used for overlays.
     * @param img The image data for the texture, must be sRGBA u8 format (default in js) and less than 2048 in width and height.
     */
    createTexture(img: ImageData): TrackedTexture;
    /**
     * Begins an overlay rendering session. Overlays are triggered when a render call matches the specified filter, generally they are attached to a specific mesh by setting vertexObjectId in the filter. See documentation for @link{RenderFilter} and @link{GlOverlayOption} for more information on how to specify filters and overlay options.
     * @param trigger The filter for which render calls should trigger this overlay, see documentation for RenderFilter for more information.
     * @param prog The GL program to use for this overlay. If undefined, the original program of the render call will be used.
     * @param vertexarray The vertex array object (VAO) to use for this overlay. If undefined, the original vertex array of the render call will be used and some of the original render options will be inherited (like render ranges and alpha blending). 
     * @param options The options for this overlay, see documentation for GlOverlayOption for more information.
     */
    beginOverlay(trigger: RenderFilter, prog: GlProgram | undefined, vertexarray: VertexArraySnapshot | undefined, options: GlOverlayOption): GlOverlay;

    //== other/lifespan ==
    /**
     * Gets information about the current memory usage of the OpenGL context. There is only a fixed amount of memory before a soft crash happens in all apps.
     */
    memoryState(): HeapState;
    /**
     * Gets statistics about the number and estimated size of GL objects currently attached to js objects in this session. Use this to find memory leaks.
     */
    getGlObjectStats(): { size: number, count: number, counts: Record<string, number>, subsizes: Record<string, number> };
    /**
     * Gets information about all currently active shared memory partitions in this session. The first entry is the main shared memory heap, the others are off-loaded shared buffers for large singular objects.
     */
    getSharedMemorySizes(): number[];
    /**
     * Immediately stops the current session and releases all resources. This will detach all active GL objects and invalidate them.
     */
    close(): void
};

declare module "alt1" {
    interface Alt1EventType {
        log: { eventName: "log", message: string }
    }
}

declare global {
    namespace alt1 {
        var events: { [key: string]: ((e: any) => void)[] };
        var on: <T extends keyof a1lib.Alt1EventType>(event: T, listener: (e: a1lib.Alt1EventType[T]) => void) => void;
        var off: <T extends keyof a1lib.Alt1EventType>(event: T, listener: (e: a1lib.Alt1EventType[T]) => void) => void;
        var once: <T extends keyof a1lib.Alt1EventType>(event: T, listener: (e: a1lib.Alt1EventType[T]) => void) => void;
        var emit: <T extends keyof a1lib.Alt1EventType>(event: T, value: a1lib.Alt1EventType[T]) => void;

        function getGlSession(): Alt1GlClient;
    }
}