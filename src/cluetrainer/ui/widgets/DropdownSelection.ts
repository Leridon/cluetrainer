import {AbstractDropdownSelection} from "./AbstractDropdownSelection";

/* TODO:
    - Styling pass over dropdown
    - Add arrow indicating that it's a dropdown
 */
export class DropdownSelection<T> extends AbstractDropdownSelection<T> {
  constructor(options: AbstractDropdownSelection.options<T>, items: T[]) {
    super(options, items[0]);

    this.setItems(items)
  }

  setItems(items: T[] | (() => Promise<T[]> | T[])): this {
    super.setItems(items)

    // TODO: What to do if current selection is not in new list?
    //if (this.options.can_be_null && !items.some(p => p == this.selection.value())) this.selectValue(null)

    return this
  }
}