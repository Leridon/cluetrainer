import {deflate, inflate} from "pako";
import {Base64} from 'js-base64';
import {identity} from "lodash";
import {util} from "./util";

// Simple hash function
// By: User bryc on StackOverflow, https://stackoverflow.com/a/52171480
// Licence: CC BY-SA 4.0
function cyrb53(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function is_json_string(s: string): boolean {
  return ['{', '['].indexOf(s.charAt(0)) >= 0
}


export namespace ExportImport {
  import compose = util.compose;
  import cleanedJSON = util.cleanedJSON;

  type typed_value<T> = {
    payload_type: "typed",
    type: string,
    version: number,
    value: T
  }

  function is_typed_value<T>(v: object): v is typed_value<T> {
    return v && v["payload_type"] === "typed" && typeof v["type"] === "string" && typeof v["version"] === "number";
  }

  type envelop = {
    payload_type: "envelop",
    hash?: number,
    compressed?: boolean,
    value: string
  }

  function is_envelop(v: object): v is envelop {
    return v && v["payload_type"] === "envelop" && typeof v["value"] === "string"
  }

  function with_type<T>(type: string, version: number): (value: T) => typed_value<T> {
    return (value: T) => {
      return {
        payload_type: "typed",
        type: type,
        version: version,
        value: value
      }
    }
  }

  function as_payload<T>(compress: boolean = true,
                         hash: boolean = true): (value: T) => envelop {
    return (value: T): envelop => {
      let p: envelop = {
        payload_type: "envelop",
        value: JSON.stringify(value)
      }

      if (compress) {
        p.value = Base64.fromUint8Array(deflate(p.value))
        p.compressed = true
      }

      if (hash) {
        p.hash = cyrb53(p.value)
      }

      return p
    }
  }

  function as_string<T>(obj: T): string {
    return btoa(cleanedJSON(obj))
  }

  export function exp<T>(type_info: { type: string, version: number } = null,
                         compress: boolean = false,
                         hash: boolean = false): (value: T) => string {
    return compose<any>(
      type_info ? (with_type(type_info.type, type_info.version)) : identity,  // Wrap into typed if type info is given
      compress || hash ? as_payload(compress, hash) : identity,   // Wrap into envelop if it is either compressed or hashed
      as_string
    )
  }

  export class ImportError extends Error {
    constructor(public reason: string, public user_facing_message: string = undefined) {
      super(`Import error: ${reason}`);
    }
  }

  export function imp<T>(type_info: {
                           expected_type: string,
                           expected_version: number,
                           migrations?: ({ from: number, to: number, f: (_: T) => T }[]),
                         } = null,
                         validator_function: (_: any) => boolean = () => true
  ): (s: string) => T {


    const from_string = (s: string | object): any => {
      if (typeof s == "string") {
        if (is_json_string(s)) {
          try {return JSON.parse(s) } catch (e) {
            if (e instanceof SyntaxError) throw new ImportError("Invalid JSON input!");
            else throw new ImportError("Unknown error")
          }
        } else {
          try {
            return JSON.parse(atob(s))
          } catch (e) {
            if (e instanceof SyntaxError) throw new ImportError("Input decoded to invalid JSON!")
            else if (e instanceof DOMException) throw new ImportError("Invalid input text!")
            else throw new ImportError("Unknown error")
          }
        }
      } else return s
    }

    const extract_envelop = (o) => {
      if (o?.payload_type == "envelop") {

        if (!is_envelop(o)) throw new ImportError("Malformed hash envelop.", "Imported object is malformed.")

        if (o.hash != null && cyrb53(o.value) != o.hash) throw new ImportError("Hash of imported value does not match.", "Imported object is malformed.")

        if(o.compressed && !Base64.isValid(o.value))throw new ImportError("Malformed compressed envelop.", "Imported object is malformed.")

        try {
          return JSON.parse(
            o.compressed
              ? inflate(Base64.toUint8Array(o.value), {to: 'string'})
              : o.value
          )
        } catch (e) {
          if (e instanceof SyntaxError) throw new ImportError("Value contained in envelop decoded to invalid JSON!", "Imported object is malformed.");

          throw e
        }
      }

      return o
    }
    const extract_typed = (o) => {
      if (o?.payload_type == "typed") {
        if (!is_typed_value<any>(o)) throw new ImportError("Malformed typed value envelop.", "Imported object is malformed.")

        let version = o.version
        let value = o.value

        if (type_info && o.type != type_info.expected_type) throw new ImportError(`Type of imported object does not match. Expected ${type_info.expected_type}, but got ${o.type}!`)

        while (type_info?.migrations && version != type_info.expected_version) {
          let migration = type_info.migrations.find((e) => e.from == version)
          if (!migration) break

          value = migration.f(value)
          version = migration.to
        }

        if (version != type_info.expected_version) throw new ImportError(`Version of imported object does not match. Expected ${type_info.expected_version}, but got ${version}!`)

        return value
      }

      return o
    }

    const validator = o => {
      if (!validator_function(o)) throw new ImportError("Object validation failed.", "Input is malformed.")

      return o
    }

    return (s: string) => {
      return compose(
        from_string,
        extract_envelop,
        extract_typed,
        validator
      )(s)
    }
  }
}

/*

export function export_to_object<T>(type: string,
                                    version: number,
                                    compress: boolean = true): (value: T) => hashed_payload {


    return (value: T): hashed_payload => {
        let typed: typed_value<T> = {
            type: type,
            version: version,
            value: value
        }

        let string = JSON.stringify(typed)

        return {
            hash: cyrb53(string),
            value: string
        }
    }
}

export function export_string<T>(type: string, version: number, value: T): string {
    let obj = JSON.stringify({
        type: type,
        version: version,
        value: value
    })

    return btoa(JSON.stringify({
        hash: cyrb53(obj),
        value: obj
    }))
}

export function import_object<T>(expected_type: string, expected_version: number, o: {
    hash: number,
    value: string
}): T {

    if (cyrb53(o.value) != o.hash) throw new Error()

    let o2: {
        type: string,
        version: number,
        value: T
    } = JSON.parse(o.value)

    if (o2.type != expected_type || o2.version != expected_version) throw new Error()

    return o2.value
}

export function import_string<T>(expected_type: string, expected_version: number, str: string): T {
    let o: {
        hash: number,
        value: string
    } = JSON.parse(atob(str))

    if (cyrb53(o.value) != o.hash) throw new Error()

    let o2: {
        type: string,
        version: number,
        value: T
    } = JSON.parse(o.value)

    if (o2.type != expected_type || o2.version != expected_version) throw new Error()

    return o2.value
}*/