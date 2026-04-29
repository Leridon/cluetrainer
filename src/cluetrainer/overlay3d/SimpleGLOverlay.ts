import Behaviour from "../../lib/ui/Behaviour";
import {Alt1GLOverlay} from "../../lib/alt1/alt1gl/overlay/Alt1GLOverlay";
import {observe} from "../../lib/reactive";
import lodash from "lodash";
import {mat4} from "gl-matrix";
import {lazy} from "../../lib/Lazy";
import {Alt1GLProgram} from "../../lib/alt1/alt1gl/overlay/Alt1GLProgram";
import {Mesh} from "./meshes/Mesh";
import {Alt1} from "../../lib/alt1/Alt1";
import {GlProgram, RenderFilter, StreamRenderObject} from "../../lib/alt1/alt1gllib/ts/util/alt1gltypes";
import {tilesize} from "../../lib/alt1/alt1gllib/ts/render/reflect3d";
import {GL_FLOAT, GL_UNSIGNED_BYTE, UniformSnapshotBuilder} from "../../lib/alt1/alt1gllib/ts/overlays";

export const WORLD_UNITS_PER_TILE = tilesize;
const SKIP_PROGRAM_MASK = 1 << 5;

export class SimpleGLOverlay extends Behaviour {
  private overlays: Alt1GLOverlay[] = []

  constructor(private readonly geometry: Mesh) {
    super()
  }

  private updateOverlays(triggers: RenderFilter[]) {
    // Partition existing overlays in keep/remove
    const [keep, remove] = lodash.partition(this.overlays,
      (o: Alt1GLOverlay) => triggers.some(t => lodash.isEqual(t, o.renderFilter)))

    // Stop removed overlay
    remove.forEach(o => o.stop())

    this.overlays = keep

    const new_triggers = triggers.filter(t => !this.overlays.some(o => lodash.isEqual(o.renderFilter, t)))

    new_triggers.forEach(t => {
      const uniforms = new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4"
      });

      const world_matrix = mat4.create();

      mat4.fromScaling(world_matrix, [WORLD_UNITS_PER_TILE, WORLD_UNITS_PER_TILE, WORLD_UNITS_PER_TILE])

      uniforms.mappings.uModelMatrix.write(
        world_matrix as number[]
      );

      this.overlays.push(new Alt1GLOverlay(
        Alt1.instance().opengl,
        t,
        SimpleGLOverlay.program.get(),
        this.geometry.vertexArray(),
        {
          uniformSources: [
            {type: "program", name: "uViewProjMatrix", sourceName: "uViewProjMatrix"}
          ],
          uniformBuffer: uniforms.buffer
        }
      ).start())
    })

    if (this.isActive()) this.overlays.forEach(o => o.start())
  }

  protected begin() {
    // Subscribe to the observable triggers
    SimpleGLOverlay.TriggerManagement.instance.active_triggers.subscribe(
      t => this.updateOverlays(t),
      true,
      h => h.bindTo(this.lifetime_manager)
    )
  }

  protected end() {
    this.overlays.forEach(o => o.stop())
  }
}

export namespace SimpleGLOverlay {
  export const program = lazy(() => {
    const vertshader = `
    #version 330 core
    layout (location = 0) in vec3 aPos;
    layout (location = 6) in vec4 aColor;
    uniform highp mat4 uModelMatrix;
    uniform highp mat4 uViewProjMatrix;
    uniform highp vec2 uMouse;
    out vec4 ourColor;
    out vec3 FragPos;
    void main() {
        vec4 worldpos = uModelMatrix * vec4(aPos, 1.);
        gl_Position = uViewProjMatrix * worldpos;
        FragPos = worldpos.xyz/worldpos.w;
        ourColor = aColor;
    }`;

    const fragshader = `
    #version 330 core
    in vec4 ourColor;
    out vec4 FragColor;
    void main() {
        FragColor = ourColor;
    }`;

    return new Alt1GLProgram(
      vertshader,
      fragshader,
      [
        {location: 0, name: "aPos", type: GL_FLOAT, length: 3},
        {location: 6, name: "aColor", type: GL_UNSIGNED_BYTE, length: 4}
      ],
      new UniformSnapshotBuilder({
        uModelMatrix: "mat4",
        uViewProjMatrix: "mat4"
      }).args
    )
  })

  export class TriggerManagement extends Behaviour {
    public readonly active_triggers = observe<RenderFilter[]>([]).structuralEquality();

    private stream: StreamRenderObject | null = null;

    constructor() {
      super()

      // TODO: Only stream render calls when active_filters has at least one observer
    }

    end(): void {
      console.log(`Trigger management end`)
      this.stream?.close();
    }

    begin(): void {

      console.log(`Trigger management begin ${Alt1.instance().featureGl}`)

      if (Alt1.instance().featureGl) {
        this.stream = Alt1.instance().opengl.get().streamRenderCalls({
          features: ["uniforms"],
          framecooldown: 10000,
          skipProgramMask: SKIP_PROGRAM_MASK,
        }, renders => {
          const new_triggers: RenderFilter[] = [...this.active_triggers.value()]

          for (const render of renders) {
            if (TriggerManagement.isProgramRelevantForChunkRendering(render.program)) {
              if (!new_triggers.some(p => p.programId == render.program.programId)) {
                new_triggers.push({programId: render.program.programId, maxPerFrame: 1});
              }
            } else {
              // Mark irrelevant programs with our skip mask so we do not check them again
              render.program.skipmask |= SKIP_PROGRAM_MASK;
            }
          }
          this.active_triggers.set(new_triggers)
          console.log(`New trigger count ${new_triggers.length}`)
        });
      }
    }

    static _instance = lazy(() => new TriggerManagement().start())

    static get instance(): TriggerManagement {
      return TriggerManagement._instance.get()
    }
  }

  export namespace TriggerManagement {
    export function isProgramRelevantForChunkRendering(program: GlProgram): boolean {
      return program.inputs.find(q => q.name == "aMaterialSettingsSlotXY3") != null
    }
  }
}