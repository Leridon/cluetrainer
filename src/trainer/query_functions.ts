import {type ClueTrainer} from "./ClueTrainer";
import {ExportImport} from "lib/util/exportString";
import * as lodash from "lodash"
import {identity} from "lodash";

export namespace QueryLinks {
  export type Command<T extends Record<string, any>> = {
    name: string,
    parser: {
      [P in keyof T]?: (_: string) => T[P];
    },
    serializer: {
      [P in keyof T]?: (_: T[P]) => string;
    },
    default: {
      [P in keyof T]?: T[P];
    }
    instantiate: (arg: T) => (_: ClueTrainer) => void
  }

  type QueryInvocation<T> = {
    name: string,
    arg: T
  }

  export namespace Commands {
    export function invocation<T>(command: Command<T>, arg: T): QueryInvocation<T> {
      let cloned_arg = lodash.clone(arg)

      for (let key of Object.keys(command.serializer)) {
        cloned_arg[key] = (command.serializer[key] || identity)(arg[key])
      }

      return {
        name: command.name,
        arg: cloned_arg
      }
    }
  }

  namespace QueryInvocation {
    import imp = ExportImport.imp;

    export function toQuery<T>(query: QueryInvocation<T>, compact: boolean = true): URLSearchParams {

      if (compact)
        return new URLSearchParams({
          "ctr_query": exp(null, true, false)(query)
        })
      else {
        let encoded = {
          "ctr_query": query.name,
        }

        for (let key of Object.keys(query.arg)) {
          let value = query.arg[key]

          if (typeof value == "string") encoded[key] = value
          else encoded[key] = JSON.stringify(value)
        }

        return new URLSearchParams(encoded)
      }
    }

    export function fromQuery(index: Command<any>[], params: URLSearchParams): QueryInvocation<any> {
      let query = params.get("ctr_query")

      if (!query) return null

      if (index.find(c => c.name == query)) {
        return {name: query, arg: Object.fromEntries(params.entries())}
      } else return imp()(query) as QueryInvocation<any>
    }

    export function resolve<T>(index: Command<any>[], query: QueryInvocation<T>): (_: ClueTrainer) => void {
      let command = (index.find(c => c.name == query.name) as Command<T>)

      let cloned_arg = lodash.clone(query.arg)

      for (let key of Object.keys(command.parser)) {
        cloned_arg[key] = query.arg[key] == null
          ? command.default[key]
          : (command.parser[key] || imp)(query.arg[key])
      }

      return command.instantiate(query.arg)
    }
  }

  export function link<T>(command: Command<T>, arg: T, compact: boolean = true): string {
    return `${get_path()}?${QueryInvocation.toQuery(Commands.invocation(command, arg), compact).toString()}`
  }

  export function get_from_params(index: Command<any>[], parameters: URLSearchParams): (_: ClueTrainer) => void {
    let invocation = QueryInvocation.fromQuery(index, parameters)
    if (!invocation) return null
    return QueryInvocation.resolve(index, invocation)
  }

  import exp = ExportImport.exp;

  function get_path() {
    if (window) return window.location.origin + window.location.pathname
    else return "https://cluetrainer.app"
  }
}
