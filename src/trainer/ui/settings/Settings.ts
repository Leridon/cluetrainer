import {TypeUtil} from "../../../lib/util/type_util";
import {ClueTier} from "../../../lib/runescape/clues";
import {Transportation} from "../../../lib/runescape/transportation";
import {NeoSolving} from "../neosolving/NeoSolvingBehaviour";
import {CrowdSourcing} from "../../CrowdSourcing";

export namespace Settings {
  import Tuple = TypeUtil.Tuple;

  export type TeleportSettings = {
    potas: {
      color: PotaColor,
      slots: Tuple<{
        group_id: string,
        access_id: string
      }, 6>
    }[],
    presets: {
      id: number,
      fixed?: boolean,
      name: string,
      fairy_ring_favourites: string[],
      active_potas: PotaColor[]
    }[],
    active_preset: number,
    preset_bindings_active: boolean,
    preset_bindings: Record<ClueTier, number | null>
  }

  export type Settings = {
    teleport_customization: TeleportSettings,
    solving: NeoSolving.Settings,
    crowdsourcing: CrowdSourcing.Settings
  }

  export function normalize(settings: Settings): Settings {
    if (!settings) settings = {teleport_customization: undefined, solving: undefined, crowdsourcing: undefined}

    settings.teleport_customization = TeleportSettings.normalize(settings.teleport_customization)
    settings.solving = NeoSolving.Settings.normalize(settings.solving)
    settings.crowdsourcing = CrowdSourcing.Settings.normalize(settings.crowdsourcing)

    return settings
  }

  export namespace TeleportSettings {
    import ActiveTeleportCustomization = Transportation.TeleportGroup.ActiveTeleportCustomization;

    export function empty(): TeleportSettings {
      return {
        potas: [],
        presets: [{
          id: 0,
          fixed: true,
          name: "Default",
          fairy_ring_favourites: new Array(10).fill(null),
          active_potas: ["red", "green", "yellow", "purple"]
        }],
        active_preset: 0,
        preset_bindings: {
          easy: null, elite: null, hard: null, master: null, medium: null, tetracompass: null, sandy: null
        },
        preset_bindings_active: false
      }
    }

    export function clueChasersRecommendations(): TeleportSettings {
      return {
        "potas": [
          {
            "color": "green",
            "slots": [
              {
                "group_id": "skillsnecklace",
                "access_id": "ring"
              },
              {
                "group_id": "amuletofglory",
                "access_id": "necklace"
              },
              {
                "group_id": "combatbracelet",
                "access_id": "ring"
              },
              {
                "group_id": "digsitependant",
                "access_id": "ring"
              },
              {
                "group_id": "ringofslaying",
                "access_id": "ring"
              },
              {
                "group_id": "travellersnecklace",
                "access_id": "ring"
              }
            ]
          },
          {
            "color": "red",
            "slots": [
              {
                "group_id": "enlightenedamulet",
                "access_id": "ring"
              },
              {
                "group_id": "ringofrespawn",
                "access_id": "ring"
              },
              {
                "group_id": "ringofduelling",
                "access_id": "ring"
              },
              {
                "group_id": "gamesnecklace",
                "access_id": "necklace"
              },
              {
                "group_id": "ringofwealth",
                "access_id": "ring"
              },
              null
            ]
          }
        ],
        "presets": [
          {
            "id": 0,
            "fixed": true,
            "name": "Default",
            "fairy_ring_favourites": [
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "active_potas": ["red", "green", "yellow", "purple"]
          },
          {
            "id": -1,
            "name": "Easy Recommendation",
            "active_potas": [
              "red",
              "green"
            ],
            "fairy_ring_favourites": [
              "AIQ",
              "DIS",
              "CJR",
              null,
              null,
              null,
              null,
              null,
              null,
              null
            ]
          },
          {
            "id": -2,
            "name": "Medium Recommendation",
            "active_potas": [
              "red",
              "green"
            ],
            "fairy_ring_favourites": [
              "AIQ",
              "AJR",
              "AKS",
              "ALS",
              "BKR",
              "CIP",
              "CKS",
              "CLS",
              "DJP",
              "DKP"
            ]
          },
          {
            "id": -3,
            "name": "Hard Recommendation",
            "active_potas": [
              "red",
              "green"
            ],
            "fairy_ring_favourites": [
              "ALQ",
              "DKS",
              "DJP",
              "CKS",
              "CKR",
              "CJS",
              "BKR",
              "AKQ",
              "ALP",
              null
            ]
          },
          {
            "id": -4,
            "name": "Elite Recommendation",
            "active_potas": [
              "red",
              "green"
            ],
            "fairy_ring_favourites": [
              "AJR",
              "AKQ",
              "AKS",
              "ALQ",
              "BKR",
              "CJR",
              "CJS",
              "CKQ",
              "CKR",
              "DLQ"
            ]
          },
          {
            "id": -5,
            "name": "Master Recommendation",
            "active_potas": [
              "green"
            ],
            "fairy_ring_favourites": [
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null,
              null
            ]
          }
        ],
        "active_preset": 0,
        "preset_bindings": {
          "easy": -1,
          "medium": -2,
          "hard": -3,
          "elite": -4,
          "master": -5,
          "tetracompass": null,
          "sandy": null
        },
        "preset_bindings_active": true
      }
    }

    export function normalize(settings: TeleportSettings): TeleportSettings {
      if (!settings) settings = empty()

      if (!settings.potas) settings.potas = []

      if (!Array.isArray(settings.presets) || settings.presets.length == 0) settings.presets = empty().presets

      if (!settings.presets.some(p => p.id == settings.active_preset)) settings.active_preset = settings.presets[0].id

      settings.preset_bindings = {
        easy: null,
        medium: null,
        hard: null,
        elite: null,
        master: null,
        tetracompass: null,
        sandy: null,
        ...(settings.preset_bindings ?? {})
      }

      return settings
    }

    export function inferActiveCustomization(settings: TeleportSettings): ActiveTeleportCustomization {
      if (!settings) debugger

      const active_preset = settings.presets.find(p => p.id == settings.active_preset)

      return {
        fairy_ring_favourites: active_preset?.fairy_ring_favourites ?? [],
        pota_slots: active_preset?.active_potas?.flatMap(color => {
          const pota = settings.potas.find(p => p.color == color)

          if (!pota) return []

          return pota.slots.map((slot, i) => {
            return {
              jewellry: slot,
              pota: {
                color: color,
                slot: i + 1
              }
            }
          }).filter(p => p.jewellry)
        }) ?? []
      }
    }
  }

  export type PotaColor = typeof PotaColor.values[number]

  export namespace PotaColor {
    export const values = ["red", "green", "yellow", "purple"] as const

    export function iconUrl(color: PotaColor): string {
      return `assets/icons/teleports/pota_${color}.png`
    }
  }
}