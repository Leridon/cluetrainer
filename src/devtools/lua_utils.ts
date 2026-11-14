import lodash from "lodash";

export namespace LuaUtils {
  /** Lua code that toLua writes as-is, such as id.NPC.KING_ROALD. */
  export class Expression {
    constructor(public readonly code: string) {
    }
  }

  /** Whether a table is written on one line, given its entries formatted as Lua. */
  export type Layout = (entries: string[]) => boolean

  export namespace Layout {
    /** One line while the entries and the separators between them stay under 80 characters. */
    export const standard: Layout = entries =>
      (lodash.sumBy(entries, entry => entry.length) + (entries.length - 1) * 2) < 80

    /** One line while the entries, without separators, stay under 60 characters. Used by the plugin's method packs. */
    export const compact: Layout = entries =>
      lodash.sumBy(entries, entry => entry.length) < 60
  }

  export function toLua(value: any, layout: Layout = Layout.standard): string {
    const indent = (s: string) =>
      s.replace(/^/gm, " ".repeat(2));

    const keywords = ["if", "then", "else", "elseif", "fun", "end", "for", "while"]

    if (value == null) return "nil"

    if (value instanceof Expression) return value.code

    switch (typeof (value)) {
      case "boolean":
      case "string":
      case "number":
        return JSON.stringify(value)
      case "object":
        const entries = (() => {
          if (Array.isArray(value)) {
            return value.map((key_value) => toLua(key_value, layout))
          } else {
            return Object.entries(value).filter(([key, value]) => !key.startsWith("_") && key != "ocr_data").map(([key, key_value]) => {
                const lua_key = keywords.includes(key) ? `[${JSON.stringify(key)}]` : key
                const lua_value = toLua(key_value, layout)

                return `${lua_key} = ${lua_value}`
              }
            )
          }
        })()

        const one_line = entries.every(e => !e.includes("\n")) && layout(entries)

        if (one_line) return `{ ${entries.join(", ")} }`
        else return `{\n${entries.map(e => indent(e)).join(",\n")}\n}`
    }

    return ""
  }

  export function asTypedFile(value: any, variable_name: string, lua_type: string): string {
    return `---@type ${lua_type}\nlocal ${variable_name} = ${toLua(value)}\n\nreturn ${variable_name}`
  }
}