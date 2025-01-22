import {EntityName} from "./EntityName";
import {CTRIcon} from "../../trainer/CTRIcon";

export type CursorType =
  "generic"
  | "chop"
  | "talk"
  | "open"
  | "enter"
  | "spellonentity"
  | "agility"
  | "ladderdown"
  | "ladderup"
  | "read"
  | "fish"
  | "search"
  | "attack"
  | "craft"
  | "build"
  | "mine"
  | "trade"
  | "use"
  | "cook"
  | "divine"
  | "loot"
  | "picklock"
  | "shovel"
  | "equip"
  | "hunt"
  | "discover"
  | "smith"
  | "herblore"
  | "burn"
  | "pray"
  | "runecraft"
  | "thieve"
  | "disassemble"
  | "farm"
  | "jump"

// TODO: Archaelogy

export namespace CursorType {
  export type Meta = { type: CursorType, icon_url: string, description: string, short_icon: string }

  export function all(): Meta[] {
    return [
      {type: "generic", icon_url: "assets/icons/cursor_generic.png", description: "Click", short_icon: "cursor_generic"},
      {type: "chop", icon_url: "assets/icons/cursor_chop.png", description: "Chop", short_icon: "cursor_chop"},
      {type: "talk", icon_url: "assets/icons/cursor_talk.png", description: "Talk to", short_icon: "cursor_talk"},
      {type: "open", icon_url: "assets/icons/cursor_open.png", description: "Open", short_icon: "cursor_open"},
      {type: "enter", icon_url: "assets/icons/cursor_enter.png", description: "Enter", short_icon: "cursor_enter"},
      {type: "spellonentity", icon_url: "assets/icons/cursor_alchemy.png", description: "Use spell", short_icon: "cursor_spell"},
      {type: "agility", icon_url: "assets/icons/cursor_agility.png", description: "Use", short_icon: "cursor_agility"},
      {type: "ladderdown", icon_url: "assets/icons/cursor_ladderdown.png", description: "Climb down ladder", short_icon: "cursor_ladderdown"},
      {type: "ladderup", icon_url: "assets/icons/cursor_ladderup.png", description: "Climb up ladder", short_icon: "cursor_ladderup"},
      {type: "read", icon_url: "assets/icons/cursor_read.png", description: "Read", short_icon: "cursor_read"},
      {type: "fish", icon_url: "assets/icons/cursor_fish.png", description: "Fish", short_icon: "cursor_fish"},
      {type: "search", icon_url: "assets/icons/cursor_search.png", description: "Search", short_icon: "cursor_search"},
      {type: "attack", icon_url: "assets/icons/cursor_attack.png", description: "Attack", short_icon: "cursor_attack"},
      {type: "craft", icon_url: "assets/icons/cursor_craft.png", description: "Craft at", short_icon: "cursor_craft"},
      {type: "build", icon_url: "assets/icons/cursor_build.png", description: "Build", short_icon: "cursor_build"},
      {type: "mine", icon_url: "assets/icons/cursor_mine.png", description: "Mine", short_icon: "cursor_mine"},
      {type: "trade", icon_url: "assets/icons/cursor_trade.png", description: "Trade", short_icon: "cursor_trade"},
      {type: "use", icon_url: "assets/icons/cursor_use.png", description: "Use", short_icon: "cursor_use"},
      {type: "cook", icon_url: "assets/icons/cursor_cook.png", description: "Cook", short_icon: "cursor_cook"},
      {type: "divine", icon_url: "assets/icons/cursor_divine.png", description: "Divine", short_icon: "cursor_divine"},
      {type: "loot", icon_url: "assets/icons/cursor_loot.png", description: "Loot", short_icon: "cursor_loot"},
      {type: "picklock", icon_url: "assets/icons/cursor_picklock.png", description: "Pick Lock", short_icon: "cursor_picklock"},
      {type: "shovel", icon_url: "assets/icons/cursor_shovel.png", description: "Shovel", short_icon: "cursor_shovel"},
      {type: "equip", icon_url: "assets/icons/cursor_equip.png", description: "Equip", short_icon: "cursor_equip"},
      {type: "discover", icon_url: "assets/icons/cursor_discover.png", description: "Discover", short_icon: "cursor_discover"},
      {type: "smith", icon_url: "assets/icons/cursor_smith.png", description: "Smith", short_icon: "cursor_smith"},
      {type: "herblore", icon_url: "assets/icons/cursor_herblore.png", description: "Herblore", short_icon: "cursor_herblore"},
      {type: "hunt", icon_url: "assets/icons/cursor_hunt.png", description: "Hunt", short_icon: "cursor_hunt"},
      {type: "burn", icon_url: "assets/icons/cursor_burn.png", description: "Burn", short_icon: "cursor_burn"},
      {type: "pray", icon_url: "assets/icons/cursor_pray.png", description: "Pray", short_icon: "cursor_pray"},
      {type: "runecraft", icon_url: "assets/icons/cursor_runecraft.png", description: "Runecraft", short_icon: "cursor_runecraft"},
      {type: "thieve", icon_url: "assets/icons/cursor_thieve.png", description: "Thieve", short_icon: "cursor_thieve"},
      {type: "disassemble", icon_url: "assets/icons/cursor_invention.png", description: "Disassemble", short_icon: "cursor_invention"},
      {type: "farm", icon_url: "assets/icons/cursor_farm.png", description: "Forage", short_icon: "cursor_farm"},
      {type: "jump", icon_url: "assets/icons/cursor_jump.png", description: "Jump", short_icon: "cursor_jump"},
    ]
  }

  export function meta(type: CursorType): Meta {
    return all().find(s => s.type == type)
  }

  export function defaultEntity(type: CursorType): EntityName {
    switch (type) {
      case "generic":
      case "spellonentity":
      case "craft":
      case "build":
      case "use":
      case "cook":
      case "divine":
      case "picklock":
      case "shovel":
      case "hunt":
      case "discover":
      case "smith":
      case "herblore":
      case "burn":
      case "pray":
      case "runecraft":
        return {kind: "static", name: "Entity"}
      case "chop":
        return {kind: "static", name: "Tree"}
      case "talk":
      case "trade":
      case "thieve":
        return {kind: "npc", name: "NPC"}
      case "attack":
        return {kind: "npc", name: "Monster"}
      case "open":
        return {kind: "static", name: "Door"}
      case "enter":
        return {kind: "static", name: "Cave"}
      case "agility":
        return {kind: "static", name: "Shortcut"}
      case "ladderdown":
      case "ladderup":
        return {kind: "static", name: "Stairs"}
      case "read":
        return {kind: "static", name: "Book"}
      case "fish":
        return {kind: "static", name: "Fishing Spot"}
      case "search":
        return {kind: "static", name: "Chest"}
      case "mine":
        return {kind: "static", name: "Rock"}
      case "loot":
      case "equip":
        return {kind: "item", name: "Item"}
    }
  }

  export function getIcon(cursor: CursorType): CTRIcon {
    const meta = CursorType.meta(cursor)

    if(!meta) debugger
    return {
      file_name: `${meta.short_icon}.png`,
      id: "",
      name: meta.description,
      size_on_map: {x: 28, y: 31},
      map_anchor: {x: 4, y: 1}
    }
  }

  export function fromCacheCursor(id: number | null | undefined) {
    const table: Record<number, CursorType> = {
      0: "generic",
      5: "trade",
      42: "attack",
      44: "talk",
      46: "use",
      49: "open",
      51: "equip",
      52: "ladderup",
      53: "ladderdown",
      55: "jump",
      56: "search",
      57: "enter",
      58: "mine",
      59: "chop",
      60: "fish",
      61: "pray",
      63: "smith",
      64: "cook",
      171: "farm",
      173: "shovel",
      181: "agility",
      200: "divine",
      208: "discover",
    }

    return table[id ?? 0] || "generic"
  }

  export function iconSize(scale: number = 1): [number, number] {
    return [scale * 28, scale * 31]
  }

  export function iconAnchor(scale: number = 1, centered: boolean = false): [number, number] {
    return centered ? [scale * 14, scale * 16] : [scale * 3, 0]
  }

}