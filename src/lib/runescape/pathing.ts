import {direction, MovementAbilities, MovementAssumptions, PathFinder, PlayerPosition} from "./movement";
import {util} from "../util/util";
import lodash from "lodash";
import {Rectangle, Vector2} from "../math";
import {ExportImport} from "../util/exportString";
import {floor_t, TileCoordinates, TileRectangle} from "./coordinates";
import {Transportation} from "./transportation";
import {TreeArray} from "../util/TreeArray";
import {TileArea} from "./coordinates/TileArea";
import {CursorType} from "./CursorType";
import {EntityName} from "./EntityName";
import {TransportData} from "../../data/transports";
import {CTRIcon} from "../../trainer/CTRIcon";
import movement_ability = MovementAbilities.movement_ability;

export type Path = Path.raw;

export namespace Path {
  import resolveTeleport = TransportData.resolveTeleport;
  import index = util.index;
  import cooldown = MovementAbilities.cooldown;
  import capitalize = util.capitalize;
  import EntityTransportation = Transportation.GeneralEntityTransportation;
  import defaultInteractiveArea = Transportation.EntityTransportation.defaultInteractiveArea;
  
  type step_base = {
    type: string,
    description?: string,
    is_arrival_only?: boolean
  }

  export type step_orientation = step_base & {
    type: "orientation",
    direction: direction
  }

  export type step_ability = step_base & {
    type: "ability",
    ability: movement_ability,
    target?: EntityName, // Only for barges
    target_text?: string,
    target_area?: TileArea, // Only for dives
    is_far_dive?: boolean,
    from: TileCoordinates,
    to: TileCoordinates,
  }

  export type step_run = step_base & {
    type: "run",
    target_area?: TileArea,
    to_text?: string,
    waypoints: TileCoordinates[]
  }

  export type step_teleport = step_base & {
    type: "teleport",
    id: Transportation.TeleportGroup.SpotId,
    spot: TileCoordinates
  }

  export type step_transportation = step_base & {
    type: "transport",
    assumed_start: TileCoordinates,
    internal: EntityTransportation,
  }

  export type step_redclick = step_base & {
    type: "redclick",
    target: EntityName,
    where: TileCoordinates,
    how: CursorType
  }

  export type step_powerburst = step_base & {
    type: "powerburst",
    where: TileCoordinates
  }

  export type step_cheat = step_base & {
    type: "cheat",
    assumed_start: TileCoordinates,
    target: TileCoordinates,
    orientation?: direction,
    ticks: number
  }

  export type step_cosmetic = step_base & {
    type: "cosmetic",
    icon: CTRIcon.ID,
    position: TileCoordinates,
    hide_when_not_hovered?: boolean,
    area?: TileArea,
    area_color?: string,
    arrow?: [TileCoordinates, TileCoordinates],
    arrow_color?: string
  }

  export const COSMETIC_DEFAULT_COLORS = {
    arrow: "#6970d9",
    area: "#6970d9",
  }

  export type Step = step_orientation | step_ability | step_run | step_teleport | step_redclick | step_powerburst | step_transportation | step_cheat | step_cosmetic


  type AbilityCharge = { on_cooldown_till_tick: number, cooldown_reason: AbilityCharge.CooldownType }

  namespace AbilityCharge {
    export type CooldownType = "cooldown" | "antispam"

    export function create(n: number): AbilityCharge[] {
      return new Array(n).fill(0).map(() => ({on_cooldown_till_tick: 0, cooldown_reason: "cooldown"}))
    }

    export function setCooldownIfLarger(charge: AbilityCharge, tick: number, reason: CooldownType): void {
      if (tick <= charge.on_cooldown_till_tick) return

      forceCooldown(charge, tick, reason)
    }

    export function forceCooldown(charge: AbilityCharge, tick: number, reason: CooldownType): void {
      charge.on_cooldown_till_tick = tick
      charge.cooldown_reason = reason
    }
  }

  export type movement_state = {
    tick: number,
    cooldowns: Record<movement_ability, AbilityCharge[]>,
    acceleration_activation_tick: number,
    position: PlayerPosition,
    targeted_entity: TileCoordinates,      // The targeted entity is set by redclicking it and can be used to set the player's orientation after running.
    assumptions: MovementAssumptions
  }

  export namespace movement_state {

    export function start(assumptions: MovementAssumptions): movement_state {
      return {
        tick: 0,
        cooldowns: {
          escape: AbilityCharge.create(assumptions.double_escape ? 2 : 1),
          surge: AbilityCharge.create(assumptions.double_surge ? 2 : 1),
          barge: AbilityCharge.create(1),
          dive: AbilityCharge.create(1),
        },
        acceleration_activation_tick: -1000,
        position: {tile: null, direction: null},
        targeted_entity: null,
        assumptions: assumptions
      }
    }

    export function nextAvailableCharge(state: movement_state, ability: movement_ability): { charge: AbilityCharge, remaining_cooldown: number } {
      const charge = lodash.minBy(state.cooldowns[ability], c => c.on_cooldown_till_tick)

      return {
        charge,
        remaining_cooldown: Math.max(0, charge.on_cooldown_till_tick - state.tick)
      }
    }
  }

  export type raw = Step[]

  export type augmented = {
    pre_state: movement_state,
    post_state: movement_state,
    raw: raw,
    steps: augmented_step[],
    issues: issue[],
    target: TileArea.ActiveTileArea[] | null
  }

  export namespace augmented {
    export function step_bounds(step: augmented_step): TileRectangle {
      const rect = Rectangle.combine(Path.Step.bounds(step.raw), Rectangle.from(step.pre_state.position.tile, step.post_state.position.tile))

      if (!rect) return null

      return TileRectangle.lift(rect, Path.Step.level(step.raw))
    }

    export function bounds(path: Path.augmented): Rectangle {
      return Rectangle.combine(...path.steps.map(step_bounds))
    }

    export function getState(path: Path.augmented, index: number): movement_state {
      if (index >= path.steps.length) return path.post_state
      else if (index < 0) return path.pre_state

      if (!path.steps[index]) debugger

      return path.steps[index].pre_state
    }
  }

  export type augmented_step = {
    pre_state: movement_state,
    post_state: movement_state,
    raw: Path.Step,
    section?: number,
    issues: issue[]
  }

  export type issue_level = "error" | "warning" // 0 = error, 1 = warning
  export namespace issue_level {
    export const error: issue_level = "error"
    export const warning: issue_level = "warning"
  }

  export type issue = { level: issue_level, message: string }

  /**
   * Gets the coordinates where a path ends up, without having to {@link Path.augment} it.
   * @param path The Path to get the target tile for.
   * @return The tile, or null if undefined.
   */
  export function ends_up(path: Path): TileCoordinates {
    for (let i = path.length - 1; i >= 0; i--) {
      let step = path[i]

      switch (step.type) {
        case "cheat":
          return step.target
        case "ability":
          return step.to
        case "run":
          return index(step.waypoints, -1)
        case "teleport":
          if (step.spot) return step.spot
          else return resolveTeleport(step.id).centerOfTarget()
        case "transport":
          let start_tile = step.assumed_start
          let action = step.internal.actions[0]

          const movement = Transportation.EntityAction.findApplicable(action, start_tile) ?? action.movement[0]

          if (movement.offset) {
            let t = TileCoordinates.move(start_tile, movement.offset)

            t.level += movement.offset.level

            return t
          } else if (movement.fixed_target) {


            return TileArea.activate(TileArea.normalize(movement.fixed_target.target)).center()
          }
          break
        case "redclick":
        case "orientation":
        case "powerburst":
        case "cosmetic":
          break;
      }
    }

    return null
  }

  export function endsUpArea(path: Path): TileArea {
    for (let i = path.length - 1; i >= 0; i--) {
      let step = path[i]

      switch (step.type) {
        case "cheat":
          return TileArea.init(step.target)
        case "ability":
          return TileArea.init(step.to)
        case "run":
          return TileArea.init(index(step.waypoints, -1))
        case "teleport":
          return resolveTeleport(step.id).targetArea()
        case "transport":
          let start_tile = step.assumed_start
          let action = step.internal.actions[0]

          const movement = Transportation.EntityAction.findApplicable(action, start_tile) ?? action.movement[0]

          if (movement.offset) {
            let t = TileCoordinates.move(start_tile, movement.offset)

            t.level += movement.offset.level

            return TileArea.init(t)
          } else if (movement.fixed_target) {
            return TileArea.normalize(movement.fixed_target.target)
          }
          break
        case "redclick":
        case "orientation":
        case "powerburst":
          break;
      }
    }

    return null
  }

  export async function augment(path: Path.Step[],
                                start_state: movement_state = movement_state.start({}),
                                target: TileArea.ActiveTileArea[] = []): Promise<Path.augmented> {

    /** TODO:
     *   Regarding teleports:
     *      ""Total immobile ticks"" applies if you want to move after landing"
     *      """Total ticks"" applies if you want to, for example, open an interface, surge, or teleport after landing"
     *   Teleport + running can happen in the same tick. Needs to be considered for timing!
     *   Last step in a sequence should end the tick
     */

    let augmented_steps: augmented_step[] = []

    if (!start_state) start_state = movement_state.start({})

    let state: movement_state = lodash.cloneDeep(start_state)

    // null positions are a pain, replace with position with unknown tile and direction
    state.position ||= {tile: null, direction: null}

    for (let i = 0; i < path.length; i++) {
      let step = path[i]

      let augmented: augmented_step = {
        pre_state: lodash.cloneDeep(state),
        post_state: null,
        issues: [],
        section: 0,
        raw: step
      }

      switch (step.type) {
        case "cheat":
          state.position.tile = step.target
          if (step.orientation) state.position.direction = step.orientation
          state.tick += step.ticks
          break
        case "orientation":
          if (i > 0) augmented.issues.push({level: "error", message: "Orientation steps should only be used as the first step!"})

          // Assume one tick
          state.tick += 1
          state.targeted_entity = null

          state.position.direction = step.direction
          break
        case "run": {
          if (state.position.tile && !TileCoordinates.eq(state.position.tile, step.waypoints[0]))
            augmented.issues.push({level: "error", message: "Running does not start where the previous step ends!"})

          state.position = {
            tile: index(step.waypoints, -1),
            direction: direction.fromVector(
              state.targeted_entity
                ? Vector2.sub(state.targeted_entity, index(step.waypoints, -1))
                : Vector2.sub(index(step.waypoints, -1), index(step.waypoints, -2)))
          }

          state.tick += Math.ceil(PathFinder.pathLength(step.waypoints) / 2)

          state.targeted_entity = null
        }
          break;
        case "ability":
          // Check whether start and target matches expectations
          if (state.position) {
            if (state.position.tile && !TileCoordinates.eq(state.position.tile, step.from)) {
              augmented.issues.push({level: "error", message: "Ability does not start where the previous step ends!"})
            } else {

              // if there is no previous position, at least assume the defined start position
              const assumed_pos = lodash.cloneDeep(state.position)

              assumed_pos.tile ||= step.from

              if (assumed_pos.direction == null) {
                assumed_pos.direction = direction.fromVector(Vector2.sub(step.to, step.from))
                if (step.ability == "escape") assumed_pos.direction = direction.invert(assumed_pos.direction)
              }

              const res = await (() => {
                switch (step.ability) {
                  case "surge":
                    return MovementAbilities.surge(assumed_pos)
                  case "escape":
                    return MovementAbilities.escape(assumed_pos, MovementAssumptions.escapeRange(state.assumptions))
                  case "dive":
                    return MovementAbilities.dive(assumed_pos.tile, step.to)
                  case "barge":
                    return MovementAbilities.barge(assumed_pos.tile, step.to)
                }
              })()

              if (!res || !TileCoordinates.eq(step.to, res.tile))
                if (step.ability == "escape" || step.ability == "surge")
                  augmented.issues.push({level: "error", message: `${lodash.capitalize(step.ability)} target does not match where it would end up!`})
                else
                  augmented.issues.push({level: "error", message: `${lodash.capitalize(step.ability)} target can't be reached!`})
            }
          }

          // Movement combinations in 1 tick:
          // (surge|escape|dive|(surge + dive)|(dive + surge)|(escape + dive)|(dive + escape)) + 2 tiles movement
          // So essentially: Any movement + optionally dive + 2 tiles movement.
          // moving first and THEN an ability in the same tick does not work.
          // This essentially means that surge/escape/dive do not end the tick, but running does

          const next_available_charge = movement_state.nextAvailableCharge(state, step.ability)

          if (next_available_charge.remaining_cooldown > 0) {
            // Log issue
            if (next_available_charge.charge.cooldown_reason == "antispam") {
              augmented.issues.push({level: "warning", message: `Antispam delay. Delaying for ${next_available_charge.remaining_cooldown} ticks.`})
            } else {
              const severity: issue_level = next_available_charge.remaining_cooldown >= 4 ? "error" : "warning"

              if (state.cooldowns[step.ability].length > 1) {
                augmented.issues.push({level: severity, message: `All ${step.ability} charges are still on cooldown for ${next_available_charge.remaining_cooldown} ticks!`})
              } else {
                augmented.issues.push({level: severity, message: `${lodash.capitalize(step.ability)} still on cooldown for ${next_available_charge.remaining_cooldown} ticks!`})
              }
            }

            // Wait for cooldown
            state.tick = next_available_charge.charge.on_cooldown_till_tick
          }

          const powerburst_active = (state.tick - state.acceleration_activation_tick) <= 10

          // Put the used charge on cooldown
          AbilityCharge.setCooldownIfLarger(
            next_available_charge.charge,
            state.tick + cooldown(step.ability, powerburst_active, state.assumptions.mobile_perk),
            "cooldown"
          )

          switch (step.ability) {
            case "surge":
            case "escape": {
              // Surge antispam delay is reduced to 1 tick under powerburst
              const antispam_delay = (step.ability == "surge" && powerburst_active) ? 1 : 2

              // Set antispam delay for all remaining charges of surge/escape
              for (const charge of state.cooldowns.surge) {
                AbilityCharge.setCooldownIfLarger(charge, state.tick + antispam_delay, "antispam")
              }

              // Surge puts both escape charges on antispam delay
              for (const charge of state.cooldowns.escape) {
                AbilityCharge.setCooldownIfLarger(charge, state.tick + antispam_delay, "antispam")
              }

              break
            }
            case "dive":
            case "barge":
              // Nothing special to do here
              break
          }

          state.position = {
            tile: step.to,
            direction: direction.fromVector(Vector2.sub(step.to, step.from))
          }

          // Invert direction for escape ability
          if (step.ability == "escape") state.position.direction = direction.invert(state.position.direction)

          switch (step.ability) {
            case "surge":
            case "dive":
            case "escape":
              break; // Movement abilities do not end the tick and allow for another action (such as doing the other ability or running) in the same tick
            case "barge":
              state.tick += 1
              break;
          }

          // A movement ability overrides target (TODO: Or does it?)
          state.targeted_entity = null

          break;
        case "teleport":
          let teleport = resolveTeleport(step.id)

          if (!TileArea.activate(teleport.targetArea()).query(step.spot)) {
            augmented.issues.push({
              level: "error",
              message: "Teleport destination tile is outside of the teleport area."
            })
          }

          if (step.spot) state.position.tile = step.spot
          else state.position.tile = teleport.centerOfTarget()

          if (teleport.access?.type == "entity") {
            switch (teleport.access.orientation ?? "toentitybefore") {
              case "bymovement":
                if (augmented.pre_state.position.tile) state.position.direction = direction.fromVector(Vector2.sub(state.position.tile, augmented.pre_state.position.tile))
                break;
              case "toentitybefore":
                if (augmented.pre_state.position.tile) state.position.direction = direction.fromVector(Vector2.sub(teleport.access.clickable_area.origin, augmented.pre_state.position.tile))
                break;
              case "toentityafter":
                state.position.direction = direction.fromVector(Vector2.sub(teleport.access.clickable_area.origin, state.position.tile))
                break;
              case "keep":
                break;
            }
          }

          if (teleport.spot.facing != null) {
            state.position.direction = teleport.spot.facing
          }

          state.tick += teleport.props.menu_ticks
          state.tick += teleport.props.animation_ticks
          state.targeted_entity = null

          break;
        case "transport":
          let entity = step.internal
          let action = entity.actions[0]

          let in_interactive_area = !state.position.tile || TileArea.activate(action.interactive_area || defaultInteractiveArea(entity)).query(state.position.tile)

          if (!in_interactive_area) {
            augmented.issues.push({level: "error", message: "Player is not in the interactive area for this shortcut!"})
          }

          if (state.position.tile && !TileCoordinates.eq2(state.position.tile, step.assumed_start)) {
            augmented.issues.push({level: "error", message: "Ability does not start where the previous step ends!"})
          }

          let start_tile = step.assumed_start

          let movement = Transportation.EntityAction.findApplicable(action, start_tile)

          if (!movement) {
            augmented.issues.push(({level: "error", message: "No applicable movement option from this tile"}))
            movement = action.movement[0]
          }

          if (movement.offset) {
            state.position.tile = TileCoordinates.move(start_tile, movement.offset)
            state.position.tile.level += movement.offset.level
          } else if (movement.fixed_target) {
            state.position.tile = TileArea.activate(TileArea.normalize(movement.fixed_target.target)).center()
            // TODO: Add uncertainty
          }

          switch (movement.orientation ?? "toentityafter") {
            case "bymovement":
              state.position.direction = direction.fromVector(Vector2.sub(state.position.tile, start_tile))
              break;
            case "forced":
              state.position.direction = movement.forced_orientation.dir
              break;
            case "toentitybefore":
              state.position.direction = direction.fromVector(Vector2.sub(TileRectangle.center(entity.clickable_area), start_tile))
              break;
            case "toentityafter":
              state.position.direction = direction.fromVector(Vector2.sub(TileRectangle.center(entity.clickable_area), state.position.tile))
              break;
            case "keep":
              break;
          }

          state.tick += movement.time

          break
        case "redclick":
          let next = path[i + 1] as step_run

          if (next?.type != "run")
            augmented.issues.push({level: "error", message: "Redclicking is not followed by a run"})
          else if (next) {
            let natural = direction.fromVector(Vector2.sub(index(next.waypoints, -1), index(next.waypoints, -2)))
            let redclicked = direction.fromVector(Vector2.sub(step.where, index(next.waypoints, -1)))

            if (natural == redclicked)
              augmented.issues.push({level: "warning", message: "Redclicking orientation is the same as natural orientation."})
          }

          state.targeted_entity = step.where

          // redclicks are considered to be loss less, i.e. don't take any ticks.

          break;
        case "powerburst":
          if (state.position.tile && !TileCoordinates.eq(state.position.tile, step.where)) {
            augmented.issues.push({level: "error", message: "Position of powerburst does not match where the player is at that point."})
            state.position.tile = step.where
          }

          if (state.tick - state.acceleration_activation_tick < 120) {
            augmented.issues.push({
              level: "warning",
              message: `Powerburst of acceleration still on cooldown for ${state.acceleration_activation_tick + 120 - state.tick} ticks!`
            })
            state.tick = state.acceleration_activation_tick + 120
          }

          // Reset cooldowns of dive and surge
          for (const charge of state.cooldowns.surge) AbilityCharge.forceCooldown(charge, state.tick, "cooldown")
          for (const charge of state.cooldowns.dive) AbilityCharge.forceCooldown(charge, state.tick, "cooldown")

          state.acceleration_activation_tick = state.tick

          break;
        case "cosmetic":
          // Cosmetic steps do nothing to the movement state
          break
      }

      augmented.post_state = lodash.cloneDeep(state)

      augmented_steps.push(augmented)
    }

    let post_state = index(augmented_steps, -1)?.post_state || start_state
    let path_issues: issue[] = []

    if ((target && (!state.position.tile || !target.some(t => t.query(state.position.tile))))) {
      path_issues.push({level: "error", message: "Path does not end in target area"})
    }

    return {
      pre_state: start_state,
      post_state: post_state,
      raw: path,
      steps: augmented_steps,
      issues: path_issues,
      target: target
    }
  }

  export function title(step: Step): string {
    switch (step.type) {
      case "orientation":
        return `Face ${direction.toString(step.direction)}`
      case "ability":
        return `${capitalize(step.ability)}`
      case "run":
        return `Run ${PathFinder.pathLength(step.waypoints)} tiles`
      case "teleport":
        return `Teleport`
      case "transport":
        return `Use entity`
      case "redclick":
        return "Redclick"
      case "powerburst":
        return "Use Powerburst"
      case "cheat":
        return "Custom Movement"
      case "cosmetic":
        return "Note"
    }

    return "MISSING"
  }

  export function collect_issues(path: augmented): (issue & { step?: augmented_step, path?: augmented })[] {
    const accumulator: (issue & { step?: augmented_step, path?: augmented })[] = []

    for (let step of path.steps) {
      for (let issue of step.issues) {
        accumulator.push({...issue, step: step})
      }
    }

    accumulator.push(...path.issues.map(i => {
      return {...i, path: path}
    }))

    return accumulator
  }

  export function export_path(p: Path.raw): string {
    return ExportImport.exp({type: "path", version: 1}, true, true)(p)
  }

  export function import_path(str: string): Path.raw {
    return ExportImport.imp<Path.raw>({
      expected_type: "path", expected_version: 1,
      migrations: [{
        from: 0,
        to: 1,
        f: (e: unknown) => (e as { steps: Path.Step[] }).steps
      }]
    })(str)
  }

  export function bounds(path: Path.raw, prune_far_transports: boolean = true): TileRectangle {
    return TileRectangle.lift(Rectangle.combine(...path.map((s, i) => {
      const prune: { keep: "start" | "end", threshold?: number } | null = prune_far_transports ? {keep: (i == 0 ? "start" : "end")} : null

      return Step.bounds(s, prune)
    })), level(path))
  }

  export function level(path: Path): floor_t {
    return path.length == 0 ? 0 : Step.level(path[path.length - 1])
  }

  export namespace Step {
    export function bounds(step: Step, prune_far_transports: { keep: "start" | "end", threshold?: number } | null | false = null): Rectangle {
      switch (step.type) {
        case "ability":
          return Rectangle.from(step.from, step.to)
        case "run":
          return Rectangle.from(...step.waypoints)
        case "teleport":
          if (step.spot) return Rectangle.from(step.spot)
          else return Rectangle.from(resolveTeleport(step.id).centerOfTarget())
        case "redclick":
        case "powerburst":
          return Rectangle.from(step.where)
        case "cheat":
          if (step.is_arrival_only) return TileRectangle.from(step.target)

          if (!step.assumed_start) return Rectangle.from(step.target)

          if (prune_far_transports && isFar(step, null, prune_far_transports.threshold ?? FAR_TRANSPORT_THRESHOLD)) {
            if (prune_far_transports.keep == "start") return Rectangle.from(step.target)
            else return Rectangle.from(step.assumed_start)
          } else {
            return Rectangle.from(step.assumed_start, step.target)
          }

        case "transport":
          const ends_up = Path.ends_up([step])

          if (step.is_arrival_only) return TileRectangle.from(ends_up)

          let bounds: Rectangle = step.internal.clickable_area

          if (prune_far_transports && (!step.assumed_start || Vector2.max_axis(Vector2.sub(ends_up, step.assumed_start)) >= 64)) {
            if (prune_far_transports.keep == "start") {
              bounds = Rectangle.extendTo(bounds, ends_up)
            } else {
              if (step.assumed_start) bounds = Rectangle.extendTo(bounds, step.assumed_start)
            }
          } else {
            bounds = Rectangle.extendTo(bounds, ends_up)
            if (step.assumed_start) bounds = Rectangle.extendTo(bounds, step.assumed_start)
          }

          return bounds
        case "orientation":
          return Rectangle.from({x: 0, y: 0})
        case "cosmetic":
          return Rectangle.from(step.position)
        default:
          return null
      }
    }

    export function level(step: Step): floor_t {
      switch (step.type) {
        case "orientation":
          return 0
        case "ability":
          return step.to.level
        case "run":
          return step.waypoints[0].level
        case "teleport":
          return resolveTeleport(step.id).centerOfTarget().level
        case "redclick":
          return step.where.level
        case "powerburst":
          return step.where.level
        case "transport":
          return step.internal.clickable_area.level
        case "cheat":
          return step.target.level
        case "cosmetic":
          return step.position.level
      }
    }

    export function name(step: Step): string {
      switch (step.type) {
        case "ability":
          return lodash.capitalize(step.ability)
        default:
          return lodash.capitalize(step.type.toUpperCase())
      }
    }
  }

  export type SectionedPath = TreeArray<Step, { name: string, is_preferred_section?: boolean }>

  export namespace Section {
    export function split_into_sections(path: Path.raw, root_name: string = "root", far_threshold: number = FAR_TRANSPORT_THRESHOLD): TreeArray.InnerNode<Step, {
      name: string,
      is_preferred_section?: boolean
    }> {
      const section_dividers: number[] = []

      const division = (i: number) => {
        if (i > 0 && (section_dividers.length == 0 || index(section_dividers, -1) != i)) section_dividers.push(i)
      }

      let pos: TileCoordinates = null

      for (let i = 0; i < path.length; i++) {
        const step = path[i]
        const new_pos = ends_up([step])

        if (step.type == "teleport") {
          if (i >= 1 && path[i - 1].type == "orientation") division(i - 1)
          else division(i)
        } else if ((step.type == "transport" || step.type == "cheat") && pos) {
          if ((pos && new_pos?.level != pos.level) || isFar(step)) {
            division(i + 1)
          }
        }

        if (new_pos) pos = new_pos
      }

      division(path.length)

      const root = TreeArray.init({name: root_name})

      let bleeding_arrival: Path.Step = null

      section_dividers.forEach((end, i) => {
        const sect = TreeArray.add(root,
          TreeArray.inner({name: `Section ${i + 1}`})
        )

        const begin = i == 0 ? 0 : section_dividers[i - 1]

        const slice = path.slice(begin, end)
        if (bleeding_arrival) slice.splice(0, 0, bleeding_arrival)
        sect.children = TreeArray.leafs(slice)

        bleeding_arrival = null

        const last = slice[slice.length - 1]

        if (isFar(last, {path: path, position: end - 1}, far_threshold)) {
          bleeding_arrival = {...last, is_arrival_only: true}
        }
      })

      if (bleeding_arrival) {
        TreeArray.add(root,
          TreeArray.inner({name: `Section ${section_dividers.length + 1}`}, TreeArray.leafs([bleeding_arrival]))
        )
      }

      return root
    }
  }

  const FAR_TRANSPORT_THRESHOLD = 16

  export function isFar(step: Path.Step, context: { position: number, path: Path } = null, threshold: number = FAR_TRANSPORT_THRESHOLD): boolean {
    switch (step.type) {
      case "transport":
      case "cheat":
        const new_pos = ends_up([step])

        return Vector2.max_axis(Vector2.sub(step.assumed_start, new_pos)) > threshold
      case "teleport":
        if (context) return context.position > 0 && context.path[context.position - 1].type == "orientation"
        return false
      default:
        return false
    }

  }

}