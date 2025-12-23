import {deflate, inflate} from "pako";
import {base64ToBytes, bytesToBase64} from "byte-base64";
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

  type envelop = {
    payload_type: "envelop",
    hash?: number,
    compressed?: boolean,
    value: string
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
        value: cleanedJSON(value)
      }

      if (compress) {
        p.value = bytesToBase64(deflate(p.value))
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

  export function imp<T>(type_info: {
                           expected_type: string,
                           expected_version: number,
                           migrations?: ({ from: number, to: number, f: (_: T) => T }[])
                         } = null,
  ): (s: string) => T {

    const from_string = (s: string | object): any => {
      if (typeof s == "string") return is_json_string(s) ? JSON.parse(s) : JSON.parse(atob(s))
      else return s
    }
    const extract_envelop = (o) => {

      if (o?.payload_type == "envelop") {
        let envelop = o as envelop

        if (envelop.hash != null && cyrb53(envelop.value) != o.hash) throw new Error()

        if (envelop.compressed) return JSON.parse(inflate(base64ToBytes(o.value), {to: 'string'}))
        else return JSON.parse(o.value)
      }

      return o
    }
    const extract_typed = (o) => {
      if (o?.payload_type == "typed") {
        let envelop = o as typed_value<T>

        let version = envelop.version
        let value = envelop.value

        while (type_info?.migrations) {
          let migration = type_info.migrations.find((e) => e.from == version)
          if (!migration) break

          value = migration.f(value)
          version = migration.to
        }

        if (type_info && envelop.type != type_info.expected_type || version != type_info.expected_version) throw new Error()

        return value
      }

      return o
    }

    return (s: string) => {
      try {
        return compose(
          from_string,
          extract_envelop,
          extract_typed
        )(s)
      } catch (e) {
        console.error(e)
        return null
      }
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