
import { mat4 } from "gl-matrix";
import { Submodel } from "./avautils";
import { boundMethod } from "autobind-decorator";
import { newDragHandler } from "../../util/util";

export type ModelInfo = {
	enabled: boolean,
	glboundVertexBuffer: WebGLBuffer,
	glboundIndexBuffer: WebGLBuffer,
	glboundTexture: WebGLTexture,
	glboundBones: WebGLTexture,
	model: Submodel
}

export function detectWebglSupport() {
	try {
		if (typeof document == "undefined") { return false; }
		var cnv = document.createElement("canvas");
		var ctx = cnv.getContext("webgl2");
		if (!ctx) { return false; }
		return true;
	} catch (e) {
		return false;
	}
}

function defaultCam() {
	return {
		hor: Math.PI,
		ver: 0,
		zoom: 1 / 150,
		fov: 45,
		dx: 0,
		dy: 0,
		worldx: 0,
		worldy: -380,
		worldz: 0
	};
	return {
		hor: Math.PI / 4,
		ver: Math.PI / 4,
		zoom: 1 / 2000,
		fov: 45,
		dx: 0,
		dy: 0,
		worldx: 0,
		worldy: 0,
		worldz: 0
	};
}

var oldcam: ReturnType<typeof defaultCam> | null = null;

export class AvaViewer {
	canvas: HTMLCanvasElement;
	menu: HTMLDivElement;
	root: HTMLDivElement;
	gl: WebGL2RenderingContext;

	uniforms = {
		uViewMatrix: null as WebGLUniformLocation | null,
		uModelMatrix: null as WebGLUniformLocation | null,
		uSampler: null as WebGLUniformLocation | null,
		uBoneSampler: null as WebGLUniformLocation | null,
		uBoneAnim: null as WebGLUniformLocation | null,
		uEnableTextures: null as WebGLUniformLocation | null
	};
	attriubtes: { [name: string]: number } = {};
	camera = oldcam || defaultCam();

	models: ModelInfo[] = [];
	toggles = {
		textures: true,
		scrollzoom: true,
		animated: false
	}

	boundeventnode: HTMLElement | null = null;

	constructor(w: number, h: number) {
		this.canvas = document.createElement("canvas");
		this.menu = document.createElement("div");
		this.root = document.createElement("div");
		this.root.appendChild(this.canvas);
		this.root.appendChild(this.menu);
		this.menu.style.cssText = "position:absolute; z-index:2; top:0px; left:0px; overflow-y:auto; white-space:nowrap; max-height:100%;";
		this.renderMenu();

		var gl = this.canvas.getContext("webgl2");
		if (!gl) { throw new Error("webgl is not supported on this device"); }
		this.gl = gl;
		oldcam = this.camera;
		this.loadShaders();
		this.attachevents(this.canvas)

		this.gl.clearColor(0, 0, 0, 0);
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		this.gl.cullFace(this.gl.BACK);

		//this.gl.disable(this.gl.DEPTH_TEST);

		this.resize(w, h);
	}

	@boundMethod
	mousedownEvent(e: MouseEvent | TouchEvent) {
		//firefox doesnt have touchevent in global scope on dekstop
		var cantouch = !!(window as any).TouchEvent;
		var verticaltouchlock = true;
		var hortravel = 0;
		var vertravel = 0;
		newDragHandler(e, (s, end) => {
			var speed = (cantouch && e instanceof TouchEvent ? 2 : 1);
			var isleftmouse = e instanceof MouseEvent && (e.buttons & 1) || cantouch && e instanceof TouchEvent;
			if ((e instanceof MouseEvent && (e.buttons & 4)) || isleftmouse && e.ctrlKey) {
				var dx = s.dx / this.camera.zoom / 100;
				var dz = s.dy / this.camera.zoom / 100;
				this.camera.worldx += Math.cos(this.camera.hor) * dx - Math.sin(this.camera.hor) * dz
				this.camera.worldz += Math.sin(this.camera.hor) * dx + Math.cos(this.camera.hor) * dz;
			} else if (isleftmouse && e.shiftKey) {
				this.camera.dx += s.dx / this.canvas.width / this.camera.zoom * 5;
				this.camera.dy -= s.dy / this.canvas.height / this.camera.zoom * 5;
			} else if (isleftmouse) {
				this.camera.hor += s.dx / 200 * speed;
				if (cantouch && e instanceof TouchEvent) {
					hortravel += Math.abs(s.dx);
					vertravel += Math.abs(s.dy);
					//if (vertravel > hortravel && vertravel > 20) { window.scrollBy(0, -s.dy); verticaltouchlock = false; }
				}
				else { this.camera.ver += s.dy / 200 * speed; }
			}
			this.draw();
		});
		if (e instanceof MouseEvent) {
			e.preventDefault();
			window.getSelection()?.empty();
		}
	}

	@boundMethod
	wheelEvent(e: WheelEvent) {
		this.camera.zoom *= 1 - e.deltaY / 500;
		this.camera.hor -= e.deltaX / 100 * (Math.PI * 2) / 16;
		this.draw();
		e.preventDefault();
	}

	attachevents(el: HTMLElement | null) {
		if (this.boundeventnode) {
			this.boundeventnode.removeEventListener("touchstart", this.mousedownEvent);
			this.boundeventnode.removeEventListener("mousedown", this.mousedownEvent);
			this.boundeventnode.removeEventListener("wheel", this.wheelEvent);

			this.boundeventnode = null;
		}
		if (el) {
			el.addEventListener("mousedown", this.mousedownEvent);
			el.addEventListener("touchstart", this.mousedownEvent);
			if (this.toggles.scrollzoom) {
				el.addEventListener("wheel", this.wheelEvent);
			}
			this.boundeventnode = el;
		}
	}

	renderMenu() {
		var frag = document.createDocumentFragment();
		var addbuttton = (txt: string, toggled: boolean, onclick: () => any) => {
			var sub = document.createElement("div");
			sub.innerText = txt;
			sub.onclick = () => {
				onclick();
				this.renderMenu()
				this.draw();;
			}
			sub.style.background = (toggled ? "white" : "gray");
			frag.appendChild(sub);
		}
		addbuttton("textures", this.toggles.textures, () => {
			this.toggles.textures = !this.toggles.textures;
		});
		addbuttton("disable all", false, () => {
			this.models.forEach(m => m.enabled = false);
		});
		addbuttton("enable all", false, () => {
			this.models.forEach(m => m.enabled = true);
		});
		for (var a = 0; a < this.models.length; a++) {
			var model = this.models[a];
			addbuttton("model " + a, !model.enabled, ((model: ModelInfo) => {
				model.enabled = !model.enabled;
			}).bind(this, model));
		}
		this.menu.innerHTML = "";
		this.menu.appendChild(frag);
	}

	resize(w: number, h: number) {
		this.canvas.width = w;
		this.canvas.height = h;
		this.draw();
	}

	loadShaders() {
		var fragmentsrc: string = require("raw-loader!./shaders/avatar_fragment.glsl").default;
		var vertexsrc: string = require("raw-loader!./shaders/avatar_vertex.glsl").default;

		var fragment = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		if (!fragment) { throw new Error("failed to create fragment shader"); }
		this.gl.shaderSource(fragment, fragmentsrc);
		this.gl.compileShader(fragment);
		if (!this.gl.getShaderParameter(fragment, this.gl.COMPILE_STATUS)) { throw this.gl.getShaderInfoLog(fragment); }

		var vertex = this.gl.createShader(this.gl.VERTEX_SHADER);
		if (!vertex) { throw new Error("failed to create vertex shader"); }
		this.gl.shaderSource(vertex, vertexsrc);
		this.gl.compileShader(vertex);
		if (!this.gl.getShaderParameter(vertex, this.gl.COMPILE_STATUS)) { throw this.gl.getShaderInfoLog(vertex); }

		var prog = this.gl.createProgram();
		if (!prog) { throw new Error("failed to create gl program"); }
		this.gl.attachShader(prog, vertex);
		this.gl.attachShader(prog, fragment);
		this.gl.linkProgram(prog);

		if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) { throw new Error("Could not initialise shaders"); }

		this.gl.useProgram(prog);
		this.attriubtes.aVertexPosition = this.gl.getAttribLocation(prog, "aVertexPosition");
		this.attriubtes.aVertexColor = this.gl.getAttribLocation(prog, "aVertexColor");
		this.attriubtes.aSubTexInfo = this.gl.getAttribLocation(prog, "aSubTexInfo");
		this.attriubtes.aTexSubUV = this.gl.getAttribLocation(prog, "aTexSubUV");
		this.attriubtes.aVertexFlags = this.gl.getAttribLocation(prog, "aVertexFlags");
		this.attriubtes.aBoneId = this.gl.getAttribLocation(prog, "aBoneId");
		this.gl.enableVertexAttribArray(this.attriubtes.aVertexPosition);
		this.gl.enableVertexAttribArray(this.attriubtes.aVertexColor);
		this.gl.enableVertexAttribArray(this.attriubtes.aSubTexInfo);
		this.gl.enableVertexAttribArray(this.attriubtes.aTexSubUV);
		this.gl.enableVertexAttribArray(this.attriubtes.aVertexFlags);
		this.gl.enableVertexAttribArray(this.attriubtes.aBoneId);

		this.uniforms.uViewMatrix = this.gl.getUniformLocation(prog, "uViewMatrix");
		this.uniforms.uModelMatrix = this.gl.getUniformLocation(prog, "uModelMatrix");
		this.uniforms.uSampler = this.gl.getUniformLocation(prog, 'uSampler');
		this.uniforms.uBoneSampler = this.gl.getUniformLocation(prog, "uBoneSampler");
		this.uniforms.uBoneAnim = this.gl.getUniformLocation(prog, "uBoneAnim");
		this.uniforms.uEnableTextures = this.gl.getUniformLocation(prog, "uEnableTextures");
	}

	addModel(modeldata: Submodel) {
		var vertexbuf = this.gl.createBuffer();
		var indexbuf = this.gl.createBuffer();
		if (!vertexbuf || !indexbuf) { throw new Error("failed to create vertex buffer"); }
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexbuf);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, modeldata.vertexData.buffer, this.gl.STATIC_DRAW);
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexbuf);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, modeldata.vertexData.indices, this.gl.STATIC_DRAW);

		var texturematch = this.models.find(m => m.model.texture == modeldata.texture);
		var colortexture: WebGLTexture;
		if (texturematch) {
			colortexture = texturematch.glboundTexture;
		}
		else {
			var tex = this.gl.createTexture();
			if (!tex) { throw new Error("Failed to create texture"); }
			colortexture = tex;
			this.gl.bindTexture(this.gl.TEXTURE_2D, colortexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, modeldata.texture.width, modeldata.texture.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, modeldata.texture);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		}
		var bonematch = this.models.find(m => m.model.boneuniform == modeldata.boneuniform);
		var bonetexture: WebGLTexture;
		if (bonematch) {
			bonetexture = bonematch.glboundBones;
		} else {
			var tex = this.gl.createTexture();
			if (!tex) { throw new Error("failed to create new texture"); }
			bonetexture = tex;
			this.gl.bindTexture(this.gl.TEXTURE_2D, bonetexture);
			this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA32F, 4, modeldata.boneuniform.length / 16, 0, this.gl.RGBA, this.gl.FLOAT, modeldata.boneuniform);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		}
		var model: ModelInfo = {
			enabled: true,
			model: modeldata,
			glboundIndexBuffer: indexbuf,
			glboundTexture: colortexture,
			glboundVertexBuffer: vertexbuf,
			glboundBones: bonetexture,
		};
		this.models.push(model);
		this.renderMenu();
		this.draw();
		return model;
	}

	freemodel(model: ModelInfo) {
		this.gl.deleteBuffer(model.glboundBones);
		this.gl.deleteBuffer(model.glboundIndexBuffer);
		this.gl.deleteBuffer(model.glboundVertexBuffer);
		this.gl.deleteTexture(model.glboundTexture);
		this.models.splice(this.models.indexOf(model), 1);
	}

	draw() {
		requestAnimationFrame(this.drawInner);
	}

	lastdraw = 0;
	@boundMethod
	drawInner(timestamp?: number) {
		if (!timestamp) { timestamp = performance.now(); }
		if (this.lastdraw == timestamp) { return; }
		this.lastdraw = timestamp;
		//animated and visible on screen
		if (this.toggles.animated && this.canvas.offsetWidth != 0) { requestAnimationFrame(this.drawInner); }

		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		var modeltr = mat4.create()
		mat4.identity(modeltr);
		mat4.rotateX(modeltr, modeltr, this.camera.ver);
		mat4.rotateY(modeltr, modeltr, -this.camera.hor);
		mat4.translate(modeltr, modeltr, [-this.camera.worldx, this.camera.worldy, this.camera.worldz]);

		var viewtr = mat4.create();
		//pretty agressive clipping place, mobile devices seem to have low precision z bufers
		mat4.perspective(viewtr, this.camera.fov, this.canvas.width / this.canvas.height, 2, 30.0);
		mat4.translate(viewtr, viewtr, [0, 0.0, -7.0]);
		mat4.scale(viewtr, viewtr, [this.camera.zoom, this.camera.zoom, this.camera.zoom]);
		mat4.translate(viewtr, viewtr, [this.camera.dx, this.camera.dy, 0]);
		mat4.scale(viewtr, viewtr, [-1, 1, 1]);//TODO find out why everything is flipped if i don't do this...

		this.gl.uniform1f(this.uniforms.uEnableTextures, (this.toggles.textures ? 1 : 0));

		for (var model of this.models) {
			if (!model.enabled) { continue; }
			//fix uniforms
			var subview = mat4.clone(modeltr);
			mat4.mul(subview, subview, model.model.modeltransform);
			this.gl.uniformMatrix4fv(this.uniforms.uModelMatrix, false, subview);
			this.gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, viewtr);

			//update vertex attribs
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.glboundVertexBuffer);
			this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, model.glboundIndexBuffer);

			for (var attr of model.model.vertexData.layout) {
				if (this.attriubtes[attr.name] === undefined) { console.warn("unused render param " + attr.name); continue; }
				this.gl.vertexAttribPointer(this.attriubtes[attr.name], attr.veclength, attr.gltype, attr.normalize, attr.bytestride, attr.byteoffset);
			}

			//fix texture
			this.gl.activeTexture(this.gl.TEXTURE0);
			this.gl.bindTexture(this.gl.TEXTURE_2D, model.glboundTexture);
			this.gl.uniform1i(this.uniforms.uSampler, 0);

			//animation bones
			this.gl.activeTexture(this.gl.TEXTURE1);
			this.gl.bindTexture(this.gl.TEXTURE_2D, model.glboundBones);
			this.gl.uniform1i(this.uniforms.uBoneSampler, 1);
			var animtimes = model.model.boneKeyframes;
			if (model.model.boneKeyframes.length > 1) {
				//timestamp = this.camera.hor * 500;
				var lastframe = animtimes.length - 1;
				var time = timestamp % animtimes[lastframe].time;
				var frame1 = animtimes.findIndex(t => t.time > time);
				var frame0 = (frame1 == 0 ? lastframe : frame1 - 1);
				var interp = (time - animtimes[frame0].time) / (animtimes[frame1].time - animtimes[frame0].time);
				this.gl.uniform3i(this.uniforms.uBoneAnim, animtimes[frame0].offset, animtimes[frame1].offset, Math.round(interp * 512));
			}
			else {
				this.gl.uniform3i(this.uniforms.uBoneAnim, 0, 0, 0);
			}

			//draw
			this.gl.drawElements(model.model.drawmode, model.model.vertexData.indices.length, this.gl.UNSIGNED_SHORT, 0);
		}
	}
}
