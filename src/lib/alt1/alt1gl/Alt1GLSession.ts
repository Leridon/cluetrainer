import {Alt1} from "../Alt1";
import {Alt1GlClient} from "../alt1gllib/ts/util/alt1gltypes";
import {Log} from "../../util/Log";
import log = Log.log;

export class Alt1GLSession {
  public session: Alt1GlClient

  constructor(private readonly alt1: Alt1) {
    this.refreshSession()
  }

  private refreshSession() {
    const session = this.alt1.raw.getGlSession()
    session.on("close", () => {
      log().log("Alt1GLSession crashed, refreshing...", "Alt1GL")
      this.refreshSession()
    })

    this.session = session
  }

  public raw(): Alt1GlClient {
    return this.session
  }
}