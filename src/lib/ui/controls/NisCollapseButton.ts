import {ExpansionBehaviour} from "../ExpansionBehaviour";
import Button from "./Button";
import * as jquery from "jquery";

export default class NisCollapseButton extends Button {

  constructor(public behaviour: ExpansionBehaviour) {
    super(jquery("<img class='nisl-collapse-button'>"));

    behaviour.bindToClickable(this)

    behaviour.state().subscribe((isCollapsed) => {
      this.container.attr("src", isCollapsed
        ? "/assets/nis/plus.png"
        : "/assets/nis/minus.png"
      )
    }, true)
  }
}