import { ImgRefData } from "alt1";
import * as fsimport from "fs";
import a1lib from "./alt1plug";
import "./shims";


export function inrange(x: number, a: number, b: number) {
	return x >= a && x < b;
}

// awkward workaround to deal with fs not being available CEF
export const fs = fsimport?.promises;

//weird generics on fallback to force ts to use the stricter type provided by map
export function getOrInsert<K, V>(map: Map<K, V>, key: K, fallback: () => (V extends never ? never : V)): V {
	let val = map.get(key);
	if (val === undefined) {
		val = fallback();
		map.set(key, val);
	}
	return val;
}

export function bufferToBase64(buf: Uint8Array) {
	let binary = "";
	let len = buf.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(buf[i]);
	}
	return btoa(binary);
}

export function flipImagedata(buf: ImageData) {
	let stride = buf.width * 4;
	for (let y = 0; y < buf.height / 2; y++) {
		let topindex = y * stride;
		let botindex = (buf.height - 1 - y) * stride;
		let cpy = buf.data.slice(topindex, topindex + stride);
		buf.data.copyWithin(topindex, botindex, botindex + stride);
		buf.data.set(cpy, botindex);
	}
}

export function copyStylesToFrame(from: HTMLDocument, to: HTMLDocument) {
	var arrStyleSheets = from.getElementsByTagName("style");
	for (var i = 0; i < arrStyleSheets.length; i++) {
		to.head.appendChild(arrStyleSheets[i].cloneNode(true));
	}
}

export async function timedRetryCb<T>(timelimit: number, name = "unknown", cb: () => T | Promise<T>) {
	var t = Date.now();
	while (true) {
		let r = await cb();
		if (r) { return r as any as NonNullable<T>; }
		if (Date.now() - t > timelimit) {
			throw new Error(`Timedretry "${name}" failed to complete in ${timelimit}ms`);
		}
		await delay(100);
	}
}

export async function captureFullRsAsync() {
	let img = await a1lib.captureAsync(0, 0, alt1.rsWidth, alt1.rsHeight);
	return new ImgRefData(img, 0, 0);
}

export function delay(t: number) {
	return new Promise(done => setTimeout(done, t));
}

export var TextEncoderPolyfill = (typeof TextEncoder != "undefined" ? TextEncoder : require("util").TextEncoder) as typeof TextEncoder;
export var TextDecoderPolyfill = (typeof TextDecoder != "undefined" ? TextDecoder : require("util").TextDecoder) as typeof TextDecoder;


/**
 * used to get an array with enum typing
 */
export function arrayEnum<Q extends string>(v: Q[]) {
	return v;
}

export function filedownload(filename: string, url: string) {
	var element = document.createElement('a');
	element.setAttribute('href', url);
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}

export type DragHandlerState = { x: number, y: number, dx: number, dy: number, sx: number, sy: number, end: boolean, start: boolean };
export function newDragHandler(startevent: MouseEvent | React.MouseEvent | Touch | TouchEvent, movefunc?: (state: DragHandlerState, end: boolean) => any, mindist = 0) {
	var locked = mindist != 0;
	var mouseloc: DragHandlerState;
	//type juggling because firefox doesnt know what touchevent is
	if ((window as any).TouchEvent && startevent instanceof TouchEvent) { startevent = startevent.touches[0]; }
	var mousedownevent: Exclude<typeof startevent, TouchEvent> = startevent as any;


	var clientdx = mousedownevent.clientX - mousedownevent.screenX;
	var clientdy = mousedownevent.clientY - mousedownevent.screenY;

	//TODO screenX approach breaks when zoomed or clientx is required
	var x = mousedownevent.screenX + clientdx;
	var y = mousedownevent.screenY + clientdy;
	var init = function () { mouseloc = { x: x, y: y, dx: 0, dy: 0, sx: x, sy: y, end: false, start: true }; }
	init();

	var moved = function (e, end) {
		var x = e.screenX + clientdx;
		var y = e.screenY + clientdy;
		var dx = x - mouseloc.x;
		var dy = y - mouseloc.y;
		if (locked && Math.abs(dx) + Math.abs(dy) >= mindist) {
			locked = false;
		}
		if (!locked) {
			mouseloc.end = end;
			mouseloc.dx = dx;
			mouseloc.dy = dy;
			mouseloc.x = x;
			mouseloc.y = y;
			movefunc && movefunc(mouseloc, end);
			mouseloc.start = false;
		}
	}


	var mousemove = function (e) {
		if (e.touches) { e = e.touches[0]; }
		moved(e, false);
	};
	var mouseup = function (e) {
		if (e.touches) {
			e = e.touches[0];
		}
		if (e) { moved(e, true); }
		window.removeEventListener("mousemove", mousemove);
		window.removeEventListener("mouseup", mouseup);
		window.removeEventListener("touchmove", mousemove);
		window.removeEventListener("touchend", mouseup);
	}

	window.addEventListener("mousemove", mousemove, { passive: true });
	window.addEventListener("mouseup", mouseup);
	window.addEventListener("touchmove", mousemove, { passive: true });
	window.addEventListener("touchend", mouseup);
}

export class TypedEmitter<T extends Record<string, any>> {
	private listeners: { [key in keyof T]?: Set<(v: T[key]) => void> } = {};
	on<K extends keyof T>(event: K, listener: (v: T[K]) => void) {
		let listeners = this.listeners[event] ?? (this.listeners[event] = new Set());
		listeners.add(listener);
		this.listenersChanged(event, listeners);
	}
	once<K extends keyof T>(event: K, listener: (v: T[K]) => void) {
		let listeners = this.listeners[event] ?? (this.listeners[event] = new Set());
		let oncer = (v: T[K]) => {
			listeners.delete(oncer);
			listener(v);
		}
		listeners.add(oncer);
		this.listenersChanged(event, listeners);
	}

	off<K extends keyof T>(event: K, listener: (v: T[K]) => void) {
		let listeners = this.listeners[event] ?? (this.listeners[event] = new Set());
		listeners.delete(listener);
		this.listenersChanged(event, listeners);
	}
	emit<K extends keyof T>(event: K, value: T[K]) {
		let listeners = this.listeners[event] ?? (this.listeners[event] = new Set());
		listeners.forEach(cb => cb(value));
	}

	listenersChanged<K extends keyof T>(event: K, listeners: Set<(v: T[K]) => void>) {
		//can be overwritten
	}
}

export type numbermat4x4 = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
export type numbermat3x3 = [number, number, number, number, number, number, number, number, number];
export type numbermat2x3 = [number, number, number, number, number, number];
export function mat3ToCtxArgs(mat: { elements: number[] } /* THREE.Matrix3 */) {
	if (mat.elements[2] != 0 || mat.elements[5] != 0 || mat.elements[8] != 1) {
		console.log("matrix3 is not an 2d transform");
	}
	return [
		mat.elements[0], mat.elements[1],
		mat.elements[3], mat.elements[4],
		mat.elements[6], mat.elements[7]
	] as numbermat2x3;
}

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any
