import {ScanTree} from "../../../../../lib/cluetheory/scans/ScanTree";
import Widget from "../../../../../lib/ui/Widget";
import {AugmentedMethod} from "../../../../model/MethodPackManager";
import {Clues} from "../../../../../lib/runescape/clues";
import BoundsBuilder from "../../../../../lib/gamemap/BoundsBuilder";
import {Path} from "../../../../../lib/runescape/pathing";
import {floor_t, TileCoordinates, TileRectangle} from "../../../../../lib/runescape/coordinates";
import {Rectangle} from "../../../../../lib/math";
import {TileArea} from "../../../../../lib/runescape/coordinates/TileArea";
import {ScanRegionPolygon} from "../../ScanLayer";
import {PathStepEntity} from "../../../map/entities/PathStepEntity";
import {Scans} from "../../../../../lib/runescape/clues/scans";
import PulseButton from "../../PulseButton";
import NeoSolvingBehaviour from "../../NeoSolvingBehaviour";
import {TemplateResolver} from "../../../../../lib/util/TemplateResolver";
import {util} from "../../../../../lib/util/util";
import {SolvingMethods} from "../../../../model/methods";
import {NeoSolvingSubBehaviour} from "../../NeoSolvingSubBehaviour";
import {C} from "../../../../../lib/ui/constructors";
import {TextRendering} from "../../../TextRendering";
import {CapturedScan} from "../../cluereader/capture/CapturedScan";
import {ScanSolving} from "./ScanSolving";
import {Observable} from "../../../../../lib/reactive";
import {GameLayer} from "../../../../../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../../../../../lib/gamemap/MapEvents";
import {ScanEditLayer} from "../../../theorycrafting/scanedit/ScanEditor";
import {ScanCaptureService, ScanPanelOverlay} from "./ScanPanelReader";
import {ScanControlPrototype} from "./ScanInputBehaviour";
import {ScanMinimapOverlay} from "./ScanMinimapOverlay";
import {MinimapReader} from "../../../../../lib/alt1/readers/MinimapReader";
import {ClueTrainerWiki} from "../../../../wiki";
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import activate = TileArea.activate;
import AugmentedScanTree = ScanTree.Augmentation.AugmentedScanTree;
import cls = C.cls;
import Order = util.Order;
import spotNumber = ScanTree.spotNumber;
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;
import digSpotArea = Clues.digSpotArea;
import hbox = C.hbox;
import spacer = C.spacer;
import inlineimg = C.inlineimg;

function findTripleNode(tree: AugmentedScanTreeNode, spot: TileCoordinates): AugmentedScanTreeNode {
  function searchDown(node: AugmentedScanTreeNode): AugmentedScanTreeNode {
    if (!node.remaining_candidates.some(c => TileCoordinates.eq(c, spot))) return null

    for (const child of (node.children ?? [])) {
      const res = searchDown(child.value)

      if (res) return res
    }

    return node
  }

  function searchUp(node: AugmentedScanTreeNode): AugmentedScanTreeNode {
    if (!node) return null

    if (!node.remaining_candidates.some(c => TileCoordinates.eq(c, spot))) return searchUp(node.parent?.node)

    return searchDown(node)
  }

  return searchUp(tree)
}

function asFloorDistinctionNode(node: AugmentedScanTreeNode): { level: floor_t, node: AugmentedScanTreeNode }[] {
  if (node.depth != 0) return null
  if (node.children.length != 2) return null

  const a = node.children[0].value.remaining_candidates[0].level
  const b = node.children[1].value.remaining_candidates[0].level

  if (a == b) return null

  if (!node.children[0].value.remaining_candidates.every(c => c.level == a)) return null
  if (!node.children[1].value.remaining_candidates.every(c => c.level == b)) return null

  return [
    {level: a, node: node.children[0].value},
    {level: b, node: node.children[1].value},
  ]
}

export class ScanTreeSolving extends NeoSolvingSubBehaviour {
  node: ScanTree.Augmentation.AugmentedScanTreeNode = null
  augmented: ScanTree.Augmentation.AugmentedScanTree = null
  layer: GameLayer = null

  private scan_panel_capture_service: ScanCaptureService
  private scan_panel_overlay: ScanPanelOverlay
  private scan_input_control: ScanControlPrototype

  private minimap_overlay: ScanMinimapOverlay

  tree_widget: Widget

  constructor(parent: NeoSolvingBehaviour,
              public method: AugmentedMethod<ScanTreeMethod, Clues.Scan>,
              private original_interface_capture: CapturedScan,
              private settings: Observable<ScanSolving.Settings>
  ) {
    super(parent, "method")

    this.augmented = ScanTree.Augmentation.basic_augmentation(method.method.tree, method.clue.clue)
    ScanTree.Augmentation.synthesize_triple_nodes(this.augmented)

    if (this.parent.app.in_alt1) {
      if (this.settings.value().show_minimap_overlay_scantree) {
        this.minimap_overlay = this.withSub(new ScanMinimapOverlay(MinimapReader.instance(), settings, "scantree").setRange(this.method.method.tree.assumed_range))
      }

      this.scan_panel_capture_service = new ScanCaptureService(this.original_interface_capture)
      this.scan_panel_overlay = this.withSub(new ScanPanelOverlay(this.scan_panel_capture_service))
      this.scan_input_control = this.withSub(new ScanControlPrototype(this.scan_panel_capture_service))

      this.scan_input_control.onNodeSelection(node => this.setNode(node))
    }
  }

  private fit(active_path_section: Path.raw): void {
    const node = this.node

    const bounds = new BoundsBuilder()

    // 1. The path
    if (node.raw.path.length > 0) {
      bounds.addRectangle(Path.bounds(active_path_section, true))
    } else {
      if (node.region?.area) {
        bounds.addArea(node.region.area)
      }
    }

    bounds.fixLevel()

    //2. If no children: All Candidates
    if (node.children.length == 0)
      node.remaining_candidates.forEach((c) => bounds.addTile(c))

    bounds.setDistanceLimit(320)

    if (this.settings.value().zoom_behaviour_include_triples || node.children.every(c => c.key.pulse == 3)) {
      // Add triple spots
      node.children.filter(c => c.key.pulse == 3).flatMap(c => c.value.remaining_candidates)
        .forEach(s => bounds.addTile(s))
    }

    if (this.settings.value().zoom_behaviour_include_doubles) {
      // Add double spots
      node.children.filter(c => c.key.pulse == 2).flatMap(c => c.value.remaining_candidates)
        .forEach(s => bounds.addTile(s))
    }

    if (this.settings.value().zoom_behaviour_include_singles) {
      // Add single spots
      node.children.filter(c => c.key.pulse == 1).flatMap(c => c.value.remaining_candidates)
        .forEach(s => bounds.addTile(s))
    }

    this.parent.layer.fit(bounds.get())
  }

  private renderLayer(): void {
    const node = this.node

    this.layer.clearLayers()

    const pos = node.region
      ? activate(node.region.area).center()
      : Path.ends_up(node.raw.path)

    if (pos) {
      this.parent.layer.getMap().floor.set(pos.level)
    } else {
      this.parent.layer.getMap().floor.set(Math.min(...node.remaining_candidates.map((c) => c.level)) as floor_t)
    }

    if (pos && node.remaining_candidates.length > 1
      && !(node.region && node.region.area && Rectangle.width(TileArea.toRect(node.region.area)) > this.method.method.tree.assumed_range * 2)) {
      this.parent.layer.scan_layer.marker.setFixedSpot(pos)
    } else {
      this.parent.layer.scan_layer.marker.setFixedSpot(null)
    }

    this.parent.layer.scan_layer.setActiveCandidates(node.remaining_candidates)

    new ScanRegionPolygon(ScanTree.getTargetRegion(node)).setOpacity(1).addTo(this.layer)

    AugmentedScanTree.collect_parents(node, false).forEach(n => {
      new ScanRegionPolygon(ScanTree.getTargetRegion(n)).setOpacity(0.5).addTo(this.layer)
      PathStepEntity.renderPath(n.raw.path).eachEntity(e => e.setOpacity(0.5)).addTo(this.layer)
    })

    const all_triple = node.children.every(c => c.key.pulse == 3)

    // Children paths are rendered with 0.5
    node.children
      .filter(c => all_triple || c.key.pulse != 3)
      .forEach(c => {
        PathStepEntity.renderPath(c.value.raw.path).eachEntity(l => l.setOpacity(0.5)).addTo(this.layer)
        new ScanRegionPolygon(ScanTree.getTargetRegion(c.value)).setOpacity(0.5).addTo(this.layer)
      })
  }

  /**
   * Update the interface to display the currently selected node in the decision tree.
   * @private
   */
  private updateInterface() {
    const node = this.node

    this.tree_widget.empty()

    let content = cls("ctr-neosolving-solution-row").appendTo(this.tree_widget)

    {

      const list = c("<ol class='breadcrumb' style='margin-bottom: unset'></ol>")
        .append(
          ...AugmentedScanTree.collect_parents(node)
            .map(n =>
              c("<li>").addClass("breadcrumb-item")
                .append(
                  c("<span class='nisl-textlink'>")
                    .on("click", () => this.setNode(n))
                    .text(AugmentedScanTree.decision_string(n))
                )
            )
        )

      const ui_nav = hbox(
        list,
        spacer(),
        inlineimg("assets/icons/info_nis.png").css("height", "1em").css("margin-top", "2px").addClass("ctr-clickable")
          .on("click", () => ClueTrainerWiki.openOnPage("scantrees"))
      )

      const last = list.container.children().last()

      last.text(last.children().first().text()).addClass("active")

      content.append(ui_nav)
    }

    if (node.raw?.path?.length > 0 || node.raw?.region?.name || node.children.length == 0) {
      content.append(cls('ctr-neosolving-nextscanstep')
        .append(
          ...this.parent.app.template_resolver.with(...ScanTreeSolving.scan_tree_template_resolvers(node))
            .resolve(ScanTree.getInstruction(node)))
      )
    }

    {
      const all_triples = node.children.every(e => e.key.pulse == 3)

      node.children
        .sort(Order.comap(Scans.Pulse.compare, (a) => a.key))
        .forEach((child) => {
          const resolvers = this.parent.app.template_resolver.with(...ScanTreeSolving.scan_tree_template_resolvers(child.value))

          cls("ctr-neosolving-scantreeline")
            .addClass("ctr-clickable")
            .on("click", () => {
              this.setNode(child.value)
            })
            .append(
              ((child.key.pulse == 3 && child.key.spot && all_triples)
                ? PulseButton.forSpot(spotNumber(node.root.raw, child.value.remaining_candidates[0]))
                : PulseButton.forPulse(child.key, node.children.map(c => c.key)))
                .onClick(() => {
                  this.setNode(child.value)
                }),

              (child.key.pulse != 3 || child.key.spot)
                ? c().append(...resolvers.resolve(
                  ScanTree.getInstruction(child.value)
                ))
                : C.italic("Select spot on map")
            ).appendTo(content)
        })
    }
  }

  setNode(node: ScanTree.Augmentation.AugmentedScanTreeNode) {
    if (node == this.node) return
    this.node = node

    if (this.scan_input_control) this.scan_input_control.setActiveNode(node)

    if (node.children.some(c => c.key.pulse != 3) || node.remaining_candidates.length <= 1) this.parent.layer.scan_layer.setSpotOrder(null)
    else this.parent.layer.scan_layer.setSpotOrder(this.method.method.tree.ordered_spots)

    this.registerSolution(
      TileArea.fromRect(
        TileRectangle.extend(TileRectangle.from(...node.remaining_candidates), 1)
      )
    )

    this.updateInterface()

    this.renderLayer()

    // Setting the path in the path control will in turn trigger the section selected event.
    // This in turn triggers fitting the map, so we do not need to do that here explicitly.
    this.parent.path_control.reset().setPath(node.raw?.path ?? [], {method: this.method, node})
  }

  private handling_layer: GameLayer = null

  protected begin() {
    this.parent.layer.scan_layer.setSpots(this.method.method.tree.ordered_spots)
    this.parent.layer.scan_layer.marker.setRadius(this.method.method.tree.assumed_range, this.method.method.assumptions.meerkats_active)

    this.tree_widget = c().appendTo(this.parent.layer.scantree_container)

    this.layer = new GameLayer().addTo(this.parent.layer.scan_layer)

    const self = this

    this.parent.layer.scan_layer.marker.add(this.handling_layer = new class extends GameLayer {
      eventClick(event: GameMapMouseEvent) {
        event.onPre(() => {
          if (event.active_entity instanceof ScanEditLayer.SpotMarker) {
            event.stopAllPropagation()

            self.setNode(findTripleNode(self.node, event.active_entity.spot))
            self.registerSolution(digSpotArea(event.active_entity.spot))
          }
        })
      }
    })

    const findStartNode = (): AugmentedScanTreeNode => {
      const root = this.augmented.root_node

      if (this.settings.value().select_floor_based_on_previous_solution && this.original_interface_capture) {
        const known_position = this.parent.getAssumedPlayerPositionByLastClueSolution()
        const floor_distinction = asFloorDistinctionNode(root)

        if (known_position && floor_distinction) {

          const known_level = known_position.origin.level

          const dl = this.original_interface_capture.isDifferentLevel()

          const selection = floor_distinction.find(e => dl ? e.level != known_level : e.level == known_level)

          if (selection) return selection.node
        }
      }

      return root
    }

    this.setNode(findStartNode())
  }

  protected end() {
    this.tree_widget.remove()
    this.tree_widget = null

    this.parent.layer.scan_layer.marker.setFixedSpot(null)
    this.parent.layer.scan_layer.marker.clearManualMarker()
    this.parent.layer.scan_layer.setSpotOrder(null)

    this.handling_layer?.remove()

    if (this.layer) {
      this.layer.remove()
      this.layer = null
    }
  }

  onSectionSelectedInPathControl(path: Path.raw) {
    this.fit(path)
  }
}

export namespace ScanTreeSolving {
  import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;
  import shorten_integer_list = util.shorten_integer_list;
  import render_digspot = TextRendering.render_digspot;
  import render_scanregion = TextRendering.render_scanregion;

  export function scan_tree_template_resolvers(node: AugmentedScanTreeNode): TemplateResolver.Function[] {
    return [
      {
        name: "target", apply: () => {
          if (node.remaining_candidates.length == 1) {
            return [{
              type: "domelement",
              value: render_digspot(spotNumber(node.root.raw, node.remaining_candidates[0]))
            }]
          } else {
            return [{
              type: "domelement",
              value: render_scanregion(node.raw.region?.name || "_")
            }]
          }
        }
      },
      {
        name: "candidates", apply: () => {
          return [{
            type: "domelement",
            value: c(util.natural_join(shorten_integer_list(node.remaining_candidates.map(c => spotNumber(node.root.raw, c)), c => render_digspot(c).raw().outerHTML)))
          }]
        }
      }
    ]
  }
}
