import Widget from "../../../lib/ui/Widget";
import {C} from "../../../lib/ui/constructors";
import {Observable, observe} from "../../../lib/reactive";
import spacer = C.spacer;
import observe_combined = Observable.observe_combined;

export class ControlHeader extends Widget {
  name: Observable<string>
  close_handler: Observable<() => any>

  constructor(name: string, close_handler: () => any = null) {
    super(c("<div class='ctr-map-control-header'></div>"))

    this.name = observe(name)
    this.close_handler = observe(close_handler)

    observe_combined({name: this.name, close_handle: this.close_handler}).subscribe(({name, close_handle}) => {
      this.empty()

      this
        .append(c().text(name))
        .append(spacer().css("min-width", "20px"))

      if (close_handle) {
        this.append(c("<div class='ctr-map-control-header-close'>&times;</div>")
          .tooltip("Close (Esc)")
          .tapRaw(r => r.on("click", () => close_handle())))
      }
    }, true)
  }
}

export default class ControlWithHeader extends Widget {
  public header: ControlHeader
  public body: Widget

  constructor(name: string, close_handler: () => any = null) {
    super();

    this.header = new ControlHeader(name, close_handler).appendTo(this)

    this.body = c("<div class='ctr-map-control-body'></div>").appendTo(this)
  }

  setContent(content: Widget): this {
    this.body.empty().append(content)

    return this
  }
}