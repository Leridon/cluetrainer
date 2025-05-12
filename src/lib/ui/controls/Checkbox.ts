import AbstractEditWidget from "trainer/ui/widgets/AbstractEditWidget";
import Widget from "../Widget";
import {Observable, observe} from "../../reactive";
import {C} from "../constructors";
import Appendable = C.Appendable;
import cls = C.cls;

export class Checkbox extends AbstractEditWidget<boolean> {
  new_box: Widget

  type: Observable<"checkbox" | "radio">

  enabled = observe(true)

  constructor(private label: Appendable = "", type: "checkbox" | "radio" = "checkbox") {
    super(cls("nisl-checkbox"))

    this.type = observe(type)

    this.type.subscribe((value) => {
      this.new_box.toggleClass("nisl-checkbox-radio", value == "radio")
    })

    this.new_box = c("<div class='nisl-checkbox-box'>")
      .on("click", () => {
        if (this.isEnabled()) this.commit(!this.get(), true)
      })
      .appendTo(this.container)

    cls("nisl-checkbox-checkmark").appendTo(this.new_box)

    this.new_box.toggleClass("nisl-checkbox-radio", this.type.value() == "radio")

    if (this.label) {
      cls("nisl-checkbox-label").append(this.label).appendTo(this)
    }

    this.setValue(false)

    this.enabled.subscribe(v => {
      this.toggleClass("nisl-checkbox-disabled", !v)
    })
  }

  protected render() {
    this.new_box.toggleClass("checked", this.get())
  }

  setEnabled(v: boolean): this {
    this.enabled.set(v)

    return this
  }

  isEnabled(): boolean {
    return this.enabled.value()
  }
}

export namespace Checkbox {
  export class Group<T> {
    private value: Observable<T> = observe(null)

    constructor(public buttons: {
      button: Checkbox,
      value: T
    }[], can_be_null: boolean = false) {
      buttons.forEach(o => {
        o.button.type.set("radio")
        o.button.onCommit(v => {
          if (v) this.value.set(o.value)
          else if (!v && this.value.value() == o.value) {
            if (can_be_null) this.value.set(null)
            else o.button.setValue(true)
          }
        })
      })

      this.value.subscribe(v => {
        this.buttons.forEach(b => {
          b.button.setValue(b.value == v)
        })
      })

      if (can_be_null) this.value.set(null)
      else buttons[0].button.setValue(true)
    }

    get(): T {
      return this.value.value()
    }

    setValue(v: T): this {
      this.value.set(v)

      return this
    }

    onChange(f: (_: T) => any): this {
      this.value.subscribe(f)

      return this
    }

    checkboxes(): Checkbox[] {
      return this.buttons.map(b => b.button)
    }
  }

}