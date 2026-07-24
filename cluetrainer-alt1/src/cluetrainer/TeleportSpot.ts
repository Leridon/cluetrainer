import {deps} from "./dependencies";

export class Spot {
  private customization: ActiveTeleportCustomization = null

  private visual_access: TeleportAccess = null

  private pota_slot: {
    img: ImageUrl,
    code_prefix: string,
  } | null

  public props: TeleportProps

  constructor(public readonly group: TeleportGroup,
              public readonly spot: TeleportSpot,
              public readonly access: TeleportAccess | undefined
  ) {
    this.visual_access = access ?? this.group.access.find(TeleportGroup.TeleportAccess.isAnywhere)

    this.refresh()
  }

  refresh() {
    this.customization = deps().app.settings.active_teleport_customization.value()

    const pota = this.visual_access && this.visual_access.type == "item" && this.visual_access.can_be_in_pota
      ? this.customization.pota_slots.find((p) => p.jewellry.group_id == this.group.id)
      : null

    this.pota_slot = pota ? {
      img: {url: `pota_${pota.pota.color}.png`},
      code_prefix: `${pota.pota.slot},`
    } : null

    // Props are combined from the various ways they can be specified.
    // Prop definitions for Access x Spot have the highest priority,
    // followed by per-access props, then per-spot props and finally per-group props.
    this.props = TeleportProps.combinePrioritized(
      {img: this.pota_slot?.img},
      this.access?.per_spot_props?.[this.spot.id],
      this.visual_access,
      this.spot,
      this.group,
      {
        animation_ticks: 0,
        menu_ticks: 0,
        code: "",
        img: {url: "homeport.png"}
      }
    )
  }

  hover(): string {
    return (this.group.name && this.spot.name)
      ? `${this.group.name} - ${this.spot.name}`
      : this.group.name || this.spot.name
  }

  image(): ImageUrl {
    return this.props.img
  }

  code(): string {
    let base_code = this.props.code

    if (this.group.id == "fairyring") {
      const i = deps().app.settings.active_teleport_customization.value().fairy_ring_favourites.indexOf(this.spot.id)

      if (i >= 0) base_code = ((i + 1) % 10).toString()
    }

    return (this.pota_slot?.code_prefix ?? "") + base_code
  }

  centerOfTarget(): TileCoordinates {
    return TileArea.activate(this.spot.target).center(true, false)
  }

  targetArea(): TileArea {
    return this.spot.target
  }

  id(): SpotId {
    return {
      group: this.group.id,
      spot: this.spot.id
    }
  }
}