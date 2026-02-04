import {lazy} from "../Lazy";
import {type Alt1GlClient} from "./ts/util/patchrs_napi";

declare global {
  interface Window {
    alt1gl: Alt1GlClient;
  }
}

export class Alt1GL {

  constructor(public readonly native: Alt1GlClient) {
    console.log("Height: " + native.getRsHeight())
    console.log("Width: " + native.getRsWidth())
  }

  static _instance = lazy(() => {
    if(!window.alt1gl) {
      throw new Error("Alt1GL is not available. Make sure Clue Trainer runs within an alt1gl environment.")
    }

    return new Alt1GL(globalThis.alt1gl)
  })

  static instance(): Alt1GL {
    return this._instance.get()
  }
}

export namespace Alt1GL {
  export function exists(): boolean {
    return !!window.alt1gl
  }
}