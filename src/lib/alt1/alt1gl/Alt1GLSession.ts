import {Alt1} from "../Alt1";
import {Alt1GlClient} from "../alt1gllib/ts/util/alt1gltypes";
import {Log} from "../../util/Log";
import log = Log.log;

export class Alt1GLSession {
  private session: Alt1GlClient

  constructor(private readonly alt1: Alt1) {
  }

  private refreshSession() {
    if (!this.alt1.featureGl || !this.alt1.raw.permissionGLApi) {
      return
    }

    const session = this.alt1.raw.getGlSession()

    session.setCheckGlErrors(true)

    session.on("close", () => {
      log().log("Alt1GLSession crashed, refreshing...", "Alt1GL")
      this.refreshSession()
    })

    this.session = session
  }

  public get(): Alt1GlClient {
    if (!this.session) this.refreshSession()

    return this.session
  }

  public raw(): Alt1GlClient {
    return this.session
  }
}