import Behaviour from "lib/ui/Behaviour";
import {GameMapControl} from "lib/gamemap/GameMapControl";
import {GameLayer} from "lib/gamemap/GameLayer";
import {Transportation} from "../../../lib/runescape/transportation";
import {Rectangle} from "lib/math"
import {ActionBar} from "../map/ActionBar";
import {InteractionGuard} from "lib/gamemap/interaction/InteractionLayer";
import {storage} from "lib/util/storage";
import ShortcutEditSidePanel from "./ShortcutEditSidePanel";
import {DrawDoor} from "./interactions/DrawDoor";
import {GameMapContextMenuEvent, GameMapMouseEvent} from "lib/gamemap/MapEvents";
import {DrawGeneralEntity} from "./interactions/DrawGeneralEntity";
import {ShortcutViewLayer} from "./ShortcutView";
import {PlaceShortcut} from "./interactions/PlaceShortcut";
import {EwentHandler, Observable, ObservableArray, observe, observeArray} from "../../../lib/reactive";
import ObservableArrayValue = ObservableArray.ObservableArrayValue;
import {TileCoordinates, TileRectangle} from "../../../lib/runescape/coordinates";
import * as lodash from "lodash";
import {ShortcutEdit} from "./ShortcutEdit";
import ContextMenu, {Menu} from "../widgets/ContextMenu";
import ControlWithHeader from "../map/ControlWithHeader";
import {ClueTrainer} from "../../ClueTrainer";

class EditControl extends GameMapControl<ControlWithHeader> {
  private remove_handler: EwentHandler<any> = null

  shortcut: Observable<ShortcutEditor.OValue> = observe(null)

  constructor(private layer: ShortcutEditGameLayer) {
    super({
        type: "floating",
        position: "top-left"
      }, new ControlWithHeader("Shortcut Edit", () => this.shortcut.set(null))
    );

    this.shortcut.subscribe(v => {
      this.remove_handler?.remove()

      this.content.setVisible(!!v)

      this.content.body.empty()

      if (v) {
        this.remove_handler = v.removed.on((v) => {
          if (this.shortcut.value() == v) this.shortcut.set(null)
          this.remove_handler?.remove()
          this.remove_handler = null
        })

        this.content.body.append(new ShortcutEdit({
            value: v,
            ovalue: v,
            edit_layer: this.layer,
            interaction_guard: this.layer.interactionGuard,
            associated_preview: this.layer.view.getView(v),
            centered_handler: (s) => this.layer.view.center(s),
            collapsible: false
          }
        ))
      }
    }, true)

    this.content.css("width", "400px")
  }
}

export class ShortcutEditGameLayer extends GameLayer {
  interactionGuard: InteractionGuard = new InteractionGuard().setDefaultLayer(this)

  view: ShortcutViewLayer = null

  constructor(public editor: ShortcutEditor) {
    super();

    new GameMapControl({
      type: "gapless",
      position: "bottom-center"
    }, new ShortcutEditActionBar(editor)).addTo(this)

    this.view = new ShortcutViewLayer(this.editor.data).addTo(this)
  }

  eventClick(event: GameMapMouseEvent) {
    event.onPost(() => {
      let shortcuts = this.editor.data.value().filter(s => {
        return !s.value().is_builtin && Rectangle.containsTile(Transportation.bounds(s.value()), event.coordinates)
      })

      if (shortcuts.length == 1) {
        this.editor.editControl.shortcut.set(shortcuts[0])
      } else if (shortcuts.length > 1) {
        new ContextMenu({
          type: "submenu",
          text: "",
          children: shortcuts.map(s => ({
            type: "basic", text: ShortcutEditor.nameWithBuiltin(s.value()), handler: () => {
              this.editor.editControl.shortcut.set(s)
            }
          }))
        }).showFromEvent2(event.original)
      }

    })
  }

  eventContextMenu(event: GameMapContextMenuEvent) {
    event.onPost(() => {
      let shortcuts = this.editor.data.value().filter(s => {
        return Rectangle.containsTile(Transportation.bounds(s.value()), event.coordinates)
      })

      shortcuts.forEach(s => {
        let entries = ShortcutEditor.contextMenu(s, this.editor, true, event.tile())

        if (shortcuts.length > 1) {
          event.add({type: "submenu", children: entries.children, text: Transportation.name(s.value())})
        } else {
          event.add(...entries.children)
        }
      })
    })
  }

  startMove(s: ShortcutEditor.OValue, origin: TileCoordinates = null) {
    if (!origin) origin = TileRectangle.center(Transportation.bounds(s.value()))

    this.interactionGuard.set(new PlaceShortcut(s.value(), origin, n => this.editor.data.add(Object.assign(n, {is_builtin: false})))
      .onCommit(n => s.set(Object.assign(n, {is_builtin: false})))
      .onStart(() => this.view.getView(s).setOpacity(0))
      .onEnd(() => this.view.getView(s)?.setOpacity(1))
    )
  }

  startPlacement(s: Transportation.EntityTransportation, origin: TileCoordinates = null) {
    if (!origin) origin = TileRectangle.center(Transportation.bounds(s))

    this.interactionGuard.set(new PlaceShortcut(s, origin, n => this.editor.data.add(Object.assign(n, {is_builtin: false})))
      .onCommit(n => this.editor.data.add(Object.assign(n, {is_builtin: false})))
    )
  }
}

class ShortcutEditActionBar extends ActionBar {
  constructor(private editor: ShortcutEditor) {

    // TODO: Portal preset, Stair Preset, Ladder Preset

    super([
      new ActionBar.ActionBarButton("assets/icons/cursor_open.png", () => {
        return this.editor.layer.interactionGuard.set(new DrawDoor({
          done_handler: (step) => this.editor.createNew(step)
        }))
      }),
      new ActionBar.ActionBarButton("assets/icons/cursor_generic.png", () => {
        return this.editor.layer.interactionGuard.set(new DrawGeneralEntity({
          done_handler: (step) => this.editor.createNew(step)
        }))
      }),
    ]);
  }
}

export class ShortcutEditor extends Behaviour {
  layer: ShortcutEditGameLayer
  editControl: EditControl

  private storage = new storage.Variable<Transportation.Transportation[]>("local_shortcuts", () => [])
  public data: ShortcutEditor.Data

  sidebar: ShortcutEditSidePanel

  constructor(public app: ClueTrainer) {
    super();

    this.data = observeArray([].concat(
      //shortcuts.map(s => Object.assign(lodash.cloneDeep(s), {is_builtin: true})),
      this.storage.get().map(s => Object.assign(s, {is_builtin: false}))
    ))

    this.data.changed.on(({value}) => this.storage.set(value.filter(v => !v.value().is_builtin).map(v => v.value())))
  }

  protected begin() {
    this.layer = new ShortcutEditGameLayer(this).addTo(this.app.map)

    this.editControl = new EditControl(this.layer).addTo(this.layer)

    this.sidebar = new ShortcutEditSidePanel(this).prependTo(this.app.main_content)
    this.sidebar.centered.on(s => this.layer.view.center(s))
  }

  protected end() {
    this.layer.remove()
    this.sidebar.remove()
  }

  public createNew(shortcut: Transportation.EntityTransportation) {
    this.editControl.shortcut.set(this.data.add(Object.assign(lodash.cloneDeep(shortcut), {is_builtin: false})))
  }
}

export namespace ShortcutEditor {
  export type Value = Transportation.EntityTransportation & { is_builtin: boolean }
  export type OValue = ObservableArrayValue<Value>
  export type Data = ObservableArray<Value>

  export function contextMenu(shortcut: OValue,
                              editor: ShortcutEditor,
                              center_on_move: boolean,
                              origin_tile: TileCoordinates = null
  ): Menu {
    let editable = !shortcut.value().is_builtin

    let menu: Menu = {
      type: "submenu",
      text: "",
      children: []
    }

    if (editable) {
      menu.children.push({
        type: "basic",
        text: `Edit ${Transportation.name(shortcut.value())}`,
        icon: "assets/icons/edit.png",
        handler: () => {
          editor.editControl.shortcut.set(shortcut)
        }
      })

      menu.children.push({
        type: "basic",
        text: `Delete ${Transportation.name(shortcut.value())}`,
        icon: "assets/icons/delete.png",
        handler: () => {shortcut.remove()}
      })

      menu.children.push({
        type: "basic",
        text: `Move ${Transportation.name(shortcut.value())}`,
        icon: "assets/icons/move.png",
        handler: () => {
          editor.layer.startMove(shortcut, origin_tile)
        }
      })
    }

    menu.children.push({
      type: "basic",
      text: `Copy ${Transportation.name(shortcut.value())}`,
      icon: "assets/icons/copy.png",
      handler: () => {
        editor.layer.startPlacement(shortcut.value(), origin_tile)
      }
    })

    if (!origin_tile) {
      menu.children.push({
        type: "basic",
        text: `Focus on ${Transportation.name(shortcut.value())}`,
        icon: "assets/icons/fullscreen.png",
        handler: () => {editor.layer.view.center(shortcut.value())}
      })
    }

    return menu
  }

  export function nameWithBuiltin(value: Value): string {
    return value.is_builtin
      ? `${Transportation.name(value)} (builtin)`
      : Transportation.name(value)
  }
}