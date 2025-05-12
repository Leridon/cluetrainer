import {TileCoordinates} from "../../../../lib/runescape/coordinates";
import Behaviour, {SingleBehaviour} from "../../../../lib/ui/Behaviour";
import {lazy, Lazy} from "../../../../lib/Lazy";
import * as leaflet from "leaflet";
import {EquivalenceClass, ScanEquivalenceClasses, ScanEquivalenceClassOptions} from "../../../../lib/cluetheory/scans/EquivalenceClasses";
import {areaToPolygon} from "../../polygon_helpers";
import {type ClueTrainer} from "../../../ClueTrainer";
import {AdaptiveScanRadiusMarker, ScanRegionPolygon} from "../../neosolving/ScanLayer";
import {PathEditor} from "../../../pathedit/PathEditor";
import {OpacityGroup} from "../../../../lib/gamemap/layers/OpacityLayer";
import {ewent, Observable, observe} from "../../../../lib/reactive";
import {InteractionGuard} from "../../../../lib/gamemap/interaction/InteractionLayer";
import {Path} from "../../../../lib/runescape/pathing";
import {GameMapControl} from "../../../../lib/gamemap/GameMapControl";
import ScanTools from "./ScanTools";
import {C} from "../../../../lib/ui/constructors";
import {Clues} from "../../../../lib/runescape/clues";
import {ScanTree} from "../../../../lib/cluetheory/scans/ScanTree";
import {AugmentedMethod} from "../../../model/MethodPackManager";
import {SolvingMethods} from "../../../model/methods";
import Widget from "../../../../lib/ui/Widget";
import TreeEdit from "./TreeEdit";
import MethodSubEditor from "../MethodSubEditor";
import * as lodash from "lodash";
import MethodEditor from "../MethodEditor";
import {PathStepEntity} from "../../map/entities/PathStepEntity";
import {GameLayer} from "../../../../lib/gamemap/GameLayer";
import {MapEntity} from "../../../../lib/gamemap/MapEntity";
import {Rectangle, Vector2} from "../../../../lib/math";
import {Scans} from "../../../../lib/runescape/clues/scans";
import {levelIcon} from "../../../../lib/gamemap/GameMap";
import Properties from "../../widgets/Properties";
import {TextRendering} from "../../TextRendering";
import {GameMapContextMenuEvent} from "../../../../lib/gamemap/MapEvents";
import {FormModal} from "../../../../lib/ui/controls/FormModal";
import NumberInput from "../../../../lib/ui/controls/NumberInput";
import {BigNisButton} from "../../widgets/BigNisButton";
import {Menu} from "../../widgets/ContextMenu";
import {NisModal} from "../../../../lib/ui/NisModal";

import ControlWithHeader from "../../map/ControlWithHeader";
import AugmentedScanTree = ScanTree.Augmentation.AugmentedScanTree;
import AugmentedScanTreeNode = ScanTree.Augmentation.AugmentedScanTreeNode;
import ScanTreeNode = ScanTree.ScanTreeNode;
import ScanRegion = ScanTree.ScanRegion;
import ScanTreeMethod = SolvingMethods.ScanTreeMethod;
import ClueAssumptions = SolvingMethods.ClueAssumptions;
import {ClueTrainerWiki} from "../../../wiki";

export class ScanEditLayer extends GameLayer {
  marker: AdaptiveScanRadiusMarker

  private markers: ScanEditLayer.MarkerPair[] = []

  constructor(private spots: TileCoordinates[]) {
    super();

    this.marker = new AdaptiveScanRadiusMarker().addTo(this)

    this.setSpots(spots)
  }

  setSpots(spots: TileCoordinates[]): this {
    this.markers.forEach(m => {
      m.regular.remove()
      m.complement.remove()
    })

    this.markers = spots.map(s => new ScanEditLayer.MarkerPair(s))

    this.markers.forEach((m, i) => {
      m.regular.addTo(this)
      m.complement.addTo(this)
    })

    if (spots.length > 0) this.marker.setComplementByExampleSpot(spots[0])

    return this
  }

  setActiveCandidates(coords: TileCoordinates[]) {
    this.markers.forEach(m => m.setActive(coords.some(c => TileCoordinates.eq2(c, m.spot))))
  }

  getMarker(coords: TileCoordinates): ScanEditLayer.MarkerPair {
    return this.markers.find(m => TileCoordinates.eq2(m.spot, coords))
  }

  setSpotOrder(order: TileCoordinates[] | null) {
    if (order) {
      order.forEach((spot, i) => {
        this.getMarker(spot)?.setNumber(i + 1)
      })
    } else {
      this.markers.forEach(m => m.setNumber(null))
    }
  }

  setTiming(timing: AugmentedScanTree["state"]["timing_analysis"]) {
    this.markers.forEach(m => {
      m.setTiming(timing.spots.find(t => TileCoordinates.eq(t.spot, m.spot)))
    })
  }
}

export namespace ScanEditLayer {

  import render_digspot = TextRendering.render_digspot;
  import complementSpot = Scans.complementSpot;
  import span = C.span;
  import inlineimg = C.inlineimg;
  import cls = C.cls;

  export class MarkerPair {
    regular: SpotMarker
    complement: SpotMarker

    constructor(public spot: TileCoordinates) {
      this.regular = new ScanEditLayer.SpotMarker(spot, false)
      this.complement = new ScanEditLayer.SpotMarker(spot, true)
    }

    setNumber(n: number) {
      this.regular.setNumber(n)
      this.complement.setNumber(n)
    }

    setActive(v: boolean) {
      const opacity = v ? 1 : 0.2

      this.regular.opacity.set(opacity)
      this.complement.opacity.set(opacity)
    }


    setTiming(timing: AugmentedScanTree["state"]["timing_analysis"]["spots"][number]) {
      this.regular.setTiming(timing)
      this.complement.setTiming(timing)
    }
  }

  export class SpotMarker extends MapEntity {
    spot_on_map: TileCoordinates = null
    private number: number = undefined
    timing_information: AugmentedScanTree["state"]["timing_analysis"]["spots"][number]

    constructor(public spot: TileCoordinates,
                public is_complement: boolean
    ) {
      super();

      this.setInteractive()

      this.spot_on_map = is_complement ? complementSpot(spot) : spot

      this.setTooltip(async () => {
        const props = new Properties()

        if (this.is_complement) {
          props.header(c().append("Complement of Spot ", render_digspot(this.number)))
        } else {
          props.header(c().append("Spot ", render_digspot(this.number)))
        }

        if (this.is_complement) {
          props.row(cls("ctr-step-properties-explanation")
            .append(
              inlineimg("/assets/icons/info.png"),
              " This is the complement of a dig spot. Right click to learn more about complement spots.",
            ))
        }

        if (this.timing_information) {
          let timing = c()

          this.timing_information.timings.forEach((t, i) => {
            if (i != 0) timing.append(" | ")

            let s = span(t.ticks.toFixed(2) + " ticks")

            if (t.incomplete) s.css("color", "yellow").tooltip("Incomplete path")

            timing.append(s)
          })

          const any_incomplete = this.timing_information.timings.some(t => t.incomplete)

          if (this.timing_information.timings.length > 1) {
            const avg = span(this.timing_information.average.toFixed(2) + " ticks")

            if (any_incomplete) avg.css("color", "yellow").tooltip("Incomplete path")

            timing.append(", Average ", avg)
          }

          props.named("Expected time", timing)

          if (any_incomplete) {
            props.row(c().css("font-style", "italic").text("Timings in yellow are from incomplete branches."))
          }
        }

        return props
      })
    }

    bounds(): Rectangle {
      return Rectangle.from(this.spot_on_map)
    }

    protected async render_implementation(props: MapEntity.RenderProps): Promise<Element> {
      const marker = leaflet.marker(Vector2.toLatLong(this.spot_on_map), {
        icon: levelIcon(this.spot.level, props.highlight ? 1.5 : 1),
        opacity: props.opacity
      }).addTo(this)

      if (this.number) {

        marker.bindTooltip(leaflet.tooltip({
            content: this.number.toString(),
            className: "spot-number-on-map",
            offset: [0, 10],
            permanent: true,
            direction: "center",
            opacity: props.opacity
          })
        )
      }

      return marker.getElement()
    }

    setNumber(n: number) {
      this.number = n

      this.render(true)
    }

    setTiming(timing: AugmentedScanTree["state"]["timing_analysis"]["spots"][number]) {
      this.timing_information = timing
    }

    async contextMenu(event: GameMapContextMenuEvent): Promise<Menu | null> {
      if (this.is_complement) {
        event.addForEntity({
          type: "basic",
          text: "About complement spots",
          handler: () => {
            ClueTrainerWiki.openOnPage("toofardifferentlevel")
          }
        })
      }

      return {
        type: "submenu",
        text: () => c().append("Spot ", render_digspot(this.number)),
        children: []
      }
    }
  }
}

type T = {
  options: Observable<ScanEquivalenceClassOptions>,
  layer: Observable<Lazy<leaflet.FeatureGroup>>
}

class EquivalenceClassHandling extends Behaviour {
  equivalence_classes: T[] = []

  constructor(private parent: ScanEditor) {
    super();
  }

  private render_equivalence_classes(ecs: ScanEquivalenceClasses): leaflet.FeatureGroup {
    let layer = leaflet.featureGroup()

    ecs.equivalence_classes.map((c) => {
      let color = Math.abs(c.information_gain - ecs.max_information) < 0.01
        ? "blue"
        : `rgb(${255 * (1 - (c.information_gain / ecs.max_information))}, ${255 * c.information_gain / ecs.max_information}, 0)`

      let polygon = leaflet.featureGroup()

      areaToPolygon(
        ecs.raster,
        (p: EquivalenceClass) => p.id == c.id,
        c.area[0]
      ).setStyle({
        color: "black",
        opacity: 1,
        weight: 3,
        fillOpacity: 0.25,
        fillColor: color
      }).addTo(polygon)

      leaflet.marker(polygon.getBounds().getCenter(), {
        icon: leaflet.divIcon({
          iconSize: [50, 20],
          className: "equivalence-class-information",
          html: `${c.information_gain.toFixed(2)}b`,
        }),
      }).addTo(polygon)

      return polygon
    }).forEach(p => layer.addLayer(p))

    return layer
  }

  protected begin() {
    let self = this

    function setup(o: ScanEquivalenceClassOptions,
                   visibility: Observable<boolean>
    ): T {
      let options = observe(o)
      let layer = options.map(o => lazy(() => self.render_equivalence_classes(new ScanEquivalenceClasses(o))))

      layer.subscribe((l, old) => {
        if (old.hasValue()) self.parent.layer.removeLayer(old.get())
        if (visibility.value()) self.parent.layer.addLayer(l.get())
      })

      visibility.subscribe(v => {
        if (v) self.parent.layer.addLayer(layer.value().get())
        else if (layer.value().hasValue()) self.parent.layer.removeLayer(layer.value().get())
      })

      return {
        options: options,
        layer: layer,
      }
    }

    let normal = setup({
      candidates: this.parent.value.clue.clue.spots,
      range: this.parent.builder.tree.assumed_range,
      complement: false,
      floor: this.parent.app.map.floor.value()
    }, this.parent.tools.normal)

    const complement = setup({
      candidates: this.parent.value.clue.clue.spots,
      range: this.parent.builder.tree.assumed_range,
      complement: true,
      floor: this.parent.app.map.floor.value()
    }, this.parent.tools.complement)

    this.equivalence_classes = [normal, complement]

    this.parent.app.map.floor
      .subscribe(f => this.equivalence_classes.forEach(t => t.options.update(o => o.floor = f)))

    this.parent.candidates_at_active_node
      .subscribe(cs => this.equivalence_classes.forEach(t => t.options.update(o => o.candidates = cs)))
  }

  protected end() {
    this.equivalence_classes.forEach(e => {
      if (e.layer.value().hasValue()) e.layer.value().get().remove()
    })

    this.equivalence_classes = []
  }
}

export class ScanTreeBuilder {
  tree: ScanTree.ScanTree = null
  augmented: Observable<AugmentedScanTree> = observe(null)
  preview_invalid = ewent()

  assumptions: Observable<ClueAssumptions> = observe<ClueAssumptions>({}).equality(
    (a: ClueAssumptions, b: ClueAssumptions) => {
      return a.meerkats_active == b.meerkats_active
        && a.mobile_perk == b.mobile_perk
        && a.double_escape == b.double_escape
        && a.double_surge == b.double_surge
    })

  order_changed = ewent<TileCoordinates[]>()

  any_change = ewent<null>()

  constructor(private clue: Clues.Scan) {
    this.assumptions.subscribe((v) => {
      this.cleanTree()
    })
  }

  public async cleanTree() {
    if (!this.tree) return

    this.tree.assumed_range = this.clue.range + (this.assumptions.value().meerkats_active ? 5 : 0)

    this.augmented.set(await ScanTree.Augmentation.augment({
        augment_paths: true,
        analyze_completeness: true,
        analyze_correctness: true,
        analyze_timing: true,
        path_assumptions: this.assumptions.value()
      },
      ScanTree.normalize(this.tree),
      this.clue
    ));

    this.preview_invalid.trigger(null)
  }

  set(tree: ScanTree.ScanTree) {
    this.tree = tree
    this.cleanTree()
  }

  setRegion(node: ScanTreeNode, region: ScanRegion) {
    this.updateNode(node, n => n.region = region)
  }

  updateNode(node: ScanTreeNode, updater: (_: ScanTreeNode) => void) {
    updater(node)

    this.cleanTree()

    this.any_change.trigger(null)
  }

  setPath(node: ScanTreeNode, path: Path.raw) {
    this.updateNode(node, n => n.path = path)
  }

  setOrder(order: TileCoordinates[]) {
    this.tree.ordered_spots = order

    this.order_changed.trigger(order)
  }
}

class PreviewLayerControl extends Behaviour {
  private layer: OpacityGroup

  constructor(public parent: ScanEditor) {super();}

  private path_layer: OpacityGroup = null

  protected begin() {
    this.layer = new OpacityGroup().addTo(this.parent.layer)

    // Render path preview
    this.parent.tree_edit.active.subscribe(() => this.updatePreview(), true)
    this.parent.builder.preview_invalid.on(() => this.updatePreview())
  }

  private async updatePreview() {
    let a = this.parent.tree_edit.active_node.value()

    let layer = new OpacityGroup()

    if (a) {
      for (const n of AugmentedScanTree.collect_parents(a, true)) {

        const area = ScanTree.getTargetRegion(n)

        if (area) {
          this.parent.tree_edit.getNode(n).region_preview = new ScanRegionPolygon(area).addTo(layer)
        }

        if (n != a) PathStepEntity.renderPath(n.raw.path).addTo(layer);
      }

    } else {
      if (this.parent.tree_edit.root_widget) {
        AugmentedScanTree.traverse(this.parent.tree_edit.root_widget.node, async (n) => {

          const area = ScanTree.getTargetRegion(n)

          if (area?.area) {
            this.parent.tree_edit.getNode(n).region_preview = new ScanRegionPolygon(area).addTo(layer)
          }

          return PathStepEntity.renderPath(n.raw.path).addTo(layer)
        }, true)
      }
    }

    if (this.path_layer) this.path_layer.remove()

    this.path_layer = layer.addTo(this.layer)
  }

  protected end() { }
}

export default class ScanEditor extends MethodSubEditor {

  public builder: ScanTreeBuilder
  candidates_at_active_node: Observable<TileCoordinates[]>

  layer: ScanEditLayer
  interaction_guard: InteractionGuard
  tree_edit: TreeEdit
  tools: ScanTools

  equivalence_classes: EquivalenceClassHandling
  preview_layer: PreviewLayerControl

  path_editor: SingleBehaviour<PathEditor>

  constructor(
    public parent: MethodEditor,
    public app: ClueTrainer,
    public value: AugmentedMethod<ScanTreeMethod, Clues.Scan>,
    public side_panel: Widget
  ) {
    super(parent);

    this.builder = new ScanTreeBuilder(value.clue.clue)
    this.builder.assumptions.set(lodash.cloneDeep(value.method.assumptions))

    this.builder.augmented.subscribe((t) => {
      this.layer.setTiming(t.state.timing_analysis)
    })

    this.builder.any_change.on(() => {
      this.parent.registerChange()
    })

    this.builder.order_changed.on((order) => {
      this.layer.setSpotOrder(order)
    })

    this.layer = new ScanEditLayer(value.clue.clue.spots)

    this.layer.marker.setClickable(true)

    const self = this

    this.layer.add(new class extends GameLayer {
      eventContextMenu(event: GameMapContextMenuEvent) {
        event.onPre(() => {
          if (event.active_entity instanceof ScanEditLayer.SpotMarker) {
            const spot = event.active_entity.spot

            event.addForEntity({
              type: "basic",
              text: "Set spot number",
              handler: async () => {
                const id = await (new class extends FormModal<number> {
                  input: NumberInput

                  constructor() {
                    super({size: "small"});

                    this.title.set("Set spot number")
                  }

                  render() {
                    super.render();

                    const props = new Properties().appendTo(this.body)

                    props.named("New Spot Number", this.input = new NumberInput(1, self.value.clue.clue.spots.length)
                      .setValue(self.builder.tree.ordered_spots.findIndex(c => TileCoordinates.eq(c, spot)) + 1)
                    )

                    this.input.raw().focus()
                  }

                  getButtons(): BigNisButton[] {
                    return [
                      new BigNisButton("Cancel", "cancel").onClick(() => this.cancel()),
                      new BigNisButton("Save", "confirm").onClick(() => this.confirm(this.input.get() - 1)),
                    ]
                  }

                  protected getValueForCancel(): number {
                    return undefined
                  }
                }).do()

                if (id !== undefined) {

                  const old = lodash.clone(self.builder.tree.ordered_spots)
                  const old_id = old.findIndex(c => TileCoordinates.eq(spot, c))

                  const tmp = old[id]
                  old[id] = old[old_id]
                  old[old_id] = tmp

                  self.builder.setOrder(old)
                }
              }
            })
          }
        })
      }
    })

    this.interaction_guard = new InteractionGuard().setDefaultLayer(this.layer)

    this.equivalence_classes = this.withSub(new EquivalenceClassHandling(this))
    this.preview_layer = this.withSub(new PreviewLayerControl(this))
    this.path_editor = this.withSub(new SingleBehaviour<PathEditor>())

    this.assumptions.subscribe((v) => {
      this.value.method.tree.assumed_range = this.value.clue.clue.range + (v.meerkats_active ? 5 : 0)

      this.builder.assumptions.set(lodash.cloneDeep(v))

      this.layer.marker.setRadius(this.value.method.tree.assumed_range, v.meerkats_active)
    })

    this.builder.augmented.subscribe(a => {
      this.value.method.expected_time = a.state.timing_analysis.average + 1 // + 1 Tick because digging isn't included in the path analysis
    })
  }

  private setPathEditor(node: AugmentedScanTreeNode): void {
    this.path_editor.set(new PathEditor(this.layer.marker,  // This is a horrible hack to ensure correct event priority
      this.app.template_resolver, {
        initial: node.path.raw,

        target: node.path.target,
        start_state: node.path.pre_state,
        discard_handler: () => {},
        commit_handler: (p) => {
          this.builder.setPath(node.raw, p)
        }
      }, false)
      .onStop(() => {
        if (this.tree_edit.active_node.value() == node) this.tree_edit.requestActivation(null)
      })
    )
  }

  begin() {
    super.begin()

    this.layer.setSpotOrder(this.value.method.tree.ordered_spots)

    new GameMapControl({
        position: "top-right",
        type: "floating"
      },
      new ControlWithHeader("Scan Tools")
        .setContent(
          this.tools = new ScanTools(this),
        )
    ).addTo(this.layer)

    this.builder.set(this.value.method.tree)

    c("<div style='font-weight: bold; text-align: center'>Scan Tree</div>").appendTo(this.side_panel)

    this.tree_edit = new TreeEdit(this, this.builder.tree.root)
      .css("overflow-y", "auto").appendTo(this.side_panel)

    this.candidates_at_active_node = this.tree_edit.active
      .map(n => n ? n.node.remaining_candidates : this.value.clue.clue.spots)

    this.candidates_at_active_node.subscribe(n => {
      this.layer.setActiveCandidates(n)
    })

    this.app.map.addGameLayer(this.layer)

    this.tree_edit.active_node.subscribe(async node => {
      if (node) this.setPathEditor(node)
      else this.path_editor.set(null)
    })
  }

  end() {
    this.layer.remove()
    this.tree_edit.remove()
  }

  setSpotOrder(order: TileCoordinates[]) {

    this.value.method.tree.ordered_spots
  }
}