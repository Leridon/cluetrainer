import {storage} from "../lib/util/storage";
import KeyValueStore, {KeyValueStoreVariable} from "../lib/util/KeyValueStore";
import ExportStringModal from "./ui/widgets/modals/ExportStringModal";
import {ExportImport} from "../lib/util/exportString";
import exp = ExportImport.exp;
import {ImportModal} from "./ui/widgets/modals/ImportModal";
import imp = ExportImport.imp;
import {ConfirmationModal} from "./ui/widgets/modals/ConfirmationModal";

export class DataExport {
  constructor(private name: string, private version: number, private spec: DataExport.Specification) { }

  async dump() {
    const dump = await DataExport.dump(this.spec, this.version)

    ExportStringModal.do(exp({type: `${this.name}dataexport`, version: 0}, false, false)(dump),
      "Download this file or copy and paste the text below into a text file.",
      `${this.name}_v${dump.source.version}_datadump${dump.source.timestamp}.txt`
    )
  }

  async restore() {
    await ImportModal.textFile<DataExport.Dump>(
      s => imp<DataExport.Dump>({expected_type: `${this.name}dataexport`, expected_version: 0})(s),
      async dump => {

        const is_correct_Version = dump.source.version

        const confirmed = await new ConfirmationModal({
          title: "Restore data dump",
          body: `Restoring this data dump from ${new Date(dump.source.timestamp).toLocaleDateString()} ${new Date(dump.source.timestamp).toLocaleTimeString()} will replace all your existing local data. Do you want to proceed?\n\nThe page will be refreshed afterwards.` +
            (is_correct_Version ? "" : `Note: This dump is from version ${dump.source.version}, but you are currently running version ${this.version}. This can potentially cause issues.`),
          options: [
            {kind: "cancel", value: false, is_cancel: true, text: "Cancel"},
            {kind: "confirm", value: true, is_cancel: false, text: "Confirm"},
          ]
        }).do()

        if (confirmed) {
          await DataExport.restore(dump)

          window.location.reload()
        }
      }
    )
  }
}

export namespace DataExport {
  export type Field = {
    type: "localstorage",
    key: string
  } | {
    type: "kvstore",
    store_name: string,
    key: string
  }

  export type Specification = Field[]

  export function createSpec(...vars: (storage.Variable<any> | KeyValueStoreVariable<any>)[]): Specification {
    return vars.map<Field>(v => {
      if (v instanceof storage.Variable) {
        return {type: "localstorage", key: v.key}
      } else {
        return {type: "kvstore", store_name: v.store.name, key: v.key}
      }
    })
  }

  export type Dump = {
    source: { version: number, timestamp: number },
    components: {
      field: Field,
      value: object
    }[]
  }

  export async function dump(spec: Specification, version: number): Promise<Dump> {
    async function get(field: Field) {
      switch (field.type) {
        case "localstorage":
          return storage.get(field.key)
        case "kvstore":
          return await KeyValueStore.get(field.store_name).get(field.key)
      }
    }

    return {
      source: {version, timestamp: Date.now()},
      components: await Promise.all(spec.map(async field => {

        return {
          field: field,
          value: await get(field)
        }
      }))
    }
  }

  export async function restore(dump: Dump): Promise<void> {
    await Promise.all(dump.components.map(async comp => {
      switch (comp.field.type) {
        case "localstorage":
          storage.set(comp.field.key, comp.value)
          break;
        case "kvstore":
          await KeyValueStore.get(comp.field.store_name).set(comp.field.key, comp.value)
          break;
      }
    }))
  }
}