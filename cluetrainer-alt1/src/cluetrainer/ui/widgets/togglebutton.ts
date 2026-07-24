import ClickEvent = JQuery.ClickEvent;

export default class ToggleButton {
  private handler: (s: boolean, e: ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => void = null

  constructor(public button: JQuery, private state: boolean = false) {
    this.update()

    let self = this
    this.button.on("click", (e) => {
      self.state = !self.state
      self.update()

      if (self.handler) self.handler(self.state, e)
    })
  }

  private update() {
    if (this.state) this.button.addClass("active")
    else this.button.removeClass("active")
  }

  on_toggle(f: (s: boolean, e: ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => void) {
    this.handler = f

    return this
  }
}