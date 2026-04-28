import {Alt1GL} from "../Alt1GL";
import {GlAttributeArgument, GlProgram, GlUniformArgument} from "../ts/util/patchrs_napi";

export class Alt1GLProgram {
  public readonly program: GlProgram

  constructor(
    public readonly vertex_shader: string,
    public readonly fragment_shader: string,
    public readonly inputs: GlAttributeArgument[],
    public readonly uniforms: GlUniformArgument[]
  ) {
    this.program = Alt1GL.instance().native.createProgram(
      this.vertex_shader,
      this.fragment_shader,
      this.inputs,
      this.uniforms
    )

  }

  get(): GlProgram {
    return this.program
  }
}