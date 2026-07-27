import {TransportParser} from "./TransportParser";
import {Transportation} from "../../../../lib/runescape/transportation";
import {TileRectangle} from "../../../../lib/runescape/coordinates";
import {direction} from "../../../../lib/runescape/movement";
import {TileTransform} from "../../../../lib/runescape/coordinates/TileTransform";
import {Transform, Vector2} from "../../../../lib/math";
import {ParsingParameter} from "./ParsingParameters";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {EntityTransportationBuilder} from "./util/GeneralEntityTransportationBuilder";
import {MovementBuilder} from "./util/MovementBuilder";
import {C} from "../../../../lib/ui/constructors";
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";
import {CursorType} from "../../../../lib/runescape/CursorType";
import PP = ParsingParameter;
import rec = ParsingParameter.rec;
import offset = MovementBuilder.offset;
import fixed = MovementBuilder.fixed;
import EntityActionMovement = Transportation.EntityActionMovement;
import span = C.span;
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;
import tileArea2 = ParsingParameter.tileArea2;

const orientation_new: ParsingParameter<Pick<EntityActionMovement, "orientation" | "forced_orientation">> = PP.choose<Pick<EntityActionMovement, "orientation" | "forced_orientation">>(
  {
    toHTML: (v) => {
      switch (v.orientation) {
        case undefined:
          return span("Default (Weird)")
        case "bymovement":
          return span("By Movement")
        case "toentitybefore":
          return span("To Entity Before Movement")
        case "toentityafter":
          return span("To Entity After Movement")
        case "keep":
          return span("Keep Previous Rotation")
        case "forced":

          if (v.forced_orientation.relative) {
            return span(`Forced ${direction.toString(v.forced_orientation.dir)} [rel]`)
          } else {
            return span(`Forced ${direction.toString(v.forced_orientation.dir)}`)
          }
      }
    }
  }, [
    {},
    {orientation: "bymovement"},
    {orientation: "toentitybefore"},
    {orientation: "toentityafter"},
    {orientation: "keep"},
    ...direction.all.flatMap(d => [true, false].map(rel => ({
      orientation: "forced" as const,
      forced_orientation: {
        relative: rel,
        dir: d
      }
    })))
  ]).default({})

/*simple: PP.choose<EntityActionMovement["orientation"]>({
  toHTML: (v) => c().text(v)
}, ["bymovement", "toentitybefore", "toentityafter", "keep", "forced"]),
forced: PP.rec({
  dir: PP.element("Direction", PP.dir()),
  relative: PP.element("Relative", PP.bool())
})*/

const actions_parameter = PP.list(PP.rec({
  action: PP.element("Action", PP.action()),
  area: PP.element("Area", PP.tileArea(true), true),
  movements: PP.element("Movements", PP.list(PP.rec({
    valid_from: PP.element("Valid", PP.tileArea(true), true),
    orientation: PP.element("Orientation", PP.either({
      simple: PP.choose<EntityActionMovement["orientation"]>({
        toHTML: (v) => c().text(v)
      }, ["bymovement", "toentitybefore", "toentityafter", "keep", "forced"]),
      forced: PP.rec({
        dir: PP.element("Direction", PP.dir()),
        relative: PP.element("Relative", PP.bool())
      })
    }), true),
    movement: PP.element("Movement", PP.either({
      offset: PP.offset(),
      fixed: PP.rec({
        area: PP.element("Area", PP.tileArea(true)),
        origin_only: PP.element("Origin only", PP.bool()),
      }),
    })),
    time: PP.element("Time", PP.time())
  }), 1))
}), 1)

const actions_parameter_new: ParsingParameter<{
  area?: { type: "relativetoloc" | "absolute"; area: TileArea },
  action?: {
    loc?: { id: number };
    custom?: {
      cursor: CursorType
      name: string
    }
  },
  movements?: {
    orientation?: Pick<Transportation.EntityActionMovement, "orientation" | "forced_orientation">,
    valid_from?: { type: "relativetoloc" | "absolute"; area: TileArea },
    time?: number,
    movement?: ParsingParameter.Movement,
  }[]
}[]> = PP.list(PP.rec({
  action: PP.element("Action", PP.action()),
  area: PP.element("Area", PP.tileArea2(true, false), false),
  movements: PP.element("Movements", PP.list(PP.rec({
    valid_from: PP.element("Valid", PP.tileArea2(true, false), false),
    orientation: PP.element("Orientation", orientation_new, false),
    movement: PP.element("Movement", PP.movement()),
    time: PP.element("Time", PP.time())
  }), 1))
}), 1)

type ParType<T> = T extends ParsingParameter<infer U> ? U : never

function parse<GroupT, InstanceT>(id: string,
                                  name: string,
                                  groupPar: ParsingParameter<GroupT>,
                                  instancePar: ParsingParameter<InstanceT>,
                                  instance_group_required: boolean,
                                  apply: (instance: PrototypeInstance, args: { per_loc: GroupT; per_instance?: InstanceT }) => Promise<Transportation.Transportation[]>) {

  return (new class extends TransportParser {
    constructor() {
      super(id, name);

      this.per_loc_group_parameter = groupPar
      this.per_instance_parameter = instancePar
      this.instance_group_required = instancePar && instance_group_required
    }

    apply(instance: PrototypeInstance, args: { per_loc: GroupT; per_instance?: InstanceT }): Promise<Transportation.Transportation[]> {
      return apply(instance, args)
    }
  })
}

function transformWithLoc(transport: Transportation.GeneralEntityTransportation, use: PrototypeInstance): Transportation.GeneralEntityTransportation
function transformWithLoc(transport: Transportation.EntityTransportation, use: PrototypeInstance): Transportation.EntityTransportation
function transformWithLoc(transport: Transportation.DoorTransportation, use: PrototypeInstance): Transportation.DoorTransportation
function transformWithLoc(transport: Transportation.EntityTransportation, use: PrototypeInstance): Transportation.EntityTransportation {
  // Apply rotation
  if (use.instance.rotation != 0) {
    transport = Transportation.transform(transport, TileTransform.normalize(
      Transform.rotation((4 - use.instance.rotation) % 4), // Cache rotation is clockwise, while Transform.rotation is counterclockwise
    ))
  }

  const current_origin = transport.type == "entity"
    ? TileRectangle.bl(transport.clickable_area)
    : transport.position

  transport = Transportation.transform(transport,
    TileTransform.translation(Vector2.sub(use.box.origin, current_origin), use.box.origin.level - current_origin.level),
  )

  if (transport.type == "entity") {
    transport.clickable_area = TileRectangle.extend(transport.clickable_area, 0.5)
  }

  return transport
}

export const parsers: TransportParser[] = [
  parse("west-facing-doors", "Standard West Doors", null, null, false, async (instance) => {

      const door: Transportation.DoorTransportation = {
        type: "door",
        position: instance.box.origin,
        direction: direction.west,
        name: instance.prototype.name ?? "Door",
      }

      return [transformWithLoc(door, instance)]
    }
  ),
  parse("ignore", "Ignore", null, null, false, async (instance) => {
      return []
    }
  ),
  parse("ladders", "Ladders", PP.rec({
      across: PP.element("Across", PP.bool()),
      single_side: PP.element("Side", PP.dir(), true),
      up: PP.element("Up", PP.locAction(), true),
      down: PP.element("Down", PP.locAction(), true),
      top: PP.element("Top/Bottom", PP.rec({
        action: PP.element("Action", PP.locAction()),
        level: PP.element("Floor", PP.floor())
      }), true),
    })
    , null, false, async (instance, {per_loc}) => {
      const builder = EntityTransportationBuilder.from(instance)

      const off = per_loc.single_side && per_loc.across
        ? Vector2.scale(-2, direction.toVector(per_loc.single_side))
        : {x: 0, y: 0}

      const interactive = per_loc.single_side
        ? TileArea.init({...direction.toVector(per_loc.single_side), level: 0})
        : undefined

      if (per_loc.up != null) {
        builder.action({
            index: per_loc.up.id,
            interactive_area: interactive
          },
          offset({...off, level: 1})
            .orientation("toentitybefore")
            .time(3)
        )
      }

      if (per_loc.down != null) {
        builder.action({
            index: per_loc.down.id,
            interactive_area: interactive
          },
          offset({...off, level: -1})
            .orientation("toentitybefore")
            .time(3)
        )
      }

      if (per_loc.top != null) {
        builder.action({
            index: per_loc.top.action.id,
            interactive_area: interactive
          },
          offset({...off, level: per_loc.top.level - instance.box.origin.level})
            .orientation("toentitybefore")
            .time(3)
        )
      }

      return [builder.finish()]
    }),
  parse("simpleremotetransport", "Remote",
    PP.rec({
      action: PP.element("Action", PP.locAction()),
      time: PP.element("Time", PP.time().default(2)),
      area: PP.element("Area", PP.tileArea(true), true),
    }), PP.rec({
      target: PP.element("Target", PP.tileArea(false)),
    }), true, async (instance, {per_loc, per_instance}) => {
      const builder = EntityTransportationBuilder.from(instance)

      builder.action({
        index: per_loc.action.id,
        interactive_area: per_loc.area
      }, fixed(per_instance.target).time(per_loc.time ?? 2))

      return [builder.finish()]
    }),
  parse("simpleremotetransportlegacy", "Remote (LEGACY)",
    PP.rec({
      action: PP.element("Action", PP.locAction()),
      time: PP.element("Time", PP.time()),
      area: PP.element("Area", PP.tileArea(true), true),
    }), PP.rec({
      target: PP.element("Target", PP.tileArea()),
    }), true, async (instance, {per_loc, per_instance}) => {
      const builder = EntityTransportationBuilder.from(instance)

      builder.action({
        index: per_loc.action.id,
        interactive_area: per_loc.area
      }, fixed(TileArea.transform(per_instance.target, instance.getTransform())).time(per_loc.time ?? 1))

      return [builder.finish()]
    }).makeLegacy(),
  parse("prototypecopylocnew", "Prototype NEW",
    rec({
      actions: PP.element("Actions", actions_parameter_new)
    }), rec({
      actions: PP.element("Actions", actions_parameter_new)
    }), false, async (instance, {per_loc, per_instance}: {
      per_loc: { actions: ParType<typeof actions_parameter_new> },
      per_instance: { actions: ParType<typeof actions_parameter_new> }
    }) => {
      const builder = EntityTransportationBuilder.from(instance)

      for (const action of [...per_loc.actions, ...(per_instance?.actions ?? [])]) {

        builder.action(
          {
            index:
              action.action.custom
                ? null
                : action.action.loc.id,
            name: action.action.custom
              ? action.action.custom.name
              : null,
            cursor: action.action.custom
              ? action.action.custom.cursor
              : null,
            interactive_area: tileArea2.translate(instance, action.area)
          }, ...action.movements.map(m => {

            let b: MovementBuilder

            if (!m.movement) debugger

            if (m.movement.fixed_target) {

              const area = TileArea.transform(m.movement.fixed_target.target, m.movement.fixed_target.relative ? instance.getTransform() : TileTransform.identity())

              b = fixed(
                m.movement.fixed_target.origin_only ? TileArea.init(area.origin) : area,
                m.movement.fixed_target.relative)

            } else b = offset(m.movement.offset)

            if (m.orientation) {
              if (m.orientation.orientation != "forced") b.orientation(m.orientation.orientation)
              else b.forcedOrientation(m.orientation.forced_orientation.dir, !!m.orientation.forced_orientation.relative)
            }

            b.time(m.time ?? 3)

            if (m.valid_from) {
              b.restrict(tileArea2.translate(instance, m.valid_from))
            }

            return b
          }))
      }

      return [builder.finish()]
    }),
  parse("prototypecopyloc", "Prototype",
    rec({
      actions: PP.element("Actions", actions_parameter)
    }), rec({
      actions: PP.element("Actions", actions_parameter)
    }), false,
    async (instance, {per_loc, per_instance}) => {
      const builder = EntityTransportationBuilder.from(instance)

      for (const action of [...per_loc.actions, ...(per_instance?.actions ?? [])]) {
        builder.action(
          {
            index:
              action.action.custom
                ? null
                : action.action.loc.id,
            name: action.action.custom
              ? action.action.custom.name
              : null,
            cursor: action.action.custom
              ? action.action.custom.cursor
              : null,
            interactive_area: action.area
          }, ...action.movements.map(m => {

            let b: MovementBuilder = null

            if (m.movement.fixed) {

              // Tile Area is in a local, untransformed coordinate system
              let a = m.movement.fixed.area

              if (m.movement.fixed.origin_only) {
                a = TileArea.transform(a, instance.getTransform())
                a = TileArea.init(a.origin)
                a = TileArea.transform(a, instance.getInverseTransform())
              }

              b = fixed(a, true)

            } else if (m.movement.offset) b = offset(m.movement.offset)

            if (m.orientation) {
              if (m.orientation.simple) b.orientation(m.orientation.simple)
              if (m.orientation.forced) b.forcedOrientation(m.orientation.forced.dir, !!m.orientation.forced.relative)
            }

            b.time(m.time ?? 3)

            if (m.valid_from) {
              b.restrict(m.valid_from)
            }

            return b
          }))
      }

      return [builder.finish()]
    }
  ),
  parse("prototypecopylocperinstancelegacy", "(LEGACY) Prototype Per Instance",
    null,
    rec({
      actions: PP.element("Actions", PP.list(PP.rec({
        action: PP.element("Action", PP.locAction()),
        area: PP.element("Area", PP.tileArea(), true),
        movements: PP.element("Movements", PP.list(PP.rec({
          valid_from: PP.element("Valid", PP.tileArea(), true),
          orientation: PP.element("Orientation", PP.either({
            simple: PP.choose<EntityActionMovement["orientation"]>({
              toHTML: (v) => c().text(v)
            }, ["bymovement", "toentitybefore", "toentityafter", "keep"]),
            forced: PP.rec({
              dir: PP.element("Direction", PP.dir()),
              relative: PP.element("Relative", PP.bool())
            })
          }), true),
          movement: PP.element("Movement", PP.either({
            offset: PP.offset(),
            fixed: PP.rec({
              area: PP.element("Area", PP.tileArea()),
              relative: PP.element("Relative", PP.bool()),
              origin_only: PP.element("Origin only", PP.bool()),
            }),
          })),
          time: PP.element("Time", PP.time())
        })))
      })))
    }), true,
    async (instance, {per_instance}) => {
      const builder = EntityTransportationBuilder.from(instance)

      for (const action of per_instance.actions) {
        builder.action({
          index: action.action.id,
          interactive_area: action.area
        }, ...action.movements.map(m => {

          let b: MovementBuilder = null

          if (m.movement.fixed) {

            if (m.movement.fixed.origin_only) {
              let a = m.movement.fixed.area

              if (m.movement.fixed.relative) {
                a = TileArea.transform(a, instance.getTransform())
              }

              a = TileArea.init(a.origin)

              if (m.movement.fixed.relative) {
                a = TileArea.transform(a, instance.getInverseTransform())
              }

              b = fixed(a, m.movement.fixed.relative)
            } else {
              b = fixed(m.movement.fixed.area, m.movement.fixed.relative)
            }

          } else if (m.movement.offset) b = offset(m.movement.offset)

          if (m.orientation) {
            if (m.orientation.simple) b.orientation(m.orientation.simple)
            if (m.orientation.forced) b.forcedOrientation(m.orientation.forced.dir, !!m.orientation.forced.relative)
          }

          b.time(m.time ?? 3)

          if (m.valid_from) {
            b.restrict(m.valid_from)
          }

          return b
        }))
      }

      return [builder.finish()]
    }
  ).makeLegacy(),

]

export function hardcoded_transports(): Transportation.Transportation[] {
  return [
    {
      type: "entity",
      entity: {name: "Fallen palm tree", kind: "static"},
      clickable_area: {"topleft": {"x": 3338.5, "y": 3242.5}, "botright": {"x": 3339.5, "y": 3241.5}, "level": 0},
      actions: [
        {
          cursor: "agility",
          name: "Run across",
          movement: [
            {offset: {x: 6, y: 0, level: 0}, orientation: "bymovement", time: 5}
          ]
        }
      ]
    }, {
      type: "entity",
      entity: {name: "Rope", kind: "static"},
      clickable_area: {"topleft": {"x": 2446.5, "y": 3171.5}, "botright": {"x": 2447.5, "y": 3170.5}, "level": 0},
      actions: [
        {
          name: "Climb",
          cursor: "agility",
          movement: [
            {
              fixed_target: {target: {"origin": {"x": 2443, "y": 3164, "level": 0}}},
              orientation: "toentitybefore",
              time: 3
            }
          ]
        }
      ]
    }, {
      type: "entity",
      entity: {name: "Mysterious entrance", kind: "static"},
      clickable_area: {"topleft": {"x": 3810.5, "y": 3529.5}, "botright": {"x": 3812.5, "y": 3527.5}, "level": 0},
      actions: [
        {
          name: "Enter",
          cursor: "enter",
          movement: [
            {
              fixed_target: {target: {"origin": {"x": 2292, "y": 5971, "level": 0}}},
              orientation: "toentitybefore",
              time: 5
            }
          ]
        }
      ]
    },
    {
      "type": "entity",
      "entity": {
        "name": "Strange bloodied stones",
        "kind": "static"
      },
      "clickable_area": {"topleft": {"x": 3559.5, "y": 9782.5}, "botright": {"x": 3562.5, "y": 9779.5}, "level": 0},
      "actions": [
        {
          "cursor": "generic",
          "name": "Enter",
          "movement": [
            {
              "time": 1,
              "fixed_target": {
                "target": {"origin": {"x": 2467, "y": 4889, "level": 1}}
              }
            }
          ]
        }
      ]
    },
    {
      "type": "entity",
      "entity": {
        "name": "Tunnel",
        "kind": "static"
      },
      "clickable_area": {"topleft": {"x": 2467.5, "y": 4209.5}, "botright": {"x": 2469.5, "y": 4208.5}, "level": 0},
      "actions": [
        {
          "cursor": "generic",
          "name": "Climb-into",
          "movement": [
            {
              "time": 3,
              "fixed_target": {
                "target": {"origin": {"x": 2472, "y": 3027, "level": 0}}
              }
            }
          ]
        }
      ]
    },


    {
      type: "entity",
      entity: {name: "Bridge", kind: "static"},
      clickable_area: {"topleft": {"x": 3751.5, "y": 2927.5}, "botright": {"x": 3753.5, "y": 2925.5}, "level": 0},
      actions: [
        {
          cursor: "agility",
          name: "Walk-across",
          movement: [
            {valid_from: {"origin": {"x": 3754, "y": 2926, "level": 0}, "size": {"x": 1, "y": 2}}, offset: {x: -3, y: 0, level: 0}, orientation: "bymovement", time: 4},
            {valid_from: {"origin": {"x": 3751, "y": 2926, "level": 0}, "size": {"x": 1, "y": 2}}, offset: {x: 3, y: 0, level: 0}, orientation: "bymovement", time: 4}
          ]
        }
      ]
    },


    {
      type: "entity",
      entity: {name: "Bridge", kind: "static"},
      clickable_area: {"topleft": {"x": 3738.5, "y": 2939.5}, "botright": {"x": 3740.5, "y": 2937.5}, "level": 0},
      actions: [
        {
          cursor: "agility",
          name: "Walk-across",
          movement: [
            {valid_from: {"origin": {"x": 3739, "y": 2940, "level": 0}, "size": {"x": 2, "y": 1}}, offset: {x: 0, y: -3, level: 0}, orientation: "bymovement", time: 4},
            {valid_from: {"origin": {"x": 3739, "y": 2937, "level": 0}, "size": {"x": 2, "y": 1}}, offset: {x: 0, y: 3, level: 0}, orientation: "bymovement", time: 4}
          ]
        }
      ]
    },

  ]
}

export namespace Parsers3 {
  export function getById(id: string): TransportParser {
    return parsers.find(p => p.id == id)
  }
}