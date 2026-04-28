import Widget from "../../lib/ui/Widget";
import {C} from "../../lib/ui/constructors";
import cls = C.cls;
import Appendable = C.Appendable;

export class Notification {
  private _type: Notification.Kind = "information"
  _duration: number | null = 3000
  private hasDismiss: boolean = true
  private options: {
    content: string | Widget,
    handler: (not: NotificationInstance) => void
  }[] = []
  private _content: Appendable = c()

  constructor() {

  }

  show(bar: NotificationBar = undefined) {
    if (!bar) bar = NotificationBar.instance()

    bar.do(this)
  }

  render(instance: NotificationInstance): Widget {
    const widget = cls("ctr-notification")

    widget
      .addClass(`ctr-notification-${this._type ?? "information"}`)

    const body = cls("ctr-notification-content")
      .append(
        this._content,
      )
      .appendTo(widget)

    for (let option of this.options) {
      const content = typeof option.content == "string"
        ? cls("ctr-notification-link").append(option.content)
        : option.content

      body.append(
        cls("ctr-notification-spacer"),
        content.on("click", () => {
          option.handler(instance)
        }),
      )
    }

    if (this.hasDismiss) {
      body.append(
        cls("ctr-notification-spacer"),
        c("<div class='ctr-notification-dismiss'>&times;</div>")
          .tooltip("Dismiss")
          .on("click", () => instance.dismiss()))
    }

    return widget
  }

  setType(type: Notification.Kind): this {
    this._type = type

    return this
  }

  addButton(text: string | Widget, handler: (_: NotificationInstance) => void = () => {}): this {
    this.options.push({
      content: text,
      handler: handler
    })

    return this
  }

  /**
   * @param duration Timeout duration in milliseconds
   */
  setDuration(duration: number | null): this {
    this._duration = duration

    return this
  }

  setContent(content: Appendable): this {
    this._content = content

    return this
  }
}


export class NotificationInstance {
  widget: Widget

  constructor(private original: Notification,
              private bar: NotificationBar) {
    this.widget = original.render(this)
  }

  dismiss(fade: boolean = false) {
    if (fade) this.widget.container.fadeOut(300, () => this.widget.remove())
    else this.widget.remove()
  }
}

export namespace Notification {
  export type Kind = "error" | "information"

  export function notification(content: Appendable, type: "error" | "information" = "information"): Notification {
    return new Notification().setContent(content).setType(type)
  }
}

export class NotificationBar extends Widget {

  constructor() {
    super();

    this.addClass("ctr-notification-bar")
  }

  do(notification: Notification): this {
    const instance = new NotificationInstance(notification, this)

    instance.widget
      .css("display", "none")
      .appendTo(this)
      .container.animate({
      "height": "toggle"
    }, 300)

    if (notification._duration != null) {
      setTimeout(() => {
        instance.dismiss(true)
      }, notification._duration)
    }

    return this
  }

  static _instance: NotificationBar = null

  static instance(): NotificationBar {
    if (!this._instance) this._instance = new NotificationBar()

    return this._instance
  }
}