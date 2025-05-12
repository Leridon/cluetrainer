import {AugmentedMethod, MethodPackManager, Pack} from "../../model/MethodPackManager";
import {SolvingMethods} from "../../model/methods";
import {Path} from "../../../lib/runescape/pathing";
import {ScanTree} from "../../../lib/cluetheory/scans/ScanTree";
import {GenericPathMethodEditor} from "./GenericPathMethodEditor";
import {Clues} from "../../../lib/runescape/clues";
import {PathEditor} from "../../pathedit/PathEditor";
import {NisModal} from "../../../lib/ui/NisModal";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import {BigNisButton} from "../widgets/BigNisButton";
import ExportStringModal from "../widgets/modals/ExportStringModal";
import {util} from "../../../lib/util/util";
import ButtonRow from "../../../lib/ui/ButtonRow";
import Properties from "../widgets/Properties";
import {NewMethodPackModal} from "./MethodPackModal";

export namespace MethodNormalization {

  import Method = SolvingMethods.Method;
  import ScanTreeNode = ScanTree.ScanTreeNode;
  import GenericPathMethod = SolvingMethods.GenericPathMethod;
  import normalizeFarDive = PathEditor.normalizeFarDive;
  import cleanedJSON = util.cleanedJSON;

  export type Settings = {
    update_far_dives?: boolean,
    recalculate_timings?: boolean
  }

  abstract class Normalizer {

    async step(step: Path.Step): Promise<Path.Step> {
      return step
    }

    async path(path: Path): Promise<Path> {
      return await Promise.all(path.map(async step => {
        return this.step(step)
      }))
    }

    async method(method: AugmentedMethod): Promise<Method> {
      switch (method.method.type) {
        case "general_path":
          return {
            ...method.method,
            pre_path: !method.method.pre_path ? undefined : await this.path(method.method.pre_path),
            main_path: !method.method.main_path ? undefined : await this.path(method.method.main_path),
            post_path: !method.method.post_path ? undefined : await this.path(method.method.post_path),
          }
        case "scantree":
          const forNode = async (node: ScanTreeNode): Promise<ScanTreeNode> => {
            return {
              ...node,
              path: await this.path(node.path),
              children: await Promise.all(node.children.map(async c => ({
                key: c.key,
                value: await forNode(c.value)
              })))
            }
          }

          return {
            ...method.method,
            tree: {
              ...method.method.tree,
              root: await forNode(method.method.tree.root)
            }
          }
      }
    }

    async pack(pack: Pack): Promise<Pack> {
      return {
        ...pack,
        methods: await Promise.all(pack.methods.map(m => this.method(
          AugmentedMethod.create(m, pack))))
      }
    }
  }

  export function update_far_dives(): Normalizer {
    return new class extends Normalizer {
      async step(step: Path.Step): Promise<Path.Step> {
        return await normalizeFarDive(step)
      }
    }
  }

  export function update_timings(): Normalizer {
    return new class extends Normalizer {
      async method(method: AugmentedMethod): Promise<SolvingMethods.Method> {

        switch (method.method.type) {
          case "general_path":
            return {
              ...method.method,
              expected_time: (await GenericPathMethodEditor.getEndState(method as AugmentedMethod<GenericPathMethod>)).tick
            }
          case "scantree":
            return {
              ...method.method,
              expected_time: (await ScanTree.Augmentation.augment({augment_paths: true, analyze_timing: true, path_assumptions: method.method.assumptions},
                method.method.tree,
                method.clue.clue as Clues.Scan
              )).state.timing_analysis.average + 1
            }
        }
      }
    }
  }

  export function chain(...normalizers: Normalizer[]) {
    return new class extends Normalizer {
      async pack(pack: Pack): Promise<Pack> {
        return await normalizers.reduce(async (pack, normalizer) => await normalizer.pack(await pack), Promise.resolve(pack))
      }
    }
  }

  export function forSettings(settings: Settings): Normalizer {
    const normalizers: Normalizer[] = []

    if (settings.update_far_dives) normalizers.push(update_far_dives())
    if (settings.recalculate_timings) normalizers.push(update_timings())

    return chain(...normalizers)
  }

  export class Modal extends NisModal {
    private settings: Settings = {}
    private mode: "save" | "savecopy" | "show" = "show"

    constructor(private pack: Pack) {
      super();

      this.title.set("Normalize Method Pack")
    }

    render() {
      super.render()

      const layout = new Properties().appendTo(this.body)


      layout.header(
        new Checkbox("Update Far Dives")
          .onCommit(v => this.settings.update_far_dives = v)
      )

      layout.paragraph("Update all dives to correctly contain a flag that indicates whether it's a far dive or a precise dive.")

      layout.header(
        new Checkbox("Recalculate timings")
          .onCommit(v => this.settings.recalculate_timings = v)
      )

      layout.paragraph("Recalculate expected timings for all methods.")

      const grp = new Checkbox.Group([
        {button: new Checkbox("Show JSON"), value: "show" as const},
        {button: new Checkbox("Save").setEnabled(!this.pack.is_real_default), value: "save" as const},
        {button: new Checkbox("Save Copy"), value: "savecopy" as const},
      ])
        .setValue(this.mode)
        .onChange(v => this.mode = v)

      new ButtonRow().buttons(...grp.checkboxes()).appendTo(this.body)
    }

    async execute() {
      const updated = await forSettings(this.settings).pack(this.pack)
      switch (this.mode) {
        case "show":
          new ExportStringModal(cleanedJSON(updated)).show()
          break;
        case "save":
          MethodPackManager.instance().updatePack(this.pack, p => p.methods = updated.methods)
          break;
        case "savecopy":
          new NewMethodPackModal(updated).do()
          break;
      }

      this.remove()
    }

    getButtons(): BigNisButton[] {
      return [
        new BigNisButton("Cancel", "cancel").onClick(() => this.remove()),
        new BigNisButton("Confirm", "confirm").onClick(() => this.execute())
      ]
    }
  }
}