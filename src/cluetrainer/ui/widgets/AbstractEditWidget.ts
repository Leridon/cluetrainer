import Widget from "lib/ui/Widget";
import {Observable, observe} from "../../../lib/reactive";
import jquery from "jquery";


/**
 * This class encapsulates common functionality for widgets that are an editor for a value.
 */
export default abstract class AbstractEditWidget<T, Element_T extends HTMLElement = HTMLElement> extends Widget<Element_T> {
  protected v: Observable<{
    committed: boolean,
    value: T
  }> = observe({committed: false, value: null})

  protected constructor(container: JQuery | Widget = null) {
    super(container);
  }

  public setValue(v: T): this {
    this.commit(v)

    this.render()

    return this
  }

  public get(): T {
    return this.v.value().value
  }

  protected render(): void {

  }

  protected commit(value: T, render: boolean = false) {
    this.v.set({value: value, committed: true})
    if (render) this.render()
  }

  protected preview(value: T): this {
    this.v.set({value: value, committed: false})
    return this
  }

  onChange(handler: (_: { value: T, committed: boolean }) => any): this {
    this.v.subscribe(handler)
    return this
  }

  onPreview(handler: (_: T) => any): this {
    this.v.subscribe((v) => {if (!v.committed) handler(v.value)})
    return this
  }

  onCommit(handler: (_: T) => any): this {
    this.v.subscribe((v) => {if (v.committed && v.value != null) handler(v.value)})
    return this
  }
}