import Widget from "../widgets/Widget";
import SpotOrderingEdit from "./SpotNumberingEdit";
import AreaEdit from "./AreaEdit";
import TreeEdit from "./TreeEdit";
import {ScanStep} from "../../model/clues";
import {MapCoordinate} from "../../model/coordinates";
import {indirect, resolve} from "../../model/methods";
import {ScanEditLayer} from "../map/layers/ScanLayer";
import PathEdit from "./PathEdit";
import {ScanTree2} from "../../model/scans/ScanTree2";
import ScanSpot = ScanTree2.ScanSpot;
import resolved_scan_tree = ScanTree2.resolved_scan_tree;
import ExportStringModal from "../widgets/modals/ExportStringModal";
import {export_string, import_string} from "../../util/exportString";
import ImportStringModal from "../widgets/modals/ImportStringModal";
import indirect_scan_tree = ScanTree2.indirect_scan_tree;
import narrow_down = ScanTree2.narrow_down;
import assumedRange = ScanTree2.assumedRange;

export default class ScanEditPanel extends Widget {
    spot_ordering: SpotOrderingEdit
    areas: AreaEdit
    tree_edit: TreeEdit
    path_edit: PathEdit

    constructor(public layer: ScanEditLayer, public clue: ScanStep, public value: resolved_scan_tree) {
        super($(".cluemethodcontent[data-methodsection=scanedit]").empty())

        {
            let control_row = $("<div style='text-align: center'></div>").appendTo(this.container)

            $("<div class='lightbutton'>Show JSON</div>")
                .on("click", () => {
                    ExportStringModal.do(JSON.stringify(indirect(this.value), null, 2))
                })
                .appendTo(control_row)

            $("<div class='lightbutton'>Export</div>")
                .on("click", () => {
                    ExportStringModal.do(export_string("scantree", 0, indirect(this.value)), "Copy the string below to share this scan route.")
                })
                .appendTo(control_row)

            $("<div class='lightbutton'>Import</div>")
                .on("click", () => {
                    ImportStringModal.do((s) => {
                        let i = import_string<indirect_scan_tree>("scantree", 0, s)

                        if (i.clue != this.clue.id) throw new Error("This method is not for the currently loaded clue")

                        return resolve(i)
                    })
                        .then((obj: resolved_scan_tree) => {
                            this.setValue(obj)
                        })
                })
                .appendTo(control_row)
        }


        this.spot_ordering = new SpotOrderingEdit(layer, value.spot_ordering).appendTo(this)
        this.areas = new AreaEdit(this, value.areas, layer).appendTo(this)
        this.tree_edit = new TreeEdit(this, value.root).appendTo(this)
        this.path_edit = new PathEdit(this, this.value.methods).appendTo(this)

        this.spot_ordering.on("changed", (v: MapCoordinate[]) => {
            this.value.spot_ordering = v
            this.areas.areas.forEach((a) => a.updateSpotOrder())
            this.tree_edit.update()
            this.path_edit.update()
        })

        this.areas
            .on("changed", (a: ScanSpot[]) => {
                this.value.areas = a

                this.tree_edit.clean()
                this.path_edit.clean()
            })
            .on("decisions_changed", (decisions) => {
                let candidates = decisions.reduce((candidates, decision) => {
                    return narrow_down(candidates, decision, assumedRange(this.value))
                }, this.clue.solution.candidates)

                this.layer.set_remaining_candidates(candidates)
                this.layer.highlightCandidates(candidates)
            })
            .on("renamed", (e) => {
                function tree_renamer(node: ScanTree2.decision_tree) {
                    if (!node) return

                    if (node.where == e.old) node.where = e.new

                    node.children.forEach((c) => tree_renamer(c.value))
                }

                tree_renamer(this.value.root)

                this.tree_edit.update()

                this.value.methods.forEach((m) => {
                    if (m.from == e.old) m.from = e.new
                    if (m.to == e.old) m.to = e.new
                })

                this.path_edit.update()
            })

        this.tree_edit.on("changed", (t) => {
            console.log("Changed tree")
            this.value.root = t
            this.path_edit.clean()
        }).on("decisions_loaded", (decisions) => {
            this.areas.setDecisions(decisions)
        })

        this.path_edit.on("changed", (v) => {
            console.log("Changed paths")
            this.value.methods = v
        })
    }

    setValue(value: resolved_scan_tree) {
        this.value = value

        this.spot_ordering.setValue(value.spot_ordering)
        this.areas.setValue(value.areas)
        this.tree_edit.setValue(value.root)
        this.path_edit.setValue(value.methods)
    }
}