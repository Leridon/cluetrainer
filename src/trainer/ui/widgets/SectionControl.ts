import Widget from "../../../lib/ui/Widget";
import {Observable, observe} from "../../../lib/reactive";
import {C} from "../../../lib/ui/constructors";
import cls = C.cls;

export class SectionControl<id_type extends string = string> extends Widget {
  menu_bar: Widget
  content: Widget

  private entry_buttons: {
    original: {
      section: SectionControl.Section,
      entry: SectionControl.Entry
    },
    button: Widget
  }[] = []

  private active_entry: Observable<string> = observe(null)

  constructor(private sections: SectionControl.Section<id_type>[]) {
    super(cls("ctr-section-control"));

    this.active_entry.subscribe(active => {
      this.entry_buttons.forEach(e => {
        const isActive = active == e.original.entry.id

        e.button.toggleClass("active", isActive)

        if (isActive) {
          this.content.empty()

          this.content.append(
            C.cls("ctr-section-control-content-header")
              .css("padding-left", "0")
              .text(e.original.entry.name),
            e.original.entry.renderer()
          )

          this.content.raw().scrollTo(0, 0)
        }
      })
    })

    this.render()

    this.active_entry.set(sections[0].entries[0].id)
  }

  setActiveSection(id: id_type): this {
    if (id) this.active_entry.set(id)

    return this
  }

  private render() {
    this.empty()

    this.append(
      this.menu_bar = cls("ctr-section-control-menu"),
      this.content = cls("ctr-section-control-content")
    )

    for (const section of this.sections) {
      cls("ctr-section-control-menu-header")
        .text(section.name)
        .appendTo(this.menu_bar)

      for (const entry of section.entries) {
        const button = cls("ctr-section-control-menu-entry")
          .on("click", () => {
            this.active_entry.set(entry.id)
          })
          .text(entry.short_name ?? entry.name)
          .appendTo(this.menu_bar)

        this.entry_buttons.push({
          original: {section, entry},
          button: button
        })
      }
    }
  }
}

export namespace SectionControl {

  export type Entry<id_type extends string = string> = {
    id: id_type,
    name: string,
    short_name?: string,
    renderer: () => Widget
  }

  export type Section<id_type extends string = string> = {
    name: string,
    entries: Entry<id_type>[]
  }
}