import {Alt1} from "../Alt1";
import {Alt1GlClient} from "../alt1gllib/ts/util/alt1gltypes";

export class Alt1GLSession {
  public session: Alt1GlClient

  constructor(private readonly alt1: Alt1) {
    this.refreshSession()
  }

  private refreshSession() {
    const session = this.alt1.raw.getGlSession()
    session.on("close", () => this.refreshSession())

    this.session = session
  }

  public raw(): Alt1GlClient {
    return this.session
  }
}