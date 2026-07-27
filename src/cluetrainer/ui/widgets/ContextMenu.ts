import Widget from "lib/ui/Widget";
import * as tippy from "tippy.js";
import {Vector2} from "lib/math";
import {Ewent, ewent} from "../../../lib/reactive";
import {C} from "../../../lib/ui/constructors";
import jquery from "jquery";
import hbox = C.hbox;
import span = C.span;
import spacer = C.spacer;
import Appendable = C.Appendable;

export function rend(s: string | (() => Widget)): Appendable {
  if (typeof s == "string") return s
  else return s()
}

export type MenuEntry =
  MenuEntry.Basic | MenuEntry.SubMenu

export namespace MenuEntry {
  export type Base = {
    text: string | (() => Widget),
    icon?: string | (() => Widget)
  }
  export type SubMenu = Base & {
    type: "submenu",
    children: MenuEntry[]
  }

  export type Basic = Base & {
    type: "basic",
    handler: () => any
  }
}

export type Menu = MenuEntry.SubMenu

type context_menu = {
  cancelled: Ewent.Real<context_menu>
  closed: Ewent.Real<context_menu>
  option_selected?: boolean

  menu: Menu

  root_page: context_menu_page
}

type context_menu_page = {
  root: context_menu
  parent: context_menu_page | null
  underlying: Menu

  root_widget: Widget
  rows: Widget[]
  tippy_instance: tippy.Instance<tippy.Props>

  highlight: number | null

  open_child: context_menu_page | null
}

namespace open_menu {
  import cls = C.cls;

  export function init(menu: Menu): context_menu {
    let r: context_menu = {
      cancelled: ewent(),
      closed: ewent(),
      menu: menu,
      root_page: null
    }

    menu.children.push({
      type: "basic",
      text: "Cancel",
      handler: () => cancel(r)
    })

    r.root_page = render(menu, null, r)

    r.root_page.root_widget.container.on("keydown", (e) => {
      if (e.key == "Escape") {
        e.stopPropagation()
        cancel(r)
      }

      let current = deepest(r)

      if (e.key == "ArrowRight") {
        if (current.highlight != null && current.underlying.children[current.highlight].type == "submenu") {
          confirm(current)
        }
      }

      if (e.key == "ArrowLeft") {
        if (current.parent) close(current)

        // TODO: If any sub menu is open, close it
      }

      if (e.key == "ArrowUp") {
        open_menu.highlight(current, current.highlight != null ? (current.highlight - 1 + current.underlying.children.length) % current.underlying.children.length : current.underlying.children.length - 1)
      }

      if (e.key == "ArrowDown") {
        open_menu.highlight(current, current.highlight != null ? (current.highlight + 1) % current.underlying.children.length : 0)
      }

      if (e.key == "Enter") {
        confirm(current)
      }
    })


    return r
  }

  export function close(menu: context_menu_page): void {
    if (!menu) return

    if (menu.open_child) close(menu.open_child)

    if (menu.tippy_instance) {
      menu.tippy_instance.destroy()
      menu.tippy_instance = null
      menu.root_widget.remove()

      if (menu.parent) menu.parent.open_child = null
      else menu.root.root_page = null
    }
  }

  export function cancel(menu: context_menu): void {
    if (!menu.option_selected) menu.cancelled.trigger(menu)
    menu.closed.trigger(menu)

    close(menu.root_page)
  }

  export function confirm(menu: context_menu_page, i: number = null): void {
    if (i != null && i != menu.highlight) highlight(menu, i)

    if (menu.highlight != null) {
      let e = menu.underlying.children[menu.highlight]

      if (e.type == "basic") {
        menu.root.option_selected = true
        e.handler()
        cancel(menu.root)
      } else {
        openSubmenu(menu)
        highlight(menu.open_child, 0)
      }
    }
  }

  export function render(menu: Menu, parent: context_menu_page, root: context_menu): context_menu_page {
    let m: context_menu_page = {
      root: root,
      parent: parent,
      underlying: menu,

      root_widget: cls("nisl-context-menu")
        .tapRaw(j => j
          //.on("click", (e) => e.stopPropagation())
          .attr("tabindex", "0")),
      rows: null,
      tippy_instance: null,

      highlight: null,
      open_child: null
    }

    // TODO: Icon?
    if (!parent) cls("nisl-context-menu-header")
      .append(menu.text ? rend(menu.text) : "Choose Option")
      .appendTo(m.root_widget)

    let with_icon = menu.children.some(e => !!e.icon)

    m.rows = menu.children.map((entry, i) => {
      return hbox(
        with_icon
          ? c("<div class='nisl-context-menu-entry-icon-container'></div>")
            .append(entry.icon
              ? (typeof entry.icon == "string" ? c(`<img src="${entry.icon}">`) : entry.icon())
              : null)
          : null,
        rend(entry.text),
        spacer().css("min-width", "10px"),
        entry.type == "submenu" ? span().setInnerHtml("&#x276F;") : null
      ).addClass("nisl-context-menu-entry")
        .tapRaw(r => r
          .on("click", (e) => {
            e.stopPropagation()
            confirm(m, i)
          })
          .on("mouseover", () => {
            highlight(m, i)
            openSubmenu(m)
          })
        )
    })

    m.root_widget.append(...m.rows)

    return m
  }

  export function highlight(men: context_menu_page, i: number | null) {
    if (i == men.highlight) return

    if (men.open_child) close(men.open_child)

    if (men.highlight != null) {
      men.rows[men.highlight].toggleClass("nisl-context-menu-entry-selected", false)
      men.highlight = null
    }

    if (i != null) {
      men.rows[i].toggleClass("nisl-context-menu-entry-selected", true)
      men.highlight = i
    }
  }

  export function deepest(menu_root: context_menu): context_menu_page {
    let men = menu_root.root_page

    while (men?.open_child) men = men.open_child
    return men
  }

  export function openSubmenu(men: context_menu_page): void {
    if (men.highlight == null) return
    let e = men.underlying.children[men.highlight]
    if (e.type != "submenu") return

    close(men.open_child)

    men.open_child = render(e, men, men.root)

    show(men.open_child, men.rows[men.highlight].raw(), null)
  }

  export function show(men: context_menu_page, dom_parent: HTMLElement, position: Vector2): void {
    const nested = jquery(dom_parent).is(".tippy-content *")

    men.tippy_instance =
      tippy.default(dom_parent, {
        placement: 'right-start',
        trigger: 'manual',
        interactive: true,
        arrow: false,
        offset: [0, 0],
        animation: false,
        interactiveBorder: 20,
        interactiveDebounce: 0.5,
        content: men.root_widget.raw(),
        maxWidth: "none",
        zIndex: 10001,
        appendTo: nested ? "parent" : document.body
      })

    if (!men.parent) {
      men.tippy_instance.setProps({
        onHidden: () => cancel(men.root),
        onMount: () => men.root.root_page.root_widget.raw().focus(),
      })
    }

    if (position) men.tippy_instance.setProps({
      getReferenceClientRect: () => ({
        width: 0,
        height: 0,
        top: position.y,
        bottom: position.y,
        left: position.x,
        right: position.x,
      }) as ClientRect /* typing of tippy is terrible*/
    })

    men.tippy_instance.show()
  }
}

export default class ContextMenu {
  private openMenuTree: context_menu = null

  constructor(private menu: Menu) {
    if (this.openMenuTree) {
      open_menu.cancel(this.openMenuTree)
      this.openMenuTree = null
    }

    this.openMenuTree = open_menu.init(this.menu)
  }

  showFromEvent(e: JQuery.MouseEventBase): this {
    return this.showFromEvent2(e.originalEvent)
  }

  showFromEvent2(e: MouseEvent): this {
    return this.show(e.target as HTMLElement, {x: e.clientX, y: e.clientY})
  }

  show(target: HTMLElement, position: Vector2): this {
    open_menu.show(this.openMenuTree.root_page, target, position)

    return this
  }

  onCancel(f: () => any): this {
    this.openMenuTree.cancelled.on(f)
    return this
  }

  onClosed(f: () => any): this {
    this.openMenuTree.closed.on(f)
    return this
  }
}