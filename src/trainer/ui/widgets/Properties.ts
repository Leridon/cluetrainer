import Widget from "lib/ui/Widget";
import {C} from "../../../lib/ui/constructors";
import Appendable = C.Appendable;
import cls = C.cls;
import hgrid = C.hgrid;

/**
 * The Properties widget is a layouting helper to ensure consistent use of layouting for various parts of the interface.
 */
export default class Properties extends Widget {
  constructor() {
    super()

    this.addClass("nisl-properties")
  }

  header(text: Appendable, align: "left" | "center" = "center", level: 0 | 1 = 0): this {
    c(`<div class='nisl-property-header nisl-property-row'></div>`)
      .addClass(`nisl-property-header-${level}`)
      .css("text-align", align)
      .append(text)
      .appendTo(this)

    return this
  }

  paragraph(...text: Appendable[]): this {
    this.row(cls("nisl-property-paragraph").append(...text))

    return this
  }

  row(content: Widget | string): this {
    c("<div class='nisl-property-row'></div>").append(content).appendTo(this)

    return this
  }

  named<T extends Appendable>(name: Appendable, content: T): this {
    c(`<div class='nisl-property-name'>`).append(name).appendTo(this)
    c(`<div class='nisl-property-content'></div>`).append(content).appendTo(this)

    return this
  }

  divider(): this {
    c("<div class='nisl-property-hline'></div>").appendTo(this)

    return this
  }
}

export class SlotLayout extends Widget {
  constructor(entries: {
    name: string,
    content: Appendable
  }[], columns: number = 2) {
    super(hgrid())

    entries.forEach(e => {
      this.append(e.content)
    })

    const per_column = Math.ceil(entries.length / columns)

    for (let col = 0; col < columns; col++) {
      const props = new Properties()

      for (let column_i = 0; column_i < per_column; column_i++) {
        const entry = entries[col * per_column + column_i]

        props.named(entry.name, entry.content)
      }

      if (col > 0) props.css("margin-left", "5px")

      this.append(props)
    }
  }
}