import Properties from "./widgets/Properties";
import {AugmentedMethod} from "../model/MethodPackManager";
import {AssumptionProperty} from "./theorycrafting/AssumptionProperty";

export class MethodProperties extends Properties {

  constructor(private method: AugmentedMethod) {
    super();

    this.render()
  }

  render() {
    this.empty()

    this.named("Pack", c().text(this.method.pack ? this.method.pack.name : "None"))
    this.named("Name", c().text(this.method.method.name))
    this.named("Assumptions", c().append(...AssumptionProperty.icons(this.method.method.assumptions)))

    if (this.method.method.description) {
      this.header("Description")
      this.row(c().text(this.method.method.description
          ? this.method.method.description
          : "None"
        ).css("font-style", "italic")
      )
    }
  }
}