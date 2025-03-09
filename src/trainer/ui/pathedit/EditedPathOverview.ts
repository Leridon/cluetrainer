import Widget from "../../../lib/ui/Widget";
import {Observable, observe} from "../../../lib/reactive";
import {Path} from "../../../lib/runescape/pathing";
import MovementStateView from "./MovementStateView";
import {PathEditor} from "./PathEditor";
import {TileRectangle} from "../../../lib/runescape/coordinates";
import LightButton from "../widgets/LightButton";
import {direction} from "../../../lib/runescape/movement";
import {C} from "../../../lib/ui/constructors";
import {PathBuilder} from "./PathBuilder";
import ContextMenu, {Menu, MenuEntry} from "../widgets/ContextMenu";
import {PathStepHeader} from "../pathing/PathStepHeader";
import * as lodash from "lodash";
import vbox = C.vbox;
import spacer = C.spacer;

export class IssueWidget extends Widget {
  constructor(issue: Path.issue) {
    super();

    this.addClass('ctr-step-issue').setAttribute("level", issue.level.toString())

    this.append(
      IssueWidget.icon(issue.level),
      " ",
      issue.message
    )
  }
}

export namespace IssueWidget {

  import cls = C.cls;

  export function icon(level: Path.issue_level): Widget {
    return cls(`ctr-step-issue-icon-${level}`)
  }
}

export class AggregatedIssueWidget extends Widget {
  constructor(private issues: Path.issue[]) {
    super()

    this.css2({
      display: "flex"
    })

    const grouped = lodash.sortBy(Object.entries(lodash.groupBy(issues, i => i.level)), e => e[0])

    grouped.forEach(([key, issues]) => {
      this.append(
        IssueWidget.icon(issues[0].level),
        issues.length.toString()
      )
    })

    this.addTippy(vbox(
      ...issues.map(i => new IssueWidget(i))
    ))
  }
}

export class EditedPathOverview extends Widget {
  steps_container: Widget

  step_rows: EditedPathOverview.Step[] = []
  inbetween_rows: EditedPathOverview.InbetweenSteps[] = []

  constructor(public editor: PathEditor) {
    super();

    this.addClass("path-edit-control")

    this.steps_container = vbox().appendTo(this).css2({
        "max-height": "800px",
        "overflow-y": "auto",
      })
      .addClass("ctr-path-edit-overview")

    editor.value.committed_value.subscribe(value => this.render(value))

    editor.value.cursor_state.subscribe(() => {
      this.inbetween_rows.forEach(r => r.render())
    })
  }

  setDragTarget(index: number) {
    this.inbetween_rows.forEach((row, i) => {
      row.is_dragged_over.set(i == index)
    })
  }

  private render(value: PathBuilder.Value) {
    if (!value) return

    this.step_rows = []
    this.inbetween_rows = []

    this.steps_container.empty()

    for (let i = 0; i <= value.steps.length; ++i) {
      this.inbetween_rows.push(
        new EditedPathOverview.InbetweenSteps(this, value, i).appendTo(this.steps_container)
      )

      if (i < value.steps.length) {
        this.step_rows.push(
          new EditedPathOverview.Step(this, value.steps[i]).appendTo(this.steps_container)
        )
      }
    }

    if (value.path.issues.length > 0) {
      vbox(
        ...value.path.issues.map(i => new IssueWidget(i))
      ).appendTo(this.steps_container)
    }

    return this
  }
}

export namespace EditedPathOverview {
  import span = C.span;
  import hboxl = C.hboxl;
  import movement_state = Path.movement_state;

  export class InbetweenSteps extends Widget {
    value: movement_state

    is_dragged_over: Observable<boolean> = observe(false)

    constructor(private parent: EditedPathOverview, private va: PathBuilder.Value, private index: number) {
      super();

      this.value = Path.augmented.getState(this.va.path, this.index)

      this.addTippy(new MovementStateView(this.value), {delay: [300, 0]})

      this.addClass("ctr-path-edit-overview-inbetween")

      this.on("click", () => {
        this.va.builder.setCursor(this.index)
      })

      this.on("drop", (event) => {
        event.preventDefault()

        const from = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"))

        this.is_dragged_over.set(false)

        this.va.builder.move(from.step_index, this.index)
      })

      this.on("dragover", (event) => {
        event.preventDefault()

        this.parent.setDragTarget(this.index)

        event.originalEvent.dataTransfer.dropEffect = "move"
      })

      this.on("dragleave", () => {
        this.is_dragged_over.set(false)
      })

      this.on("contextmenu", (event) => {
        event.preventDefault()

        const entries: MenuEntry[] = [{
          type: "basic",
          text: "Select",
          handler: () => {
            this.va.builder.setCursor(this.index)
          }
        }]

        if (this.value.position.tile) {
          entries.push({
            type: "basic",
            text: "Show on map",
            handler: () => {
              this.parent.editor.game_layer.getMap().fitView(TileRectangle.from(this.value.position.tile))
            }
          })
        }

        new ContextMenu({
          type: "submenu",
          text: "",
          children: entries
        }).showFromEvent(event)
      })

      this.on("dblclick", () => {

        // TODO: For whatever reason this event is not properly triggered. Maybe a rerender after click?

        if (this.value.position.tile) {
          this.parent.editor.game_layer.getMap().fitView(TileRectangle.from(this.value.position.tile))
        }
      })

      this.is_dragged_over.subscribe(() => this.render())

      this.render()
    }

    render() {
      const cursor_state = this.va.builder.cursor_state.value()

      if (!cursor_state) return

      this.empty()

      const main_row = hboxl().appendTo(this)

      span(`T${this.value.tick}`)
        .addClass("ctr-path-edit-overview-row-first")
        .addClass('nisl-textlink')
        .appendTo(main_row)

      this.toggleClass("ctr-path-edit-overview-inbetween-dragged-over", this.is_dragged_over.value())

      if (this.is_dragged_over.value()) {
        main_row.append("Drop to move step here")
      } else if (this.index == cursor_state.cursor) {
        main_row.append(
          C.inlineimg("/assets/icons/youarehere.png")
            .css2({
              "margin-right": "3px",
            }),
          "You are here",
        )

        if (this.index == 0 && !this.value.position.tile && !this.value.position.direction) {
          main_row.append(new LightButton("Assume starting orientation")
            .css("margin-left", "5px")
            .onClick((event) => {
              const menu: Menu = {
                type: "submenu",
                text: "",
                children: direction.all.map(d => {
                  return {
                    type: "basic",
                    text: direction.toString(d),
                    handler: () => {
                      this.va.builder.add(({
                        type: "orientation",
                        direction: d
                      }))
                    }
                  }
                })
              }

              new ContextMenu(menu).showFromEvent(event)
            }))
        }
      }
    }
  }

  export class Step extends Widget {
    constructor(private parent: EditedPathOverview, public value: PathBuilder.Step) {
      super();

      this.setAttribute("draggable", "true")

      const {icon, content} = PathStepHeader.renderTextAndIconSeparately(value.step.raw)

      this.addClass("ctr-path-edit-overview-step").append(
        hboxl(c("<div>&#x2630;</div>")
            .addClass("ctr-path-edit-overview-step-grab-indicator")
            .addClass("ctr-path-edit-overview-row-first")
          ,
          icon
            .css("margin-left", "0")
          , content,
          spacer(),
          new AggregatedIssueWidget(value.step.issues),
          c().setInnerHtml("&#x22EE;")
            .addClass("ctr-clickable")
            .addClass("ctr-path-edit-overview-step-options")
            .on("click", (event) => {
              this.contextMenu(event.originalEvent)
            })
        ),
        /*vbox(
          ...value.step.issues.map(i => new IssueWidget(i))
        ),*/
      )

      this.on("dblclick", (event) => {
        event.preventDefault()

        this.parent.editor.editStepDetails(value)
      })

      this.on("contextmenu", (event) => {
        event.preventDefault()

        this.contextMenu(event.originalEvent)
      })

      this.on("dragstart", (event) => {
        event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify({
          step_index: this.value.index
        }))
      })

      this.on("dragover", (event) => {
        event.preventDefault()

        const upper = (event.pageY - this.raw().getBoundingClientRect().top) < this.raw().offsetHeight / 2

        this.parent.setDragTarget(upper ? this.value.index : this.value.index + 1)

        event.originalEvent.dataTransfer.dropEffect = "move"
      })

      this.on("drop", (event) => {
        event.preventDefault()

        const from = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"))

        const upper = (event.pageY - this.raw().getBoundingClientRect().top) < this.raw().offsetHeight / 2

        this.parent.inbetween_rows[this.value.index].is_dragged_over.set(false)
        this.parent.inbetween_rows[this.value.index + 1].is_dragged_over.set(false)

        this.value.parent.move(from.step_index, upper ? this.value.index : this.value.index + 1)
      })
    }

    private contextMenu(event: MouseEvent) {
      new ContextMenu(this.parent.editor.contextMenu(this.value)).showFromEvent2(event)
    }
  }
}