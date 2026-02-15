import {ScuffedTesting} from "./test_framework";
import {rectangleCrossSection} from "../lib/math";
import testset = ScuffedTesting.testset;
import assertEquals = ScuffedTesting.assertEquals;

function test_rectangle_cross_section(): void {
  assertEquals(rectangleCrossSection({x: 64, y: 64}, 0), 64)
  assertEquals(rectangleCrossSection({x: 64, y: 64}, Math.PI / 2), 64)
  assertEquals(rectangleCrossSection({x: 64, y: 64}, 5 * Math.PI / 4), Math.sqrt(2) * 64)
  assertEquals(rectangleCrossSection({x: 0, y: 64}, Math.PI), 64)
  assertEquals(rectangleCrossSection({x: 0, y: 64}, -Math.PI), 64)
  assertEquals(rectangleCrossSection({x: 64, y: 0}, Math.PI), 0)
  assertEquals(rectangleCrossSection({x: 64, y: 0}, -Math.PI), 0)
}

export const test_math = testset("Math",
  test_rectangle_cross_section
)