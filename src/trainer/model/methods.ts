import {ScanTree} from "lib/cluetheory/scans/ScanTree";
import {Path} from "lib/runescape/pathing";
import {Clues} from "../../lib/runescape/clues";
import {util} from "../../lib/util/util";
import * as lodash from "lodash";

export namespace SolvingMethods {
  import timestamp = util.timestamp;
  import ClueSpot = Clues.ClueSpot;
  import uuid = util.uuid;
  export type method_kind = "scantree" | "general_path"

  export type ClueAssumptions = {
    meerkats_active?: boolean,
    full_globetrotter?: boolean,
    way_of_the_footshaped_key?: boolean
  } & Path.PathAssumptions

  export namespace ClueAssumptions {
    export function init(): ClueAssumptions {
      return {
        double_escape: true,
        double_surge: true,
        full_globetrotter: true,
        meerkats_active: true,
        mobile_perk: true,
        way_of_the_footshaped_key: true
      }
    }

    export function filterWithRelevance(assumptions: ClueAssumptions, relevance: Relevance): ClueAssumptions {
      const copy = lodash.cloneDeep(assumptions)

      for (let key of Object.keys(copy)) {
        if (!relevance.includes(key as keyof ClueAssumptions)) copy[key] = undefined
      }

      return copy
    }

    export type Relevance = (keyof ClueAssumptions)[]

    export namespace Relevance {
      export const all: Relevance = ["double_escape", "double_surge", "mobile_perk", "way_of_the_footshaped_key", "full_globetrotter", "meerkats_active"]

      export function forSpot(step: ClueSpot): Relevance {
        const relevant: Relevance = ["double_escape", "double_surge", "mobile_perk"]

        if (step.clue.solution && step.clue.solution.type == "search" && step.clue.solution.key) {
          relevant.push("way_of_the_footshaped_key")
        }

        if (step.clue.type == "emote" && step.clue.hidey_hole) {
          relevant.push("full_globetrotter")
        }

        if (step.clue.type == "scan") {
          relevant.push("meerkats_active")
        }

        return relevant
      }
    }
  }

  type method_base = Method.Meta & {
    type: method_kind,
    id: string,
    timestamp: number,
    for: ClueSpot.Id,
    expected_time?: number,
    is_default_override?: boolean
  }

  export type ScanTreeMethod = method_base & {
    type: "scantree",
    tree: ScanTree.ScanTree
  }

  export type GenericPathMethod = method_base & {
    type: "general_path",
    pre_path?: Path.raw,
    main_path: Path.raw,
    post_path?: Path.raw
  }

  export type Method = ScanTreeMethod | GenericPathMethod

  export namespace Method {
    export type Meta = {
      name: string,
      description: string,
      assumptions: ClueAssumptions,
    }

    export function meta(method: Method): Meta {
      return {
        name: method.name,
        description: method.description,
        assumptions: method.assumptions
      }
    }

    export function setMeta<T extends Method>(method: T, meta: Meta): T {
      method.name = meta.name
      method.description = meta.description
      method.assumptions = lodash.cloneDeep(meta.assumptions)

      return method
    }

    export function allPaths(method: Method): Path {

      const raw: Path[] = (() => {
        switch (method.type) {
          case  "general_path":
            return [method.pre_path, method.main_path, method.post_path]
          case "scantree":

          function gather(accu: Path[], node: ScanTree.ScanTreeNode): Path[] {

            accu.push(node.path)

            node.children.forEach(c => gather(accu, c.value))

            return accu
          }

            return gather([], method.tree.root)
        }
      })()

      raw.filter(p => p && p.length > 0)

      return raw.flat()
    }
  }

  export function init(clue: Clues.ClueSpot): Method {
    // TODO: Sensible default names

    if (clue.clue.type == "scan") {
      return {
        id: uuid(),
        type: "scantree",
        timestamp: timestamp(),
        name: "",
        description: "",
        assumptions: ClueAssumptions.init(),
        for: {clue: clue.clue.id},
        tree: ScanTree.init(clue.clue)
      }
    } else {
      return {
        id: uuid(),
        type: "general_path",
        timestamp: timestamp(),
        name: "",
        description: "",
        assumptions: ClueAssumptions.init(),
        for: {clue: clue.clue.id, spot: clue.spot ?? undefined},
        post_path: [],
        pre_path: [],
        main_path: [],
      }
    }
  }

  export function clone<T extends Method>(method: T): T {
    const clone = lodash.cloneDeep(method)

    clone.id = uuid()

    return clone
  }
}