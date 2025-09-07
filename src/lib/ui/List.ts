import * as jquery from "jquery";
import Widget from "./Widget";
import {C} from "./constructors";
import Appendable = C.Appendable;

export class List extends Widget {

  constructor(enumerated: boolean = false) {
    super(jquery(enumerated ? "<ol>" : "<ul>"));
  }

  item(...appendable: Appendable[]): this {
    this.append(c("<li></li>").append(...appendable))

    return this
  }

  sublist(l: (_: List) => void): this {
    let list = new List()
    l(list)

    this.item(list)

    return this
  }
}