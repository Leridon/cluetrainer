import DOMPurify from "dompurify";
import * as lodash from "lodash";
import {C} from "../ui/constructors";
import Widget from "../ui/Widget";
import Appendable = C.Appendable;

export class TemplateResolver {
  private templates: Record<string, TemplateResolver.Function> = {}

  constructor(...functions: TemplateResolver.Function[]) {
    for (let f of functions) {
      this.templates[f.name] = f
    }
  }

  with(...functions: TemplateResolver.Function[]): TemplateResolver {
    let copy = this.copy()

    for (let f of functions) {
      copy.templates[f.name] = f
    }

    return copy
  }

  resolve(template: string): Appendable[] {
    const expression = TemplateResolver.Expression.parse(template, this.templates)

    const result = TemplateResolver.Expression.evaluate(expression).map(TemplateResolver.Value.asAppendable)

    return result
  }

  copy(): TemplateResolver {
    return new TemplateResolver(...Object.values(this.templates))
  }
}

export namespace TemplateResolver {

  import span = C.span;
  export const ExpressionType = ["safestring", "application", "domelement", "error"] as const
  export type ExpressionType = typeof ExpressionType[number]

  export type ExpressionBase = {
    type: ExpressionType
  }

  export type SafeString = ExpressionBase & {
    type: "safestring"
    value: string
  }

  export type Application = ExpressionBase & {
    type: "application",
    function: Function,
    arguments: Expression[]
  }

  export type DomElement = ExpressionBase & {
    type: "domelement",
    value: Widget
  }

  export type Error = ExpressionBase & {
    type: "error",
    message: string
  }

  export type Value = DomElement | SafeString | Error

  export namespace Value {
    import Appendable = C.Appendable;

    export function asAppendable(val: Value): Appendable {
      switch (val.type) {
        case "safestring":
          return val.value
        case "domelement":
          return val.value
        case "error":
          return "ERROR"
      }
    }
  }

  export type Function = {
    name: string,
    apply: (args: Value[]) => Value[]
  }

  export type Expression = Value | Application

  export const Concat: Function = {
    name: "concat",
    apply: args => {
      const result: Value[] = []

      let concat_buffer: SafeString[] = []

      const contains_dom = args.some(a => a.type == "domelement")

      function clear() {
        if (concat_buffer.length > 0) {

          let s = result.length > 0 ? "&nbsp;" : ""
          s += concat_buffer.map(e => e.value).join(" ")
          s += "&nbsp;"

          if (contains_dom) {
            result.push({type: "domelement", value: span().setInnerHtml(s).css("white-space", "nowrap")})
          } else {
            result.push({type: "safestring", value: s})
          }
          concat_buffer = []
        }
      }


      for (const arg of args) {
        switch (arg.type) {
          case "safestring":
            concat_buffer.push(arg)
            break;
          case "domelement":
            clear()
            result.push(arg)
            break;
        }
      }

      clear()

      return result
    }
  }

  export const Unknown: Function = {
    name: "Unknown",
    apply: () => [{type: "safestring", value: "UNKNOWN FUNCTION"}]
  }

  export namespace Expression {
    export function evaluate(exp: Expression): Value[] {
      try {
        switch (exp.type) {
          case "application":
            const evaluated_args = exp.arguments.flatMap(a => evaluate(a))

            return (exp.function ?? Unknown).apply(evaluated_args)
          default:
            return [exp]
        }
      } catch (e) {
        return [{type: "error", message: e.toString()}]
      }
    }

    type Token = SafeString | "open" | "close"

    function tokenize(input: string): Token[] {
      let tokens: Token[] = []

      let i = 0;

      while (i < input.length) {
        if (input.startsWith("{{", i)) {
          tokens.push("open")
          i += 2
        } else if (input.startsWith("}}", i)) {
          tokens.push("close")
          i += 2
        } else {
          let next_space = Math.min(
            ...[
              input.indexOf(" ", i),
              input.indexOf("{{", i),
              input.indexOf("}}", i),
            ].filter(i => i > 0)
          )

          if (next_space < 0) next_space = input.length

          tokens.push({
            type: "safestring",
            value: DOMPurify.sanitize(lodash.escape(input.substring(i, next_space).trimEnd()))
          })

          i = next_space
        }

        while (input.charAt(i) == " ") i++;
      }

      return tokens
    }

    export function parse(input: string, table: Record<string, Function>): Expression {
      const tokens = tokenize(input)

      let lookahead_index = 0

      function getLookahead(): Token {
        return tokens[lookahead_index]
      }

      function parse_application(): Expression {
        let lookahead = getLookahead()

        if (!lookahead || lookahead == "open" || lookahead == "close") return {type: "application", function: Concat, arguments: []}

        const name = DOMPurify.sanitize(lodash.escape(lookahead.value))

        lookahead_index += 1

        const f = table[name]

        if (f) return {
          type: "application",
          function: f,
          arguments: parse_arguments()
        }
        else return {
          type: "error",
          message: `Unknown Function ${name}`
        }
      }

      function parse_arguments(): Expression[] {
        const list: Expression[] = []

        while (true) {
          const lookahead = getLookahead()

          if (lookahead == "close" || lookahead == undefined) {
            lookahead_index += 1 // Consume close token
            return list
          } else if (lookahead == "open") {
            lookahead_index += 1
            list.push(parse_application())
          } else {
            list.push(lookahead)
            lookahead_index += 1
          }
        }
      }

      const args = parse_arguments()

      return {
        type: "application",
        function: Concat,
        arguments: args
      }
    }
  }
}