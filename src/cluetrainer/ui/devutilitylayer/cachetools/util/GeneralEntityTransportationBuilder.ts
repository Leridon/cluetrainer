import {Transportation} from "../../../../../lib/runescape/transportation";
import {MovementBuilder} from "./MovementBuilder";
import {LocUtil} from "./LocUtil";
import {Transform, Vector2} from "../../../../../lib/math";
import {TileTransform} from "../../../../../lib/runescape/coordinates/TileTransform";
import {TileCoordinates, TileRectangle} from "../../../../../lib/runescape/coordinates";
import {CursorType} from "../../../../../lib/runescape/CursorType";
import {TileArea} from "../../../../../lib/runescape/coordinates/TileArea";
import {ProcessedCacheTypes} from "../ProcessedCacheTypes";
import EntityAction = Transportation.EntityAction;
import EntityTransportation = Transportation.EntityTransportation;
import GeneralEntityTransportation = Transportation.GeneralEntityTransportation;
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;

export class EntityActionBuilder {

  constructor(public value: EntityAction) {

  }

  movement(...movement: MovementBuilder[]): this {
    this.value.movement.push(...movement.map(m => m.done()))

    return this
  }
}

export class EntityTransportationBuilder {
  constructor(public underlying: PrototypeInstance,
              public value: EntityTransportation) {}

  finish(): EntityTransportation {
    let transport = this.value

    transport.source_loc = this.underlying.prototype.id

    let use = this.underlying

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
      TileTransform.translation(Vector2.sub(use.box.origin, current_origin), use.box.origin.level),
    )

    if (transport.type == "entity") {
      transport.clickable_area = TileRectangle.extend(transport.clickable_area, 0.5)
    }

    return this.value = transport
  }
}

export class GeneralEntityTransportationBuilder extends EntityTransportationBuilder {
  constructor(
    public underlying: PrototypeInstance,
    public value: GeneralEntityTransportation) {

    super(underlying, value)
  }

  action(override: {
    index?: number,
    cursor?: CursorType,
    name?: string,
    interactive_area?: TileArea,
  } = {}, ...movements: MovementBuilder[]) {

    const action = this.underlying.prototype.actions[override.index ?? 0]

    const a = new EntityActionBuilder({
      name: override.name ?? action?.[0] ?? "Unnamed Action",
      cursor: override.cursor ?? action?.[1] ?? "generic",
      interactive_area: override.interactive_area ?? undefined,
      movement: [],
    })

    if (a.value.name == "Unnamed Action") debugger

    a.movement(...movements)

    this.value.actions.push(a.value)

    return this
  }
}

export namespace EntityTransportationBuilder {

  import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;

  export function from(instance: PrototypeInstance): GeneralEntityTransportationBuilder {
    const transport: Transportation.EntityTransportation = {
      type: "entity",
      entity: {name: instance.prototype.name!!, kind: "static"},
      clickable_area: TileRectangle.from(
        {x: 0, y: 0, level: 0},
        TileCoordinates.lift(Vector2.add(instance.prototype.size, {x: -1, y: -1}), 0),
      ),
      actions: [],
    }

    return new GeneralEntityTransportationBuilder(instance, transport)
  }
}