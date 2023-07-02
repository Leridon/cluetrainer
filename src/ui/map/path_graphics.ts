import * as leaflet from "leaflet"
import {step} from "../../model/pathing";
import {boxPolygon, MapCoordinate, toLL, Vector2} from "../../model/coordinates";
import {MovementAbilities} from "../../model/movement";


function createX(coordinate: MapCoordinate, color: "red" | "yellow"): leaflet.Layer {
    const click_icons = {
        "red": "assets/icons/redclick.png",
        "yellow": "assets/icons/yellowclick.png",
    }

    return leaflet.marker(toLL(coordinate), {
        icon: leaflet.icon({
            iconUrl: click_icons[color],
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        }),
        interactive: false
    })
}

const pi = 3.1415

export function arrow(from: Vector2, to: Vector2): leaflet.Polyline {
    let arm1_offset = Vector2.scale(0.7, Vector2.rotate(Vector2.normalize(Vector2.sub(from, to)), pi / 4))
    let arm2_offset = Vector2.scale(0.7, Vector2.rotate(Vector2.normalize(Vector2.sub(from, to)), -pi / 4))

    let tip = toLL(to)

    return leaflet.polyline([
            [toLL(from), toLL(to)],
            [tip, toLL(Vector2.add(to, arm1_offset))],
            [tip, toLL(Vector2.add(to, arm2_offset))],
        ]
    )
}

export function createStepGraphics(step: step): leaflet.Layer {
    switch (step.type) {
        case "teleport":

            // TODO: Implement
            break;
        case "ability": {
            let group = leaflet.featureGroup()

            group.setStyle({interactive: false})

            const meta: Record<MovementAbilities.movement_ability, { color: string, icon: string }> = {
                barge: {color: "#a97104", icon: "assets/icons/barge.png"},
                dive: {color: "#e7d82c", icon: "assets/icons/dive.png"},
                escape: {color: "#56ba0f", icon: "assets/icons/escape.png"},
                surge: {color: "#0091f2", icon: "assets/icons/surge.png"}
            }

            arrow(step.from, step.to)
                .setStyle({
                    color: meta[step.ability].color,
                    weight: 4
                }).addTo(group)

            leaflet.marker(toLL(Vector2.scale(1 / 2, Vector2.add(step.from, step.to))), {
                icon: leaflet.icon({
                    iconUrl: meta[step.ability].icon,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                })
            }).addTo(group)

            return group
        }
        case "run": {
            let lines: [Vector2, Vector2][] = []

            for (let i = 0; i < step.waypoints.length - 1; i++) {
                const from = step.waypoints[i]
                const to = step.waypoints[i + 1]

                lines.push([from, to])
            }

            /*
            for (let i = 0; i < step.waypoints.length - 1; i++) {
                const from = step.waypoints[i]
                const to = step.waypoints[i + 1]

                const delta = Vector2.sub(to, from)

                const diagonal_part = Math.min(Math.abs(delta.x), Math.abs(delta.y))

                let straight_vector: Vector2 = {
                    x: delta.x - Math.sign(delta.x) * diagonal_part,
                    y: delta.y - Math.sign(delta.x) * diagonal_part
                }

                let checkpoint = Vector2.add(from, straight_vector)

                lines.push([from, checkpoint])
                lines.push([checkpoint, to])
            }*/

            lines = lines.filter((l) => !Vector2.eq(l[0], l[1]))

            let group = leaflet.featureGroup()

            group.setStyle({
                interactive: false
            })

            leaflet.polyline(
                lines.map((t) => t.map(toLL)),
                {
                    color: "#b4b4b4",
                    weight: 3
                }
            ).addTo(group)

            createX(step.waypoints[step.waypoints.length - 1], "yellow").addTo(group)

            return group
        }
        case "interaction":
            return boxPolygon(step.area).setStyle({
                weight: 2,
                color: "#888888",
                fillColor: "#888888",
                fillOpacity: 0.3,
                interactive: false
            })
        case "redclick": {
            return createX(step.where, "red")
        }
        case "powerburst": {
            return leaflet.marker(toLL(step.where), {
                icon: leaflet.icon({
                    iconUrl: "assets/icons/accel.png",
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                }),
                interactive: false
            })
        }
    }

    return null
}