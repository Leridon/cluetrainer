import {GieliCoordinates, TileCoordinates, TileRectangle} from "./coordinates";
import {Vector2} from "../math";
import {CursorType} from "./CursorType";
import {TileArea} from "./coordinates/TileArea";
import {Transportation} from "./transportation";

export type ClueTier = typeof ClueTier.values[number]

export namespace ClueTier {
  export const values = ["easy", "medium", "hard", "elite", "master", "tetracompass", "sandy"] as const
}

export type ClueType =
  "anagram"
  | "compass"
  | "coordinates"
  | "cryptic"
  | "emote"
  | "map"
  | "scan"
  | "simple"
  | "skilling"

export namespace ClueType {
  export function meta(x: ClueTier | ClueType) {
    let lut: Record<ClueType | ClueTier, {
      icon_url: string,
      name: string
    }> = {
      easy: {icon_url: "/assets/icons/sealedeasy.png", name: "Easy"},
      medium: {icon_url: "/assets/icons/sealedmedium.png", name: "Medium"},
      hard: {icon_url: "/assets/icons/sealedhard.png", name: "Hard"},
      elite: {icon_url: "/assets/icons/sealedelite.png", name: "Elite"},
      master: {icon_url: "/assets/icons/sealedmaster.png", name: "Master"},
      tetracompass: {icon_url: "/assets/icons/tetracompass.png", name: "Tetracompass"},
      sandy: {icon_url: "/assets/icons/sandcastle.png", name: "Sandy"},
      anagram: {icon_url: "/assets/icons/activeclue.png", name: "Anagram"},
      compass: {icon_url: "/assets/icons/arrow.png", name: "Compass"},
      coordinates: {icon_url: "/assets/icons/sextant.png", name: "Coordinate"},
      cryptic: {icon_url: "/assets/icons/activeclue.png", name: "Cryptic"},
      emote: {icon_url: "/assets/icons/emotes.png", name: "Emote"},
      map: {icon_url: "/assets/icons/map.png", name: "Map"},
      scan: {icon_url: "/assets/icons/scan.png", name: "Scan"},
      simple: {icon_url: "/assets/icons/activeclue.png", name: "Simple"},
      skilling: {icon_url: "/assets/icons/skills.webp", name: "Skilling"}
    }

    return lut[x]
  }

  export function pretty(x: ClueTier | ClueType) {
    if (!x) return ""
    return x.charAt(0).toUpperCase() + x.slice(1);
  }

  export const all: ClueType[] = ["simple", "cryptic", "emote", "map", "anagram", "coordinates", "compass", "scan", "skilling"]
}

export namespace Clues {
  export type Challenge =
    { type: "wizard" } |
    { type: "slider" } |
    { type: "celticknot" } |
    { type: "lockbox" } |
    { type: "towers" } |
    Challenge.ChallengeScroll

  export namespace Challenge {
    export type ChallengeScroll = { type: "challengescroll", question: string, answers: { answer: number, note?: string }[] }
  }

  export type Solution = Solution.TalkTo | Solution.Dig | Solution.Search

  export namespace Solution {
    // The area for npcs should include all tiles they can be talked to from, so one tile bigger than their wander range
    export type TalkTo = {
      type: "talkto",
      npc: string
      spots: {
        id?: string,
        range: TileArea,
        exclusive?: boolean,
        note?: string,  // Describing conditions for the npc to be at that spot, such as "After completing quest X"
        description: string // Strings like "in City of Um", "at the Bank" etc.
      }[],
    }
    export type Dig = {
      type: "dig",
      spot: TileCoordinates
      description: string | null// Strings like "on top of the fern", "next to the window" etc.
    }
    export type Search = {
      type: "search",
      spot: TileRectangle,
      entity: string,
      key?: {
        instructions: string,
        answer: string,
        area?: TileArea
      }
    }
  }

  type StepShared = {
    id: number,
    type: ClueType,
    tier: ClueTier,
    text: string[],
    challenge?: Challenge[],
    solution?: Solution
  }

  export type Anagram = StepShared & { type: "anagram", solution: Solution.TalkTo, anagram: string[] }
  export type Compass = StepShared & { type: "compass", spots: TileCoordinates[], valid_area: TileRectangle, single_tile_target?: boolean }
  export type Coordinate = StepShared & { type: "coordinates", coordinates: GieliCoordinates }
  export type Cryptic = StepShared & { type: "cryptic", solution: Solution }
  export type Emote = StepShared & {
    type: "emote",
    area: TileArea,
    items: string[],
    emotes: string[],
    double_agent: boolean,
    hidey_hole: null | { location: TileRectangle, name: string },
  }
  export type Map = StepShared & { type: "map", ocr_data: number[], solution: Solution, image_url: string }
  export type Scan = StepShared & { type: "scan", scantext: string, range: number, spots: TileCoordinates[] }
  export type Simple = StepShared & { type: "simple", solution: Solution }
  export type Skilling = StepShared & {
    type: "skilling",
    areas: TileArea[],
    answer: string,
    cursor: CursorType
  }

  export type Step = Anagram | Compass | Coordinate | Cryptic | Emote | Map | Scan | Simple | Skilling

  export type ScanStep = Scan

  export type ClueSpot<step_t extends Step = Step> = { clue: step_t, spot?: TileCoordinates }

  export type StepWithTextIndex = {
    step: Step,
    text_index: number
  }

  export namespace Step {
    export function solution(step: Step): Solution {
      if (step.solution) return step.solution

      if (step.type == "coordinates") return {
        type: "dig",
        spot: GieliCoordinates.toCoords(step.coordinates),
        description: null
      }

      return null
    }

    export function shortString(step: Step, text_variant: number = 0): string {
      let i = Math.max(0, Math.min(step.text.length - 1, text_variant))

      switch (step.type) {
        case "anagram":
          return `Anagram: ${step.anagram[i]}`
        case "map":
          return `Map: ${step.text[i]}`
        case "coordinates":
          return GieliCoordinates.toString(step.coordinates)
        case "scan":
          return `Scan ${step.scantext} (${step.range} tiles)`
        default:
          return step.text[i]
      }
    }
  }

  export namespace ClueSpot {

    import default_interactive_area = Transportation.EntityTransportation.default_interactive_area;
    export type Id = { clue: number, spot?: TileCoordinates }

    export namespace Id {
      export function equals(a: ClueSpot.Id, b: ClueSpot.Id): boolean {
        return a?.clue == b?.clue && ((a?.spot == b?.spot) || TileCoordinates.eq2(a?.spot, b?.spot))
      }
    }

    export function shortString(spot: Clues.ClueSpot, text_variant: number = 0): string {
      if (spot.clue.type == "compass") return `Compass spot ${spot.spot ? Vector2.toString(spot.spot) : "???"}`
      else return Step.shortString(spot.clue, text_variant)
    }

    export function targetArea(spot: Clues.ClueSpot): TileArea[] {
      if (spot.spot) {

        if (spot.clue.type == "compass" && spot.clue.single_tile_target) return [TileArea.fromTiles([spot.spot])]
        
        return [digSpotArea(spot.spot)]
      }

      const sol = Clues.Step.solution(spot.clue)

      if (sol) {
        switch (sol.type) {
          case "search":
            return [default_interactive_area(sol.spot)]
          case "dig":
            return [digSpotArea(sol.spot)]
          case "talkto":
            return sol.spots.map(s => s.range)
        }
      }

      if (spot.clue.type == "emote") return [spot.clue.area]

      if (spot.clue.type == "scan") return [TileArea.fromRect(TileRectangle.from(...spot.clue.spots))]
    }

    export function toId(spot: ClueSpot): Id {
      return {clue: spot.clue.id, spot: spot.spot}
    }
  }

  export function digSpotArea(spot: TileCoordinates): TileArea {
    return TileArea.fromRect(digSpotRect(spot))
  }

  export function digSpotRect(spot: TileCoordinates): TileRectangle {
    return {
      topleft: {x: spot.x - 1, y: spot.y + 1},
      botright: {x: spot.x + 1, y: spot.y - 1},
      level: spot.level
    }
  }

  export function requiresKey(clue: Step): clue is Step & { solution: { type: "search" } } {
    return clue.solution && clue.solution.type == "search" && !!clue.solution.key
  }
}