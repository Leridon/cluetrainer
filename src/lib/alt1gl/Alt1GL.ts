import {lazy} from "../Lazy";
import * as patch from "../alt1gl/ts/util/patchrs_napi";

declare global {
  interface Window {
    alt1gl: typeof patch.native;
  }
}

export class Alt1GL {

  constructor(public readonly native: patch.Alt1GlClient) {
    console.log("Height: " + native.getRsHeight())
    console.log("Width: " + native.getRsWidth())
  }

  static _instance = lazy(() => {
    function getApi() {

      //this will probably be something like window.alt1.openGlClient() in the future
      patch.hookFirstClient();
      return patch.native;
    }

    globalThis.alt1gl = getApi();

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