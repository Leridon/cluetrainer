import Widget from "./Widget";
import {ewent, Observable, observe} from "../reactive";

export class ExpansionBehaviour {
  private collapsed: Observable<boolean>

  private collapsed_event = ewent()
  private expanded_event = ewent()

  constructor(starts_collapsed: boolean) {
    this.collapsed = observe(starts_collapsed)
  }

  isCollapsed(): boolean {
    return this.collapsed.value()
  }

  isExpanded(): boolean {
    return !this.collapsed.value()
  }

  bindToClickable(widget: Widget) {
    widget.on("click", (e) => {
      e.stopPropagation()
      this.toggle()
    })

    return this
  }

  toggle(): this {
    if (this.collapsed.value()) this.expand()
    else this.collapse()

    return this
  }

  expand(): this {
    if (!this.collapsed.value()) return this

    this.expanded_event.trigger(undefined)

    this.collapsed.set(false)

    return this
  }

  collapse(): this {
    if (this.collapsed.value()) return this

    this.collapsed_event.trigger(undefined)

    this.collapsed.set(true)

    return this
  }

  onCollapse(f: () => any): this {
    this.collapsed_event.on(f)

    return this
  }

  setCollapsed(collapsed: boolean): this {
    if (this.isCollapsed()) {
      if (!collapsed) this.expand()
    } else {
      if (collapsed) this.collapse()
    }

    return this
  }

  onExpansion(f: () => any): this {
    this.expanded_event.on(f)

    return this
  }

  state(): Observable<boolean> {
    return this.collapsed
  }

  onChange(f: (_: boolean) => any, trigger_now: boolean = false): this {
    this.state().subscribe(f, trigger_now)
    return this
  }
}

export namespace ExpansionBehaviour {

  export function create(options: {
    target: Widget,
    collapse_button?: Widget,
    starts_collapsed?: boolean,
    onCollapse: (target: Widget) => any,
    onExpand: (target: Widget) => any,
  }): ExpansionBehaviour {
    let behaviour = new ExpansionBehaviour(!!options.starts_collapsed)
      .onCollapse(() => options.onCollapse(options.target))
      .onExpansion(() => options.onExpand(options.target))

    if (options.collapse_button) behaviour.bindToClickable(options.collapse_button)

    if (options.target && options.starts_collapsed) {
      options.target.container.css({"display": "none"})
    }

    return behaviour
  }

  export function horizontal(options: {
    target: Widget,
    starts_collapsed: boolean,
    duration?: number
  }): ExpansionBehaviour {
    return create({
      target: options.target,
      starts_collapsed: options.starts_collapsed,
      onExpand: (target) => target.container.animate({"width": "show"}, options.duration || 300),
      onCollapse: (target) => target.container.animate({"width": "hide"}, options.duration || 300),
    })
  }

  export function vertical(options: {
    target: Widget,
    starts_collapsed: boolean,
    duration?: number
  }): ExpansionBehaviour {
    return create({
      target: options.target,
      starts_collapsed: options.starts_collapsed,
      onExpand: (target) => target.container.animate({"height": "show"}, options.duration || 300),
      onCollapse: (target) => target.container.animate({"height": "hide"}, options.duration || 300),
    })
  }
}