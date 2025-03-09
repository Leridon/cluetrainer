import Widget from "lib/ui/Widget";
import {Transportation} from "../../../lib/runescape/transportation";
import TextField from "lib/ui/controls/TextField";
import LightButton from "../widgets/LightButton";
import ExportStringModal from "../widgets/modals/ExportStringModal";
import * as lodash from "lodash"
import {Rectangle, Vector2} from "lib/math";
import {ewent, Observable, ObservableArray, observe} from "../../../lib/reactive";
import {C} from "../../../lib/ui/constructors";
import {ShortcutEditor} from "./ShortcutEditor";
import ObservableArrayValue = ObservableArray.ObservableArrayValue;
import hbox = C.hbox;
import hboxc = C.hboxc;
import {ShortcutEdit} from "./ShortcutEdit";
import span = C.span;
import spacer = C.spacer;
import {capitalize} from "lodash";
import {TileCoordinates} from "../../../lib/runescape/coordinates";
import ContextMenu from "../widgets/ContextMenu";
import {SmallImageButton} from "../widgets/SmallImageButton";
import sibut = SmallImageButton.sibut;
import MapSideBar from "../MapSideBar";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import cls = C.cls;

export default class ShortcutEditSidePanel extends MapSideBar {
  search_container: Widget
  result_container: Widget
  viewport_checkbox: Checkbox

  centered = ewent<Transportation.EntityTransportation>()

  private visible_data_view: Observable<ObservableArrayValue<Transportation.EntityTransportation & { is_builtin: boolean }>[]>
  private search_term = observe("")

  widgets: ShortcutEdit[] = []

  constructor(private editor: ShortcutEditor) {
    super("Transport Editor");

    this.header.close_handler.set(() => editor.stop())

    observe<(_: Transportation.Transportation) => boolean>(() => true).equality(() => false)

    this.editor.app.map.viewport.subscribe(() => {if (this.viewport_checkbox.get()) this.updateVisibleData()})
    this.search_term.subscribe(() => this.updateVisibleData())
    this.editor.data.array_changed.on(() => this.updateVisibleData())

    this.search_container = c().appendTo(this)

    this.visible_data_view = observe(this.editor.data.value())

    hboxc(
      new LightButton("Edit Builtins")
        .onClick(() => {
          //this.editor.data.setTo(shortcuts.map(s => Object.assign(lodash.cloneDeep(s), {is_builtin: false})))
        }),
      new LightButton("Delete Local")
        .onClick(() => {
          // this.editor.data.setTo(shortcuts.map(s => Object.assign(lodash.cloneDeep(s), {is_builtin: true})))
        }),
    ).addClass("ctr-button-container").appendTo(this.search_container)

    hboxc(
      new LightButton("Export All")
        .onClick(() => {
          new ExportStringModal(JSON.stringify(this.editor.data.value().map(v => (({is_builtin, ...rest}) => rest)(v.value())), null, 2))
            .show()
        }),
      new LightButton("Export Local")
        .onClick(() => {
          new ExportStringModal(JSON.stringify(this.editor.data.value().filter(s => !s.value().is_builtin).map(v => (({
                                                                                                                        is_builtin,
                                                                                                                        ...rest
                                                                                                                      }) => rest)(v.value())), null, 2))

            .show()
        }),
    ).addClass("ctr-button-container").appendTo(this.search_container)

    c("<div style='display: flex'></div>").append(new TextField().css("flex-grow", "1").setPlaceholder("Search Shortcuts...")
      .onPreview((v) => this.search_term.set(v))
    ).appendTo(this.search_container)

    hbox(
      this.viewport_checkbox = new Checkbox().setValue(false),
      C.span("Only show current viewport")
    )
      .appendTo(this.search_container)

    this.viewport_checkbox.onCommit(() => this.updateVisibleData())

    c().text("Results:").appendTo(this)

    this.result_container = cls("ctr-shortcut-edit-panel-results").appendTo(this)

    this.visible_data_view.subscribe(results => {

      this.result_container.empty()

      results.forEach(s => {
        hbox(
          span(`${Vector2.toString(TileCoordinates.chunk(Transportation.position(s.value())))}: ${Transportation.name(s.value())}`),
          spacer(),
          sibut("/assets/icons/edit.png", () => this.editor.editControl.shortcut.set(s)).setEnabled(!s.value().is_builtin)
        ).appendTo(this.result_container)
          .tapRaw(r => r
            .on("click", () => {
              this.editor.editControl.shortcut.set(s)
            })
            .on("dblclick", (e) => {
              e.preventDefault()
              this.editor.layer.view.center(s.value())
            })
            .on("contextmenu", (e) => {
              e.preventDefault()

              new ContextMenu(ShortcutEditor.contextMenu(s, this.editor, true))
                .showFromEvent(e)
            })
          )
      })

      /*
      let existing = this.widgets.map(w => ({keep: false, w: w}))

      this.widgets = results.map(s => {
          let e = existing.find(e => e.w.config.value == s)

          if (e) {
              e.keep = true
              return e.w
          } else {
              return ShortcutEdit.forEditor(s, this.editor.layer,
                  (v) => this.centered.trigger(v)
              ).appendTo(this.result_container)
          }
      })

      existing.filter(e => !e.keep).forEach(e => e.w.remove())*/
    }, true)

    this.editor.data.array_changed.on(() => this.updateVisibleData())
  }

  private updateVisibleData() {
    this.visible_data_view.set(this.editor.data.get().filter(s => {
      return Transportation.name(s.value()).toLowerCase().includes(this.search_term.value().toLowerCase()) && (!this.viewport_checkbox.get() || Rectangle.overlaps(Transportation.bounds(s.value()), this.editor.app.map.viewport.value().rect))
    }))
  }
}