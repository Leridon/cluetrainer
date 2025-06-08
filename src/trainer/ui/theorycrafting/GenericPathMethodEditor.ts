import MethodSubEditor from "./MethodSubEditor";
import MethodEditor from "./MethodEditor";
import {AugmentedMethod} from "../../model/MethodPackManager";
import {SolvingMethods} from "../../model/methods";
import {PathEditor} from "../../pathedit/PathEditor";
import {SingleBehaviour} from "../../../lib/ui/Behaviour";
import {GameLayer} from "../../../lib/gamemap/GameLayer";
import Widget from "../../../lib/ui/Widget";
import Properties from "../widgets/Properties";
import * as lodash from "lodash";
import {Path} from "../../../lib/runescape/pathing";
import {Clues} from "../../../lib/runescape/clues";
import {deps} from "../../dependencies";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import ContextMenu, {MenuEntry} from "../widgets/ContextMenu";
import {C} from "../../../lib/ui/constructors";
import {PathingGraphics} from "../path_graphics";
import {Observable, observe} from "../../../lib/reactive";
import {IssueWidget} from "../../pathedit/EditedPathOverview";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import {Transportation} from "../../../lib/runescape/transportation";
import {PathStepEntity} from "../map/entities/PathStepEntity";
import GenericPathMethod = SolvingMethods.GenericPathMethod;
import movement_state = Path.movement_state;
import activate = TileArea.activate;
import hbox = C.hbox;
import hboxl = C.hboxl;
import vbox = C.vbox;
import span = C.span;
import collect_issues = Path.collect_issues;
import default_interactive_area = Transportation.EntityTransportation.default_interactive_area;

function getSection(method: GenericPathMethod, section: "pre" | "post" | "main"): Path {
  switch (section) {
    case "pre":
      return method.pre_path
    case "post":
      return method.post_path
    case "main":
      return method.main_path
  }
}

class SegmentEdit extends Widget {
  public path: Path.augmented = null

  body: Properties

  constructor(public parent: GenericPathMethodEditor, public section: GenericPathMethodEditor.SequenceSegment) {
    super(hbox().container)

    this.addClass("ctr-scantreeedit-node")

    if (!section.path) this.addClass("no-hover")

    const collapse_bar =
      hbox(
        c().css("background-color", section.path ? "blue" : "gray")
          .css("width", "3px")
      ).css2({
        "padding-left": `4px`,
        "padding-right": "4px",
      })

    this.body = new Properties()

    this.append(
      collapse_bar,
      this.body.css("flex-grow", "1")
        .on("click", (e) => {
          e.stopPropagation()
          e.preventDefault()

          this.parent.requestActivation(this.isActive() ? null : this)
        })
    )

    this.on("contextmenu", e => this.contextMenu(e.originalEvent))

    this.renderValue(null)
  }

  contextMenu(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    const entries: MenuEntry[] = [
      {
        type: "basic",
        text: this.isActive() ? "Deactivate" : "Activate",
        handler: () => {
          this.parent.requestActivation(this.isActive() ? null : this)
        }
      }
    ]

    new ContextMenu({
        type: "submenu",
        text: "",
        children: entries.filter(e => !!e)
      },
    )
      .showFromEvent2(event)
  }

  renderValue(path: Path.augmented) {
    this.path = path

    this.body.empty()
    this.body.header(GenericPathMethodEditor.SequenceSegment.header(this.section))

    if (this.section.path && path) {

      if (path.raw.length > 0) {
        this.body.row(c()
          .append(...deps().app.template_resolver.resolve(this.path.raw.map(PathingGraphics.templateString).join(" - ")))
        )
      }
      const issues = collect_issues(path)

      if (issues.length > 0) {
        this.body.row(vbox(
          ...issues.map(i => new IssueWidget(i))
        ))
      }

      this.body.named("Timing", hboxl(
        span(`T${this.path.pre_state.tick}`).addClass('nisl-textlink'),
        span().setInnerHtml("&nbsp;to&nbsp;"),
        span(`T${this.path.post_state.tick}`).addClass('nisl-textlink'),
      ))
    }
  }

  setActive(v: boolean) {
    this.toggleClass("active", v)
  }

  isActive(): boolean {
    return this == this.parent.active.value()
  }
}

export class GenericPathMethodEditor extends MethodSubEditor {
  path_editor: SingleBehaviour<PathEditor> = this.withSub(new SingleBehaviour<PathEditor>())

  sidepanel_widget: Widget

  sequence: GenericPathMethodEditor.Sequence = []

  active: Observable<SegmentEdit> = observe(null)

  private preview_layer: GameLayer = null

  constructor(parent: MethodEditor,
              public value: AugmentedMethod<GenericPathMethod>,
  ) {
    super(parent);

    this.layer = new GameLayer()

    this.assumptions.subscribe((v) => {
      this.updateSequence()
    })

    this.active.subscribe(segment => {
      if (this.path_editor.isActive()) {
        this.path_editor.get()
        this.path_editor.set(null)
      }

      this.updatePreview(segment?.section)

      if (segment) {
        this.setPathEditor({
            start_state: segment.path.pre_state,
            initial: segment.path.raw,
            target: segment.path.target,
            commit_handler: (path) => {
              const seg = this.sequence.find(s => s.edit == segment)

              switch (seg.path.section) {
                case "pre":
                  this.value.method.pre_path = path
                  break
                case "post":
                  this.value.method.post_path = path
                  break;
                case "main":
                  this.value.method.main_path = path
                  break;
              }

              this.parent.registerChange()

              this.propagateState()
            },
            discard_handler: () => {}
          })
          .onStop(() => {
            if (this.active.value() == segment) this.requestActivation(null)
          })
      }
    })
  }

  private updatePreview(segment: GenericPathMethodEditor.SequenceSegment) {
    if (this.preview_layer) {
      this.preview_layer.remove()
      this.preview_layer = null
    }

    if (!segment) {
      const layer = new GameLayer()

      const sections = this.sequence.filter(s => s.path).map(s => s.path.section).filter(e => e)
        .map(s => {
          PathStepEntity.renderPath(getSection(this.value.method, s)).addTo(layer)
        })

      this.preview_layer = layer.addTo(this.layer)
    }
  }

  private setPathEditor(options: PathEditor.options_t): PathEditor {
    let editor = new PathEditor(
      this.layer,
      deps().app.template_resolver,
      options,
      false)

    this.path_editor.set(editor)

    return editor
  }

  protected async begin() {
    super.begin()

    this.sidepanel_widget = c().appendTo(this.parent.sidebar.body)

    this.layer.addTo(deps().app.map)

    await this.updateSequence()

    this.requestActivation(this.sequence.find(s => s.path).edit)
  }

  /**
   * Updates the required sequence based on the clue step and the method assumptions.
   * The sequence is the "blueprint" of things that need to be done to complete the step.
   */
  private async updateSequence() {
    const clue = this.value.clue

    this.sequence = await GenericPathMethodEditor.getSequence(clue, this.assumptions.value())

    await this.render()
  }

  private async render() {
    this.sidepanel_widget.empty()

    const props = new Properties().appendTo(this.sidepanel_widget)
    const value = this.value
    const assumptions = this.assumptions.value()

    this.sequence.forEach(section => {

      props.row(section.edit =
        new SegmentEdit(this, section)
      )
    })

    await this.propagateState()

    // Create widgets for every part of the path
    // - Pre-Path for keys (if not way of the foot shaped key) and hidey holes (if not full globetrotter && hideyhole not in area)
    // - Main Path
    // - Post-Path for hidey holes (if not full globetrotter && hideyhole not in area)

    // Integrate Path Editor
    // - Auto active if only main path exists
  }

  protected end() {
    this.layer.remove()
  }

  private async propagateState() {
    const end_state = await this.sequence.reduce<Promise<movement_state>>(async (old_state, section) => {
      let state: movement_state = lodash.cloneDeep(await old_state)

      if (section.path) {
        const section_path = getSection(this.value.method, section.path.section)

        const augmented = await Path.augment(section_path, state, section.path.target)

        section.edit.renderValue(augmented)

        state = lodash.cloneDeep(augmented.post_state)
      }

      if (section.ticks) state.tick += section.ticks

      return state
    }, Promise.resolve(movement_state.start(this.assumptions.value())))

    this.value.method.expected_time = end_state.tick
  }

  requestActivation(segment: SegmentEdit) {
    if (segment && !segment.section.path) return

    if (this.active.value()) this.active.value().setActive(false)

    this.active.set(segment)

    if (this.active.value()) this.active.value().setActive(true)
  }
}

export namespace GenericPathMethodEditor {
  import ClueAssumptions = SolvingMethods.ClueAssumptions;
  import ClueSpot = Clues.ClueSpot;
  export type SequenceSegment = {
    path?: { section: "pre" | "post" | "main", target: TileArea.ActiveTileArea[] } | null,
    name: string,
    ticks?: number,
    edit?: SegmentEdit
  }

  export namespace SequenceSegment {
    export function header(segment: SequenceSegment): string {
      if (segment.ticks != null) {
        return `${segment.name} (+${segment.ticks} ticks)`
      } else {
        return segment.name
      }
    }
  }

  export type Sequence = SequenceSegment[]


  export async function getSequence(spot: Clues.ClueSpot, assumptions: ClueAssumptions) {
    let sequence: GenericPathMethodEditor.Sequence = []

    const clue = spot.clue

    if (clue.type == "emote") {
      const hidey_hole_in_target = clue.hidey_hole && activate(clue.area).query(TileRectangle.center(clue.hidey_hole.location))

      if (!assumptions.full_globetrotter) {
        if (hidey_hole_in_target) {
          sequence.push({
            name: `Path to Hidey Hole in Target Area`,
            path: {section: "main", target: [activate(default_interactive_area(clue.hidey_hole.location))]}
          })
        } else if (clue.hidey_hole) {
          sequence.push({
            name: `Path to Hidey Hole`,
            path: {section: "pre", target: [activate(default_interactive_area(clue.hidey_hole.location))]}
          })
        }

        if (clue.hidey_hole) sequence.push({name: "Take and Equip Items", ticks: 1})
        else sequence.push({name: "Unequip Items", ticks: 1 + Math.floor(clue.items.length / 3)})
      }

      if (assumptions.full_globetrotter || !hidey_hole_in_target) sequence.push({
        name: "Path to Emote Area",
        path: {section: "main", target: [activate(clue.area)]}
      })

      sequence.push({name: "Summon Uri", ticks: 1})

      if (clue.double_agent) sequence.push({name: "Kill double agent", ticks: clue.tier == "master" ? 5 : 3})

      if (clue.hidey_hole && !hidey_hole_in_target && !assumptions.full_globetrotter) {
        sequence.push({
          name: "Return to Hidey Hole",
          path: {section: "post", target: [activate(default_interactive_area(clue.hidey_hole.location))]}
        })

        sequence.push({name: "Return Items", ticks: 1})
      }
    } else {
      if (Clues.requiresKey(clue) && !assumptions.way_of_the_footshaped_key) {
        sequence.push({name: "Path to Key", path: {section: "pre", target: [activate(clue.solution.key.area)]}})

        sequence.push({name: `Get Key (${clue.solution.key.instructions})`, ticks: 2})
      }

      sequence.push({
        name: "To target", path: {
          section: "main",
          target: Clues.ClueSpot.targetArea({clue: clue, spot: spot.spot}).map(activate)
        }
      })

      const sol = ClueSpot.solution(spot)

      const has_challenge_scroll = spot.clue.challenge?.length == 1 && spot.clue.challenge[0].type == "challengescroll"

      if (sol) {
        switch (sol.type) {
          case "dig":
            sequence.push({name: "Dig", ticks: 1})
            break;
          case "search":
            sequence.push({name: "Search", ticks: 1})
            break;
          case "talkto":
            if (has_challenge_scroll) sequence.push({name: "Speak to Target", ticks: 1})
            else sequence.push({name: "Speak to Target", ticks: 2})

            break;
        }
      }

      if (has_challenge_scroll) sequence.push({name: "Hand in Challenge Scroll", ticks: 3})
    }

    return sequence
  }

  export async function getEndState(value: AugmentedMethod<GenericPathMethod>) {
    const sequence = await getSequence(value.clue, value.method.assumptions)

    return await sequence.reduce<Promise<movement_state>>(async (old_state, section) => {
      let state: movement_state = lodash.cloneDeep(await old_state)

      if (section.path) {
        const section_path = getSection(value.method, section.path.section)

        const augmented = await Path.augment(section_path, state, section.path.target)

        state = lodash.cloneDeep(augmented.post_state)
      }

      if (section.ticks) state.tick += section.ticks

      return state
    }, Promise.resolve(movement_state.start(value.method.assumptions)))
  }
}