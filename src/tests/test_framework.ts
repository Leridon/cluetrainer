export namespace ScuffedTesting {
  export type Test = (() => void | Promise<void>) | TestSet

  export class TestSet {
    constructor(public name: string, public sub_tests: Test[]) {}

    run() {
      return run(this, 0)
    }
  }

  export function testset(name: string, ...tests: Test[]) {
    return new TestSet(name, tests)
  }

  export async function run(test: Test, indent: number = 0): Promise<boolean> {
    if (test instanceof TestSet) {
      console.log(`${" ".repeat(indent)}Running '${test.name}'`)

      let success = true

      for (let sub of test.sub_tests) {
        success &&= await run(sub, indent + 2)
      }

      console.log(`${" ".repeat(indent)}Result of '${test.name}' ${success ? "✓" : "FAILURE"}`)

      return success
    } else {
      const success = await (async () => {
        try {
          await test()
          return true
        } catch (e) {
          return false
        }
      })()

      console.log(`${" ".repeat(indent)}'Running ${test.name}': ${success ? "✓" : "FAILURE"}`)

      return success
    }
  }

  class TestFailedException extends Error {
    constructor() {super();}
  }

  export function fail(): never {
    debugger
    throw new TestFailedException()
  }

  export function assert(b: boolean) {
    if (!b) fail()
  }

  export function assertEquals(a: number, b: number, epsilon: number = 0.000001) {
    assert(Math.abs(a - b) < epsilon)
  }
}