import {ScanTree} from "../../../../lib/cluetheory/scans/ScanTree";
import Widget from "../../../../lib/ui/Widget";
import {AugmentedMethod} from "../../../model/MethodPackManager";
import {Clues} from "../../../../lib/runescape/clues";
import BoundsBuilder from "../../../../lib/gamemap/BoundsBuilder";
import {Path} from "../../../../lib/runescape/pathing";
import {floor_t, TileCoordinates, TileRectangle} from "../../../../lib/runescape/coordinates";
import {Rectangle, Vector2} from "../../../../lib/math";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {ScanRegionPolygon} from "../ScanLayer";
import {PathStepEntity} from "../../map/entities/PathStepEntity";
import {Scans} from "../../../../lib/runescape/clues/scans";
import PulseButton from "../PulseButton";
import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {TemplateResolver} from "../../../../lib/util/TemplateResolver";
import {util} from "../../../../lib/util/util";
import {SolvingMethods} from "../../../model/methods";
import {NeoSolvingSubBehaviour} from "../NeoSolvingSubBehaviour";
import {C} from "../../../../lib/ui/constructors";
import {TextRendering} from "../../TextRendering";
import {AbstractCaptureService, CapturedImage, DerivedCaptureService, InterestedToken, ScreenCaptureService} from "../../../../lib/alt1/capture";
import {CapturedScan} from "../cluereader/capture/CapturedScan";
import {Finder} from "../../../../lib/alt1/capture/Finder";
import {ScanSolving} from "./ScanSolving";
import {Observable} from "../../../../lib/reactive";
import {GameLayer} from "../../../../lib/gamemap/GameLayer";
import {GameMapMouseEvent} from "../../../../lib/gamemap/MapEvents";
import {ScanEditLayer} from "../../theorycrafting/scanedit/ScanEditor";
import Behaviour from "../../../../lib/ui/Behaviour";
import {Process} from "../../../../lib/Process";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import activate = TileArea.activate;
import AugmentedScanTree = ScanTree.Augmentation.AugmentedScanTree;
import cls = C.cls;
import Order = util.Order;
import spotNumber = ScanTree.spotNumber;
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import ScanMinimapOverlay = ScanSolving.ScanMinimapOverlay;
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;
import digSpotArea = Clues.digSpotArea;
import Pulse = Scans.Pulse;
import A1Color = util.A1Color;
import hbox = C.hbox;
import hgrid = C.hgrid;
import LightButton from "../../widgets/LightButton";

class ScanTreeSolvingLayer extends GameLayer {

}

class ScanControlPrototype extends Behaviour {
  private process: ScanControlPrototype.OverlayProcess = null

  constructor(private parent: ScanTreeSolving) {
    super();
  }


  protected begin() {
    this.process = new ScanControlPrototype.OverlayProcess()

    this.process.run()

    this.parent.parent.app.main_hotkey.subscribe(1, event => {
      console.log(event.mouse)

      const pulse = ((): Pulse => {
        if (Rectangle.contains(this.process.single, event.mouse)) return {pulse: 1}
        if (Rectangle.contains(this.process.double, event.mouse)) return {pulse: 2}
        if (Rectangle.contains(this.process.triple, event.mouse)) return {pulse: 3}

        return null
      })()

      if (pulse) {
        const candidates = this.parent.node.children.filter(c => c.key.pulse == pulse.pulse)

        if (candidates.length == 1) this.parent.setNode(candidates[0].value)
      }
    }).bindTo(this.lifetime_manager)
  }

  protected end() {
    this.process.overlay.clear().render()

    this.process?.stop()
  }
}

namespace ScanControlPrototype {
  import A1Color = util.A1Color;
  export const position: Vector2 = {x: 942, y: 323}
  export const size: number = 100
  export const space: number = 10

  export class OverlayProcess extends Process.Interval {
    public overlay: OverlayGeometry = null

    public single: Rectangle = null
    public double: Rectangle = null
    public triple: Rectangle = null

    constructor() {
      super(5000);

      this.overlay = new OverlayGeometry()

      this.single = Rectangle.fromOriginAndSize(position, {x: size, y: size})
      this.double = Rectangle.move(this.single, {x: size + space, y: 0})
      this.triple = Rectangle.move(this.double, {x: size + space, y: 0})

      this.overlay.rect(this.single, {color: A1Color.fromHex("#0000FF")})
      this.overlay.rect(this.double, {color: A1Color.fromHex("#dc9936")})
      this.overlay.rect(this.triple, {color: A1Color.fromHex("#FF0000")})
    }

    tick(): void {
      this.overlay.render() // Refresh rendering periodically
    }
  }
}

class ScanCaptureService extends DerivedCaptureService<ScanCaptureService.Options, CapturedScan> {
  private debug_overlay = over()

  private capture_interest: AbstractCaptureService.InterestToken<ScreenCaptureService.Options, CapturedImage>
  private interface_finder: Finder<CapturedScan>
  public readonly initialization: AsyncInitialization

  constructor(private capture_service: ScreenCaptureService, private original_captured_interface: CapturedScan | null) {
    super()

    this.capture_interest = this.addDataSource(capture_service, () => {
      return {
        area: this.original_captured_interface.body.screen_rectangle,
        interval: null,
      }
    })

    this.initialization = async_init(async () => {
      this.interface_finder = await CapturedScan.finder.get()
    })
  }

  processNotifications(interested_tokens: InterestedToken<ScanCaptureService.Options, CapturedScan>[]): CapturedScan {
    const capture = this.capture_interest.lastNotification()

    if (this.original_captured_interface) {
      // TODO: This does not work because the text can shift vertically and needs to be realigned after recapturing
      const updated = this.original_captured_interface.updated(capture.value)

      this.debug_overlay.clear()

      updated.body.setName("Scan").debugOverlay(this.debug_overlay)

      this.debug_overlay.render()

      return updated
    } else if (this.initialization.isInitialized()) {
      const ui = this.interface_finder.find(capture.value)

      if (ui) this.original_captured_interface = ui

      return ui
    }
  }
}

namespace ScanCaptureService {
  export type Options = AbstractCaptureService.Options & {
    show_overlay?: boolean
  }
}

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

export class ScanTreeSolving extends NeoSolvingSubBehaviour {
  node: ScanTree.Augmentation.AugmentedScanTreeNode = null
  augmented: ScanTree.Augmentation.AugmentedScanTree = null
  layer: GameLayer = null

  private minimap_overlay: ScanMinimapOverlay

  tree_widget: Widget

  private scan_capture_service: ScanCaptureService
  private scan_capture_interest: AbstractCaptureService.InterestToken<ScanCaptureService.Options, CapturedScan>

  constructor(parent: NeoSolvingBehaviour,
              public method: AugmentedMethod<ScanTreeMethod, Clues.Scan>,
              private original_interface_capture: CapturedScan,
              private settings: Observable<ScanSolving.Settings>
  ) {
    super(parent, "method")

    if (this.settings.value().show_minimap_overlay_scantree) {
      this.minimap_overlay = this.withSub(new ScanMinimapOverlay(this.parent.app.minimapreader, settings, "scantree").setRange(this.method.method.tree.assumed_range))
    }

    this.augmented = ScanTree.Augmentation.basic_augmentation(method.method.tree, method.clue.clue)

    ScanTree.Augmentation.synthesize_triple_nodes(this.augmented)

    this.withSub(new ScanControlPrototype(this))
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

    // Children paths are rendered with 0.5
    node.children
      .filter(c => c.key.pulse != 3)
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
      let ui_nav = c()

      let list = c("<ol class='breadcrumb' style='margin-bottom: unset'></ol>").appendTo(ui_nav)

      AugmentedScanTree.collect_parents(node)
        .map(n =>
          c("<span class='nisl-textlink'>")
            .on("click", () => this.setNode(n))
            .text(AugmentedScanTree.decision_string(n))
        ).forEach(w => w.appendTo(c("<li>").addClass("breadcrumb-item").appendTo(list)))

      let last = list.container.children().last()

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

    if (this.original_interface_capture) {
      this.lifetime_manager.bind(
        this.scan_capture_service = new ScanCaptureService(this.parent.app.capture_service2, this.original_interface_capture),
        this.scan_capture_interest = this.scan_capture_service.subscribe({
          options: () => ({interval: CaptureInterval.fromApproximateInterval(100)}),
          handle: (scan2) => {
            const scan = scan2.value
            const rect = scan.screenRectangle()

            this.scan_interface_overlay.clear()

            this.scan_interface_overlay.rect2(rect, {
              width: 1,
              color: A1Color.fromHex("#FF0000"),
            })

            if (scan.isDifferentLevel()) {
              this.scan_interface_overlay.rect2(ScreenRectangle.move(rect,
                {x: 50, y: 220}, {x: 20, y: 20}
              ), {
                color: A1Color.fromHex("#8adc13"),
                width: 2
              })
            }

            this.scan_interface_overlay.rect2(ScreenRectangle.move(rect,
              {x: 80, y: 220}, {x: 20, y: 20}
            ), {
              color: scan.isTriple() ? A1Color.fromHex("#FF0000") : A1Color.fromHex("#0000FF"),
              width: 2
            })

            if (scan.hasMeerkats()) {
              this.scan_interface_overlay.rect2(ScreenRectangle.move(rect,
                {x: 110, y: 220}, {x: 20, y: 20}
              ), {
                color: A1Color.fromHex("#00ffff"),
                width: 2
              })
            }

            this.scan_interface_overlay.render()
          }
        })
      )
    }

    this.lifetime_manager.bind(
      /*this.scan_capture_service = new ScanCaptureService(this.parent.app.capture_service, this.original_interface_capture),
      this.scan_capture_interest = this.scan_capture_service.subscribe({
        options: () => ({interval: CaptureInterval.fromApproximateInterval(100)}),
        handle: (scan2) => {
          const scan = scan2.value
          const rect = scan.screenRectangle()

          this.scan_interface_overlay.clear()

          this.scan_interface_overlay.rect2(rect, {
            width: 1,
            color: A1Color.fromHex("#FF0000"),
          })

          if (scan.isDifferentLevel()) {
            this.scan_interface_overlay.rect2(ScreenRectangle.move(rect,
              {x: 50, y: 220}, {x: 20, y: 20}
            ), {
              color: A1Color.fromHex("#8adc13"),
              width: 2
            })
          }

          this.scan_interface_overlay.rect2(ScreenRectangle.move(rect,
            {x: 80, y: 220}, {x: 20, y: 20}
          ), {
            color: scan.isTriple() ? A1Color.fromHex("#FF0000") : A1Color.fromHex("#0000FF"),
            width: 2
          })

          if (scan.hasMeerkats()) {
            this.scan_interface_overlay.rect2(ScreenRectangle.move(rect,
              {x: 110, y: 220}, {x: 20, y: 20}
            ), {
              color: A1Color.fromHex("#00ffff"),
              width: 2
            })
          }

          this.scan_interface_overlay.render()
        }
      })*/
    )

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

    this.setNode(this.augmented.root_node)
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
