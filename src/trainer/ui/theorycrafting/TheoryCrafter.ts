import Behaviour, {SingleBehaviour} from "../../../lib/ui/Behaviour";
import {Application} from "../../application";
import TheoryCraftingSidebar from "./TheoryCraftingSidebar";
import OverviewLayer from "./OverviewLayer";
import {AugmentedMethod, MethodPackManager} from "../../model/MethodPackManager";
import MethodEditor from "./MethodEditor";
import * as lodash from "lodash";

export default class TheoryCrafter extends Behaviour {
  sidebar: TheoryCraftingSidebar
  layer: OverviewLayer

  method_editor = this.withSub(new SingleBehaviour<MethodEditor>())

  constructor(public app: Application) {
    super();

    MethodPackManager.instance().saved.on(async () => {
      await this.layer.filter_control.refreshFilterIndex()
    }).bindTo(this.lifetime_manager)

    this.method_editor.behaviour.subscribe((b, old_b) => {
      if (b && !old_b) {
        this.sidebar.setVisible(false)
        this.layer.remove()
      } else if (!b && old_b) {
        this.sidebar.setVisible(true)
        this.layer.addTo(this.app.map)
      }
    })

    this.method_editor.content_stopped.on(() => {
      this.method_editor.set(null)
    })
  }

  protected begin() {
    this.sidebar = new TheoryCraftingSidebar(this).prependTo(this.app.main_content)

    this.app.favourites.method_favourite_changed.on(change => {
      this.sidebar.notifyFavouriteChange(change)
    }).bindTo(this.lifetime_manager)

    this.app.map.invalidateSize()

    this.layer = new OverviewLayer(this).addTo(this.app.map)
  }

  protected end() {
    this.sidebar.remove()

    this.layer.remove()
  }

  async editMethod(method: AugmentedMethod) {
    let copy: AugmentedMethod = {
      clue: method.clue,
      pack: method.pack,
      method: lodash.cloneDeep(method.method)
    }

    const really = await (async (): Promise<boolean> => {
      let active_editor = this.method_editor.get()

      if (!active_editor) return true

      return await active_editor.requestClosePermission()
    })()

    if (really) {
      this.method_editor.set(new MethodEditor(this, copy))
    }

  }
}