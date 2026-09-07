import lodash from "lodash";

export namespace LuaUtils {
  export function toLua(value: any): string {
    const indent = (s: string) =>
      s.replace(/^/gm, " ".repeat(2));

    const keywords = ["if", "then", "else", "elseif", "fun", "end", "for", "while"]

    if (value == null) return "nil"

    switch (typeof (value)) {
      case "boolean":
      case "string":
      case "number":
        return JSON.stringify(value)
      case "object":
        const entries = (() => {
          if (Array.isArray(value)) {
            return value.map((key_value) => toLua(key_value))
          } else {
            return Object.entries(value).filter(([key, value]) => !key.startsWith("_") && key != "ocr_data").map(([key, key_value]) => {
                const lua_key = keywords.includes(key) ? `[${JSON.stringify(key)}]` : key
                const lua_value = toLua(key_value)

                return `${lua_key} = ${lua_value}`
              }
            )
          }
        })()

        const one_line = entries.every(e => !e.includes("\n")) && (lodash.sumBy(entries, entry => entry.length) + (entries.length - 1) * 2) < 80

        if (one_line) return `{ ${entries.join(", ")} }`
        else return `{\n${entries.map(e => indent(e)).join(",\n")}\n}`
    }

    return ""
  }

  export function asTypedFile(value: any, variable_name: string, lua_type: string): string {
    return `---@type ${lua_type}\nlocal ${variable_name} = ${toLua(value)}\n\nreturn ${variable_name}`
  }
}