import {Vector2} from "./Vector2";
import {Angles} from "./Angles";
import angleDifference = Angles.angleDifference;

export {Rectangle} from "./Rectangle"
export {Vector2} from "./Vector2"
export {Transform} from "./Transform"

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