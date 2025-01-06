import Widget from "../../lib/ui/Widget";
import {ControlHeader} from "./map/ControlWithHeader";

export default class MapSideBar extends Widget {
  header: ControlHeader
  body: Widget

  constructor(title: string) {
    super();

    this.addClass('ctr-map-sidebar')

    this.header = new ControlHeader(title).appendTo(this)
    this.body = c("<div style='flex-grow: 1; overflow-y: auto; overflow-x: hidden; padding: 5px'></div>").appendTo(this)
  }
}