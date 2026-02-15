import {ScuffedTesting} from "./test_framework";
import {ProcessedCacheTypes} from "../cluetrainer/ui/devutilitylayer/cachetools/ProcessedCacheTypes";
import {Vector2} from "../lib/math";
import {TileTransform} from "../lib/runescape/coordinates/TileTransform";
import {TileCoordinates} from "../lib/runescape/coordinates";
import testset = ScuffedTesting.testset;
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;
import Prototype = ProcessedCacheTypes.Prototype;
import assertEquals = ScuffedTesting.assertEquals;

function assertEqualsTile(a: TileCoordinates, b: TileCoordinates, epsilon: number = 0.000001) {
  assertEquals(a.x, b.x, epsilon)
  assertEquals(a.y, b.y, epsilon)
  assertEquals(a.level, b.level, epsilon)
}

function assertInverse(a: TileTransform, b: TileTransform, test: TileCoordinates) {
  const trans = TileCoordinates.transform(test, a)
  const trans2 = TileCoordinates.transform(trans, b)

  assertEqualsTile(test, trans2)
}

function test_prototype(): void {
  const proto: Prototype.Loc = {
    actions: [], id: undefined, name: "Test", raw: undefined, size: {x: 1, y: 2},
  }


  const tests: {
    size: Vector2,
    instances: {
      position: TileCoordinates,
      rotation: number,
      tests: {
        position: TileCoordinates,
        expected: TileCoordinates
      }[]
    }[]
  }[] = [{
    size: {x: 1, y: 2},
    instances: [{
      position: {x: 5415, y: 2324, level: 0}, rotation: 1, tests: [{
        position: {y: 2, x: 0, level: 0}, expected: {x: 5417, y: 2324, level: 0},
      }]
    }]
  }]

  for (const proto of tests) {
    const prot: Prototype.Loc = {
      actions: [], id: undefined, name: "Test", raw: undefined, size: proto.size,
    }

    for (const instance of proto.instances) {

      const inst = new PrototypeInstance<Prototype.Loc>(prot, {id: undefined, position: instance.position, rotation: instance.rotation})

      const trans = inst.getTransform()
      const trans2 = inst.getInverseTransform()

      for (const test of instance.tests) {
        assertInverse(trans, trans2, test.position)

        assertEqualsTile(TileCoordinates.transform(test.position, trans), test.expected)
      }
    }
  }
}

export const test_prototype_transform = testset("Prototype Transform",
  test_prototype
)