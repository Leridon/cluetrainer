import Widget from "../../lib/ui/Widget";

export namespace TextRendering {
  export function render_digspot(spot: number | string): Widget {
    return c("<span>").addClass("ctr-digspot-inline").text(spot?.toString())
  }

  export function render_scanregion(name: string): Widget {
    return c("<span>").addClass("ctr-scanspot-inline").text(name)
  }
}