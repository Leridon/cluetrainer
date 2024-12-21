import {ScanTree} from "../../../../lib/cluetheory/scans/ScanTree";
import * as leaflet from "leaflet";
import Widget from "../../../../lib/ui/Widget";
import {AugmentedMethod} from "../../../model/MethodPackManager";
import {Clues} from "../../../../lib/runescape/clues";
import BoundsBuilder from "../../../../lib/gamemap/BoundsBuilder";
import {Path} from "../../../../lib/runescape/pathing";
import {floor_t, TileRectangle} from "../../../../lib/runescape/coordinates";
import {Rectangle} from "../../../../lib/math";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {ScanRegionPolygon} from "../ScanLayer";
import {PathStepEntity} from "../../map/entities/PathStepEntity";
import {Scans} from "../../../../lib/runescape/clues/scans";
import PulseButton, {PulseIcon} from "../PulseButton";
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
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import activate = TileArea.activate;
import AugmentedScanTree = ScanTree.Augmentation.AugmentedScanTree;
import cls = C.cls;
import Order = util.Order;
import span = C.span;
import spotNumber = ScanTree.spotNumber;
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import ScanMinimapOverlay = ScanSolving.ScanMinimapOverlay;

class ScanCaptureService extends DerivedCaptureService<ScanCaptureService.Options, CapturedScan> {
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

export class ScanTreeSolving extends NeoSolvingSubBehaviour {
  node: ScanTree.Augmentation.AugmentedScanTreeNode = null
  augmented: ScanTree.Augmentation.AugmentedScanTree = null
  layer: leaflet.FeatureGroup = null

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

    this.augmented = ScanTree.Augmentation.basic_augmentation(method.method.tree, method.clue)
  }

  private fit(active_path_section: Path.raw) {
    const node = this.node

    const bounds = new BoundsBuilder()

    //1. If no children: All Candidates
    if (node.children.length == 0)
      node.remaining_candidates.forEach((c) => bounds.addTile(c))

    // 2. The path
    if (node.raw.path.length > 0) {
      // TODO: There needs to be a way to remember the preferred section
      /*
            const last_section = index(Path.Section.split_into_sections(node.raw.path).children, -1)

            assert(last_section.type == "inner")

            const path = last_section.children.map(c => {
              assert(c.type == "leaf")
              return c.value
            })*/

      const path = active_path_section

      bounds.addRectangle(Path.bounds(path, true))
    } else {
      if (node.region?.area) {
        bounds.addArea(node.region.area)
      }
    }

    bounds.setDistanceLimit(320)

    if (this.settings.value().zoom_behaviour_include_triples) {
      // Add triple spots
      node.children.filter(c => c.key.pulse == 3).flatMap(c => c.value.remaining_candidates)
        .forEach(s => bounds.addTile(s))
    }

    if (this.settings.value().zoom_behaviour_include_doubles) {
      // Add triple spots
      node.children.filter(c => c.key.pulse == 2).flatMap(c => c.value.remaining_candidates)
        .forEach(s => bounds.addTile(s))
    }

    if (this.settings.value().zoom_behaviour_include_singles) {
      // Add triple spots
      node.children.filter(c => c.key.pulse == 1).flatMap(c => c.value.remaining_candidates)
        .forEach(s => bounds.addTile(s))
    }

    console.log(bounds.get())

    this.parent.layer.fit(bounds.get())
  }

  private renderLayer(): void {
    let node = this.node

    this.layer.clearLayers()

    let pos = node.region
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

  setNode(node: ScanTree.Augmentation.AugmentedScanTreeNode) {
    this.node = node

    this.tree_widget.empty()

    this.registerSolution(
      TileArea.fromRect(
        TileRectangle.extend(TileRectangle.from(...node.remaining_candidates), 1)
      )
    )

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

    content.append(cls('ctr-neosolving-nextscanstep')
      .append(
        ...this.parent.app.template_resolver.with(...ScanTreeSolving.scan_tree_template_resolvers(node))
          .resolve(ScanTree.getInstruction(node)))
    )

    {
      let triples = node.children.filter(e => e.key.pulse == 3)

      node.children
        .filter((e) => triples.length <= 1 || e.key.pulse != 3)
        .sort(Order.comap(Scans.Pulse.compare, (a) => a.key))
        .forEach((child) => {
          const resolvers = this.parent.app.template_resolver.with(...ScanTreeSolving.scan_tree_template_resolvers(child.value))

          cls("ctr-neosolving-scantreeline")
            .addClass("ctr-clickable")
            .append(
              PulseButton.forPulse(child.key, node.children.map(c => c.key))
                .onClick(() => {
                  this.setNode(child.value)
                })
              ,
              c().append(...resolvers.resolve(
                ScanTree.getInstruction(child.value)
              ))
            )
            .on("click", () => {
              this.setNode(child.value)
            }).appendTo(content)
        })

      if (triples.length > 1) {
        cls("ctr-neosolving-scantreeline")
          .append(
            c().append( // Wrap in another div to allow another margin
              new PulseIcon({different_level: false, pulse: 3}, null)
                .css("margin", "1px")
            ),
            span("at"),
            ...triples
              .sort(Order.comap(Order.natural_order, (c) => spotNumber(node.root.raw, c.value.remaining_candidates[0])))
              .map((child) =>
                PulseButton.forSpot(spotNumber(node.root.raw, child.value.remaining_candidates[0]))
                  .onClick(() => this.setNode(child.value))
              )
          ).appendTo(content)
      }
    }

    this.renderLayer()

    // Setting the path in the path control will in turn trigger the section selected event.
    // This in turn triggers fitting the map, so we do not need to do that here explicitly.
    this.parent.path_control.reset().setPath(node.raw.path, {method: this.method, node})

    // this.fit()
  }

  protected begin() {
    this.parent.layer.scan_layer.setSpots(this.method.method.tree.ordered_spots)
    this.parent.layer.scan_layer.setSpotOrder(this.method.method.tree.ordered_spots)
    this.parent.layer.scan_layer.marker.setRadius(this.method.method.tree.assumed_range, this.method.method.assumptions.meerkats_active)

    this.tree_widget = c().appendTo(this.parent.layer.scantree_container)
    this.layer = leaflet.featureGroup().addTo(this.parent.layer.scan_layer)

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

    this.setNode(this.augmented.root_node)
  }

  protected end() {
    this.tree_widget.remove()
    this.tree_widget = null

    this.parent.layer.scan_layer.marker.setFixedSpot(null)
    this.parent.layer.scan_layer.marker.clearManualMarker()
    this.parent.layer.scan_layer.setSpotOrder(null)

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
