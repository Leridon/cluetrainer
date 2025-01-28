import lodash from "lodash";
import {util} from "../util/util";
import {Vector2} from "./Vector2";
import positive_mod = util.positive_mod;

export {Rectangle} from "./Rectangle"
export {Vector2} from "./Vector2"
export {Transform} from "./Transform"

export function radiansToDegrees(radians: number): number {
  return radians / (2 * Math.PI) * 360
}

export function degreesToRadians(degrees: number): number {
  return (degrees / 360) * (2 * Math.PI)
}

export function normalizeAngle(radians: number): number {
  while (radians < 0) radians += 2 * Math.PI
  while (radians > 2 * Math.PI) radians -= 2 * Math.PI

  return radians
}

export function circularMean(angles: number[]): number {
  return Math.atan2(lodash.sum(angles.map(Math.sin)), lodash.sum(angles.map(Math.cos)))
}

export function angleDifference(a: number, b: number): number {
  return Math.abs(positive_mod(b - a + Math.PI, 2 * Math.PI) - Math.PI);
}

export function rectangleCrossSection(size: Vector2, angle_of_attack: number): number {
  const length = Vector2.length(size)

  const diagonal_angles = [
    Math.atan2(size.y, size.x),
    Math.atan2(size.y, -size.x),
  ]

  const sizes = diagonal_angles.map(diag_angle => {
    let attack_angle_on_diagonal = angleDifference(diag_angle, angle_of_attack)

    if (attack_angle_on_diagonal > Math.PI) attack_angle_on_diagonal = 2 * Math.PI - attack_angle_on_diagonal
    if (attack_angle_on_diagonal > Math.PI / 2) attack_angle_on_diagonal = Math.PI - attack_angle_on_diagonal

    return Math.sin(attack_angle_on_diagonal) * length
  })

  return Math.max(...sizes)
}