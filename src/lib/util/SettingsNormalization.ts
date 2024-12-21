import * as lodash from "lodash"

export namespace SettingsNormalization {
  export type NormalizationFunction<T> = (_: T) => T

  type WithDefault<T> = (_: T) => NormalizationFunction<T>

  export const bool: WithDefault<boolean> = (def) => (old) => typeof old == "boolean" ? old : def
  export const number: WithDefault<number> = (def) => (old) => typeof old == "number" ? old : def

  export function clamp(lowest: number, highest: number): NormalizationFunction<number> {
    return (old) => lodash.clamp(old, lowest, highest)
  }

  export const str: WithDefault<string> = (def) => (old) => old ?? def

  export function normaliz<T extends object>(functions: { [key in keyof T]: NormalizationFunction<T[key]> }): NormalizationFunction<T> {
    return old => {
      if (!old) old = {} as T

      for (const key of Object.keys(functions) as (keyof T)[]) {
        const f: NormalizationFunction<T[typeof key]> = functions[key as keyof T]

        old[key] = f(old[key])
      }

      return old
    }
  }
}