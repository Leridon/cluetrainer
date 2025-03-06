import {GameLayer} from "../../../lib/gamemap/GameLayer";
import {Transportation} from "../../../lib/runescape/transportation";
import {TransportData} from "../../../data/transports";
import {MapEntity} from "../../../lib/gamemap/MapEntity";
import {EntityTransportEntity} from "./entities/EntityTransportEntity";
import {TeleportSpotEntity} from "./entities/TeleportSpotEntity";
import {deps} from "../../dependencies";
import {TeleportAccessEntity} from "./entities/TeleportAccessEntity";
import {RemoteEntityTransportTarget} from "./entities/RemoteEntityTransportTarget";
import TeleportGroup = Transportation.TeleportGroup;
import EntityTransportation = Transportation.EntityTransportation;

export default class TransportLayer extends GameLayer {
  private teleports: TeleportSpotEntity[] = []

  constructor(interactive: boolean, config: TransportLayer.Options = {
    teleport_policy: "all",
    transport_policy: "all"
  }) {
    super();

    if (config.teleport_policy != "none") {
      deps().app.settings.active_teleport_customization.subscribe(customization => {
        this.eachEntity(e => {
          if (e instanceof TeleportSpotEntity) {
            e.teleport.refresh()

            e.render(true)
          }
        })
      }, false, e => this.lifetime_manager.bind(e))
    }

    TransportData.getAll().then(transports => transports.forEach(trans => {
      switch (trans.type) {
        case "entity":
        case "door":
          if (config.transport_policy != "all") break;

          new EntityTransportEntity(trans)
            .setInteractive(interactive).addTo(this)

          if (trans.type == "entity") {
            trans.actions.forEach(action => {
              action.movement.forEach(movement => {
                if (!EntityTransportation.Movement.isLocal(movement)) {
                  new RemoteEntityTransportTarget(trans, action, movement)
                    .setInteractive(interactive).addTo(this)
                }
              })
            })
          }

          break

        case "teleports":
          if (config.teleport_policy == "none") break;

          trans.spots.forEach(spot => {
            this.teleports.push(
              new TeleportSpotEntity(new TeleportGroup.Spot(trans, spot, undefined))
                .setInteractive(interactive)
                .addTo(this)
            )
          })

          if (config.teleport_policy != "target_only") {
            trans.access.forEach(access => {
              if (access.type == "entity") {
                new TeleportAccessEntity(trans, access)
                  .setInteractive(interactive)
                  .addTo(this)
              }
            })
          }

          break;
      }
    }))

    this.quad_tree_debug_rendering = false
  }

  getTeleportSpots(): TeleportGroup.Spot[] {
    return this.teleports.map(e => e.teleport)
  }
}

export namespace TransportLayer {

  import TeleportAccess = Transportation.TeleportAccess;
  import TeleportGroup = Transportation.TeleportGroup;
  import EntityTransportation = Transportation.EntityTransportation;

  export type Options = {
    teleport_policy: "all" | "target_only" | "none"
    transport_policy: "all" | "none",
  }

  export type Config = {
    contructors?: {
      teleport_access: (_: TeleportAccess) => MapEntity,
      teleport_spot: (_: TeleportGroup.Spot) => TeleportSpotEntity,
      entity_transport: (_: EntityTransportation) => EntityTransportEntity,
      entity_transport_destination: (_: EntityTransportation) => MapEntity
    },

    transport_policy: "all" | "none",
    teleport_policy: "all" | "none"
  }
}