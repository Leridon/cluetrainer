import {GlAttributeArgument, GlProgram, GlUniformArgument} from "../../alt1gllib/ts/util/alt1gltypes";
import {Alt1} from "../../Alt1";

export class Alt1GLProgram {
  public readonly program: GlProgram

  constructor(
    public readonly vertex_shader: string,
    public readonly fragment_shader: string,
    public readonly inputs: GlAttributeArgument[],
    public readonly uniforms: GlUniformArgument[]
  ) {
    this.program = Alt1.instance().opengl().get().createProgram(
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