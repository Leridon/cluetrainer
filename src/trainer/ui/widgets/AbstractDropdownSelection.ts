import Widget from "lib/ui/Widget";
import * as popper from "@popperjs/core"
import {ewent, Observable, observe} from "../../../lib/reactive";
import {util} from "../../../lib/util/util";
import {C} from "../../../lib/ui/constructors";
import * as jquery from "jquery";
import inlineimg = C.inlineimg;
import Appendable = C.Appendable;

export abstract class AbstractDropdownSelection<T> extends Widget {
  protected input_container: Widget
  private input: Widget

  protected dropdown: AbstractDropdownSelection.DropDown<T> = null

  public selection: Observable.Simple<T>
  private selected = ewent<T>()

  private enabled = observe(true)

  protected constructor(protected options: AbstractDropdownSelection.options<T>, inital_item: T) {
    super(c("<div class='nisl-selectdropdown'>"));

    this.selection = observe(inital_item)

    this.input_container = c().appendTo(this)

    this.selection.subscribe(item => {
      this.renderInput()
    }, true)

    this.enabled.subscribe(enabled => {
      this.input?.toggleClass("disabled", !enabled)
    })

    this.setItems([inital_item])
  }

  renderInput(): void {
    this.input = c("<div class='nisl-textinput nisl-selectdropdown-input' tabindex='-1'>")
      .css("padding-right", "13px")
      .on("click", (e) => {
        this.openDropdown()
      })
      .append(
        this.construct(this.selection.value()),
        inlineimg("/assets/nis/dropdown.png")
          .addClass("nisl-selectdropdown-arrow")
      )
      .appendTo(this.input_container.empty());
  }

  private construct(v: T): Appendable {
    return this.options.type_class?.toHTML
      ? this.options.type_class.toHTML(v)
      : c(`<div>${v}</div>`)
  }

  private _list_constructor: () => Promise<T[]> | T[] = async () => []

  setItems(items: T[] | (() => Promise<T[]> | T[])): this {

    if (Array.isArray(items)) {
      this._list_constructor = () => Promise.resolve(items)
    } else {
      this._list_constructor = items
    }

    if (this.dropdown) {
      (async () => {
        this.dropdown.setItems(await this._list_constructor())
      })()
    }

    return this
  }

  async openDropdown() {
    if (!this.enabled.value()) return;

    const focus_widget = this.onOpen()

    this.dropdown = new AbstractDropdownSelection.DropDown<T>({
      dropdownClass: 'nisl-selectdropdown-options',
      renderItem: (i) => {
        return c().append(this.construct(i))
      }
    })
      .setItems(await this._list_constructor())
      .setHighlighted(this.selection.value())
      .onClosed(() => {
        this.dropdown = null
        this.renderInput()
      })
      .onSelected(i => {
        this.selection.set(i)
        this.selected.trigger(i)
      })
      .open(this, focus_widget)

    if (this.dropdown) return
  }

  /**
   * Is called whenever the dropdown is opened. Subclasses can use this to replace the original input by a text input for example.
   *
   * @return Must return the focus handler, i.e. the element that receives key events. The dropdown by default.
   */
  protected onOpen(): Widget {
    return this.input_container
  }

  setValue(v: T): this {
    this.selection.set(v)

    return this
  }

  onSelection(f: (v: T) => any, trigger_now: boolean = false): this {
    this.selected.on(f)

    if (trigger_now) f(this.selection.value())
    return this
  }

  setEnabled(value: boolean): this {
    this.enabled.set(value)

    return this
  }
}

export namespace AbstractDropdownSelection {
  import positiveMod = util.positiveMod;
  import Appendable = C.Appendable;

  export class DropDown<T> {
    private selectable_items: Observable<T[]> = observe([])
    private highlight_index: Observable<number | null> = observe(null)

    public selected = ewent<T>()
    public closed = ewent<undefined>()

    private focus_widget: Widget
    private input_handler: (event: JQuery.KeyDownEvent) => any
    private container: Widget
    private rows: Widget[]
    private instance: popper.Instance

    constructor(private options: {
      dropdownClass?: string,
      renderItem?: (_: T) => Widget
    }) {
      if (!options.renderItem) options.renderItem = (v) => c().text(JSON.stringify(v))

      this.selectable_items.subscribe((items, old_items) => {
        /*
        if (this.highlight_index.value() != null) {
            let new_index = items.indexOf(old_items[this.highlight_index.value()])

            this.highlight_index.set(new_index >= 0 ? new_index : 0)
        }*/

        this.highlight_index.set(0)

        this.renderItems()
      })

      this.highlight_index.subscribe((highlight, old_highlight) => {
        if (this.rows) {
          if (old_highlight != null) this.rows[old_highlight]?.toggleClass("selected", false)
          if (highlight != null) this.rows[highlight]?.toggleClass("selected", true)
            ?.raw()?.scrollIntoView({block: "nearest", inline: "nearest"})
        }
      })
    }

    private select(item: T) {
      this.selected.trigger(item)
      this.close()
    }

    setItems(items: T[]): this {
      this.selectable_items.set(items)
      return this
    }

    renderItems() {
      if (this.container) {
        this.container.empty()

        this.rows = this.selectable_items.value().map((item, index) => {
          return this.options.renderItem(item)
            .toggleClass("selected", this.highlight_index.value() == index)
            .on("click", (e) => {
              e.stopPropagation()

              this.select(item)
            })
            .on("mousemove", () => {
              this.highlight_index.set(index)
            })
            .appendTo(this.container)
        })

        if (this.selectable_items.value().length == 0) {
          this.container.append(c().text("No matches").css("font-style", "italic"))
        }
      }
    }

    open(reference: Widget, focus_widget: Widget): this {
      this.container = c("<div style='z-index: 1000000' tabindex='0'></div>")
        .addClass("nisl-abstract-dropdown")

      if (focus_widget) {
        if (focus_widget.raw().getAttribute("tabindex") == null)
          focus_widget.setAttribute("tabindex", "-1")

        this.focus_widget = focus_widget
        focus_widget
          .on("keydown", this.input_handler = (e) => {
            if (e.key == "Escape") {
              e.stopPropagation()
              this.focus_widget.raw().blur()
            }

            if (e.key == "ArrowUp") {
              this.highlight_index.set(positiveMod(
                (this.highlight_index.value() ?? this.selectable_items.value().length) - 1,
                this.selectable_items.value().length
              ))
            }

            if (e.key == "ArrowDown") {
              this.highlight_index.set(positiveMod(
                (this.highlight_index.value() ?? (this.selectable_items.value().length - 1)) + 1,
                this.selectable_items.value().length
              ))
            }

            if (e.key == "Enter") {
              let i = this.highlight_index.value()
              if (i != null && i >= 0 && i < this.selectable_items.value().length)
                this.select(this.selectable_items.value()[i])
            }
          })
          .on("focusout", (e) => {
            if (!(e.originalEvent.relatedTarget instanceof HTMLElement)
              || (!this.container.container.is(e.originalEvent.relatedTarget)
                && this.container.container.has(e.originalEvent.relatedTarget).length == 0)
            ) {
              this.close()
            }
          })
          .raw().focus()
      }

      this.container.addClass(this.options.dropdownClass || "nisl-abstract-dropdown-default-styling")

      this.renderItems()

      this.instance = popper.createPopper(reference.raw(), this.container.appendTo(getDropdownPane()).raw(),
        {
          placement: "bottom-start",
          modifiers: [
            {
              name: 'flip',
              enabled: true,
            },
            {
              name: "preventOverflow",
              enabled: true,
              options: {
                boundary: "viewport",
                rootBoundary: 'viewport',
              }
            },
            {
              name: 'widthSync', // Custom modifier name
              enabled: true,
              phase: 'beforeWrite',
              fn: ({state}) => {
                state.styles.popper.width = `${state.rects.reference.width}px`; // Set tooltip width based on reference width
                state.styles.popper.maxWidth = `${state.rects.reference.width}px`
              },
            },
          ]
        })

      return this
    }

    close() {
      if (this.instance) {
        this.instance.destroy()
        this.instance = null

        this.container.remove()

        this.closed.trigger(undefined)
      }

      if (this.focus_widget) {
        this.focus_widget.container.off("keydown", this.input_handler)
        this.focus_widget = null
        this.input_handler = null
      }
    }

    onSelected(f: (_: T) => any): this {
      this.selected.on(f)

      return this
    }

    onClosed(f: () => any): this {
      this.closed.on(f)

      return this
    }

    setHighlighted(item: T): this {
      let index = this.selectable_items.value().indexOf(item)
      if (index >= 0) this.highlight_index.set(index)

      return this
    }
  }

  export type selectable<T> = {
    toHTML(v: T): Appendable
  }

  export type options<T> = {
    type_class?: selectable<T>
  }

  let _dropdownpane: Widget = null

  export function getDropdownPane(): Widget {
    if (!_dropdownpane) _dropdownpane = c("<div style='position: absolute; top: 0; left: 0; overflow: visible; max-width: 100%; max-height: 100%'>").appendTo(jquery("body"))

    return _dropdownpane
  }
}