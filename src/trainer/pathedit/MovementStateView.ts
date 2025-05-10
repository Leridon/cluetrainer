import Widget from "../../lib/ui/Widget";
import {Path} from "../../lib/runescape/pathing";
import {TileCoordinates} from "../../lib/runescape/coordinates/TileCoordinates";
import {direction} from "../../lib/runescape/movement";
import Properties from "../ui/widgets/Properties";
import movement_state = Path.movement_state;

class BuffCooldownView extends Widget {
  constructor(private value: {
    icon: string,
    on_cooldown: boolean,
    time_left: number,
    kind?: "buff" | "debuff"
  }) {
    super()

    this.addClass("ctr-buff-view")

    this.render()
  }

  private render() {
    c(`<img src='${this.value.icon}' alt="">`).appendTo(this)

    if (this.value.kind == "buff") this.addClass("ctr-buff-view-buff")
    if (this.value.kind == "debuff") this.addClass("ctr-buff-view-debuff")

    if (this.value.on_cooldown) this.addClass("ctr-buff-view-cooldown")

    if (this.value.time_left > 0) c(`<div>${this.value.time_left}t</div>`).appendTo(this)
  }
}

export default class MovementStateView extends Widget {
  constructor(private value: movement_state) {
    super();

    this.render()
  }

  setValue(v: movement_state) {
    this.value = v
    this.render()
  }

  private render() {
    this.empty()

    let props = new Properties().appendTo(this)

    props.named("Tick", c().text(this.value.tick))
    if (this.value.position.tile) props.named("Tile", c().text(TileCoordinates.toString(this.value.position.tile)))
    if (this.value.position.direction) props.named("Facing", c().text(direction.toString(this.value.position.direction)))
    if (this.value.targeted_entity) props.named("Targeting", c().text(TileCoordinates.toString(this.value.targeted_entity)))

    let powerburst_container = c("<div class='ctr-movement-state-view-cooldowns'></div>")
    let cooldown_container = c("<div class='ctr-movement-state-view-cooldowns'></div>")

    props.named("Powerburst", powerburst_container)
    props.named("Cooldowns", cooldown_container)

    if (this.value.acceleration_activation_tick + 200 > this.value.tick) {
      if (this.value.acceleration_activation_tick + 10 > this.value.tick) {
        new BuffCooldownView({
          icon: "/assets/icons/accel.png",
          on_cooldown: false,
          kind: "buff",
          time_left: this.value.acceleration_activation_tick + 10 - this.value.tick
        }).appendTo(powerburst_container)
      }

      new BuffCooldownView({
        icon: "/assets/icons/accel.png",
        on_cooldown: true,
        kind: "debuff",
        time_left: this.value.acceleration_activation_tick + 200 - this.value.tick
      }).appendTo(powerburst_container)
    } else {
      c().text("Ready").appendTo(powerburst_container)
    }

    for (let cd of this.value.cooldowns.surge) {
      new BuffCooldownView({
        icon: "/assets/icons/surge.png",
        on_cooldown: cd > this.value.tick,
        time_left: cd - this.value.tick
      }).appendTo(cooldown_container)
    }

    for (let cd of this.value.cooldowns.escape) {
      new BuffCooldownView({
        icon: "/assets/icons/escape.png",
        on_cooldown: cd > this.value.tick,
        time_left: cd - this.value.tick
      }).appendTo(cooldown_container)
    }

    new BuffCooldownView({
      icon: "/assets/icons/dive.png",
      on_cooldown: this.value.cooldowns.dive > this.value.tick,
      time_left: this.value.cooldowns.dive - this.value.tick
    }).appendTo(cooldown_container)

    new BuffCooldownView({
      icon: "/assets/icons/barge.png",
      on_cooldown: this.value.cooldowns.barge > this.value.tick,
      time_left: this.value.cooldowns.barge - this.value.tick
    }).appendTo(cooldown_container)
  }
}