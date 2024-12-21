import Behaviour from "../../../lib/ui/Behaviour";
import {Path} from "../../../lib/runescape/pathing";
import Widget from "../../../lib/ui/Widget";
import * as lodash from "lodash";
import NeoSolvingBehaviour from "./NeoSolvingBehaviour";
import {C} from "../../../lib/ui/constructors";
import {SolvingMethods} from "../../model/methods";
import {AugmentedMethod} from "../../model/MethodPackManager";
import {NislIcon} from "../nisl";
import {PathStepEntity} from "../map/entities/PathStepEntity";
import {util} from "../../../lib/util/util";
import {TreeArray} from "../../../lib/util/TreeArray";
import * as assert from "assert";
import {ewent, Observable, observe} from "../../../lib/reactive";
import {TemplateResolver} from "../../../lib/util/TemplateResolver";
import {GameLayer} from "../../../lib/gamemap/GameLayer";
import KeyValueStore from "../../../lib/util/KeyValueStore";
import {PathStepHeader} from "../pathing/PathStepHeader";
import {deps} from "../../dependencies";
import {lazy} from "../../../lib/properties/Lazy";
import {ScanTree} from "../../../lib/cluetheory/scans/ScanTree";
import hbox = C.hbox;
import span = C.span;
import GenericPathMethod = SolvingMethods.GenericPathMethod;
import hboxl = C.hboxl;
import SectionedPath = Path.SectionedPath;
import index = util.index;

export class SectionMemory {

  public readonly data = KeyValueStore.instance().variable<Record<string, number[]>>("preferences/pathsectionmemory")

  private constructor() {
    if (!this.data.get()) {
      this.data.set({})
    }
  }

  private hash(method: AugmentedMethod, sub_id?: string): string {
    if (sub_id) return method.pack.local_id + method.method.id + sub_id

    return method.pack.local_id + method.method.id
  }

  async get(method: AugmentedMethod, sub_id?: string): Promise<number[]> {
    return (await this.data.get()) ?. [this.hash(method, sub_id)]
  }

  async store(method: AugmentedMethod, section: number[], sub_id?: string) {
    const value = (await this.data.get()) ?? {}

    value[this.hash(method, sub_id)] = section

    await this.data.set(value)
  }

  private static _instance = lazy(() => new SectionMemory())

  static instance(): SectionMemory {
    return SectionMemory._instance.get()
  }
}

export class PathDisplayWithSectionControl extends Widget {
  section_selected = ewent<Path.raw>()

  public selected_section: Path.raw = undefined

  constructor(
    private sections: SectionedPath,
    public current_section_id: number[],
    private step_graphics: TreeArray<PathStepEntity, {}>,
    private template_resolver: TemplateResolver,
  ) {
    super()

    this.render()
  }

  render() {
    this.empty()

    if (this.sections && this.current_section_id) {
      let section_link = TreeArray.getPath(this.sections, this.current_section_id)

      {
        section_link.forEach((node, i) => {
          if (i == 0 || node?.type != "inner") return // Ignore root node and steps

          let parent = section_link[i - 1]

          assert(parent.type == "inner")

          if (parent.children.length <= 1) return // Don't draw section controls if there is just one

          let section_id = parent.children.indexOf(node)

          if (node.type == "inner") {
            hbox(
              section_id > 0 ? NislIcon.arrow("left").withClick(() => {
                let cp = lodash.clone(this.current_section_id)
                cp[i - 1] -= 1
                this.setCurrentSection(cp)
              }) : undefined,
              span(node.value.name).css("flex-grow", "1").css("text-align", "center"),
              section_id < parent.children.length - 1 ? NislIcon.arrow("right").withClick(() => {
                let cp = lodash.clone(this.current_section_id)
                cp[i - 1] += 1
                this.setCurrentSection(cp)
              }) : undefined,
            )
              .appendTo(this)
          }
        })
      }

      this.selected_section = (() => {
        let n = index(section_link, -2)
        assert(n.type == "inner")

        return n.children.map(c => {
          assert(c.type == "leaf")
          return c.value
        })
      })()

      if (deps().app.settings.settings.solving.info_panel.path_step_list == "show") {
        this.selected_section.forEach((step, index) => {
          let sectionindex = lodash.clone(this.current_section_id)
          sectionindex[sectionindex.length - 1] = index

          let graphics_node = TreeArray.index(this.step_graphics, sectionindex)
          assert(graphics_node.type == "leaf")

          if (graphics_node.value.step.type == "cosmetic") return

          new PathDisplayWithSectionControl.StepRow(
            sectionindex,
            step,
            this.template_resolver
          )
            .setAssociatedGraphics(graphics_node.value)
            .appendTo(this)
        })
      }
    }
  }

  private setCurrentSection(ids: number[]) {
    this.current_section_id = TreeArray.fixIndex(this.sections, ids)

    this.render()

    this.section_selected.trigger(this.selected_section)
  }

  onSelection(f: (_: Path.raw) => any): this {
    this.section_selected.on(f)
    return this
  }
}

export namespace PathDisplayWithSectionControl {

  export class StepRow extends Widget {
    highlighted: Observable<boolean> = observe(false)
    associated_graphics: PathStepEntity = null

    constructor(private section_index: number[],
                private step: Path.Step,
                private template_resolver: TemplateResolver
    ) {
      super();

      this.highlighted.subscribe(v => {
        this.toggleClass("ctr-neosolving-path-legend-highlighted", v)

        // TODO: Cause the entity to be highlighted on hover without locking it
        /*if (v) this.associated_graphics?.parent?.getRoot()?.lockEntity(this.associated_graphics, true)
        else if (this.associated_graphics?.isActive()) this.associated_graphics?.parent?.getRoot()?.lockEntity(null)*/
      })

      const index = util.index(this.section_index, -1)

      let order = c().text(`${index + 1}.`)

      const {icon, content} = PathStepHeader.renderTextAndIconSeparately(step)

      hboxl(order, icon, content).addClass("ctr-neosolving-path-legend")
        .on("mouseover", () => this.setHighlight(true))
        .on("mouseleave", () => this.setHighlight(false))
        .appendTo(this)
    }

    setAssociatedGraphics(graphics: PathStepEntity): this {
      this.associated_graphics = graphics

      if (graphics) {
        //graphics.setHighlightable(true)

        this.associated_graphics.highlighted.subscribe(v => {
          this.setHighlight(v)
        })
      }

      return this
    }

    setHighlight(v: boolean) {
      this.highlighted.set(v)
    }
  }
}

export default class PathControl extends Behaviour {
  private section_memory = SectionMemory.instance()
  private section_control: PathDisplayWithSectionControl

  private method: AugmentedMethod = null
  private scan_node: ScanTree.Augmentation.AugmentedScanTreeNode = null
  private sectioned_path: SectionedPath = null

  private path_layer: GameLayer = new GameLayer()
  private step_graphics: TreeArray<PathStepEntity, {}> = null

  private widget: Widget = null

  section_selected = ewent<Path.raw>()

  constructor(private parent: NeoSolvingBehaviour) {
    super();
  }

  protected begin() {
    this.path_layer.addTo(this.parent.layer)
  }

  protected end() {
    this.path_layer.remove()
  }

  /**
   * Sets the path displayed in the legend and on the map.
   * Automatically splits it into appropriate sections, use {@link setSections} for more fine-grained control.
   * @param path
   * @param node The scan tree node this path belongs to, if any
   */
  setPath(path: Path.raw, node: {
    method: AugmentedMethod,
    node: ScanTree.Augmentation.AugmentedScanTreeNode
  } = null) {
    this.set(node?.method, Path.Section.split_into_sections(path), null, node?.node)
  }

  setSections(sections: SectionedPath, active_id: number[] = null) {
    this.set(null, sections, active_id)
  }

  setMethod(method: AugmentedMethod<GenericPathMethod>) {
    let sectioned: Path.SectionedPath = TreeArray.init({name: "root"})

    if (method.method.pre_path && method.method.pre_path.length > 0) {
      TreeArray.add(sectioned,
        Path.Section.split_into_sections(method.method.pre_path, "Pre Path")
      )
    }

    TreeArray.add(sectioned,
      Path.Section.split_into_sections(method.method.main_path, "Main Path")
    )

    if (method.method.post_path && method.method.post_path.length > 0) {
      TreeArray.add(sectioned,
        Path.Section.split_into_sections(method.method.post_path, "Post Path")
      )
    }

    if (sectioned.children.length == 1) sectioned = sectioned.children[0]

    this.set(method, sectioned)
  }

  private async set(method: AugmentedMethod,
                    sections: SectionedPath,
                    active_id: number[] = null,
                    node: ScanTree.Augmentation.AugmentedScanTreeNode = null
  ) {
    this.sectioned_path = sections
    this.method = method
    this.scan_node = node
    
    if (method && !active_id) {
      active_id = await this.section_memory.get(method,
        this.scan_node ? ScanTree.Augmentation.NodeId.hash(ScanTree.Augmentation.NodeId.of(this.scan_node)) : null
      )
    }

    const section_id = TreeArray.fixIndex(this.sectioned_path, active_id || [])

    this.path_layer.clearLayers()
    this.step_graphics = TreeArray.map(this.sectioned_path, (step) => {
      return new PathStepEntity(step)
        .setInteractive()
        .addTo(this.path_layer)
    })

    this.renderWidget(section_id)
  }

  reset(): this {
    this.sectioned_path = null
    this.method = null

    this.widget?.remove()
    this.widget = null
    this.path_layer.clearLayers()

    return this
  }

  private renderWidget(active_id: number[]) {
    this.widget?.remove()
    this.widget = null
    this.section_control = null

    const w = c()

    if (this.sectioned_path) {
      this.section_control = new PathDisplayWithSectionControl(
        this.sectioned_path,
        active_id,
        this.step_graphics,
        this.parent.app.template_resolver
      )
        .onSelection(p => {
          if (this.method) {

            this.section_memory.store(this.method, this.section_control.current_section_id,
              this.scan_node ? ScanTree.Augmentation.NodeId.hash(ScanTree.Augmentation.NodeId.of(this.scan_node)) : null
            )
          }

          this.section_selected.trigger(p)
        })
        .addClass("ctr-neosolving-solution-row")

      // Only actually add the widget if there is something to show to avoid borders showing up
      if (!this.section_control.container.is(":empty")) this.section_control.appendTo(w)
    }

    if (this.section_control) this.section_selected.trigger(this.section_control.selected_section)

    if (w.container.is(":empty")) return

    this.widget = w.appendTo(this.parent.layer.path_container)

  }
}