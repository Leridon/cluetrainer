import {Checkbox} from "../../../../lib/ui/controls/Checkbox";
import {C} from "../../../../lib/ui/constructors";
import {ewent} from "../../../../lib/reactive";
import {util} from "../../../../lib/util/util";
import TextField from "../../../../lib/ui/controls/TextField";
import {AbstractDropdownSelection} from "../../widgets/AbstractDropdownSelection";
import {DropdownSelection} from "../../widgets/DropdownSelection";
import {direction} from "../../../../lib/runescape/movement";
import Widget from "../../../../lib/ui/Widget";
import {CursorType} from "../../../../lib/runescape/CursorType";
import NumberInput from "../../../../lib/ui/controls/NumberInput";
import {floor_t, TileCoordinates} from "../../../../lib/runescape/coordinates";
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {GameMapMiniWidget} from "../../../../lib/gamemap/GameMap";
import LightButton from "../../widgets/LightButton";
import {DrawTileAreaInteraction} from "../DrawTileAreaInteraction";
import {ValueInteraction} from "../../../../lib/gamemap/interaction/ValueInteraction";
import InteractionTopControl from "../../map/InteractionTopControl";
import {DrawOffset} from "../../shortcut_editing/interactions/DrawOffset";
import {Transportation} from "../../../../lib/runescape/transportation";
import {TileTransform} from "../../../../lib/runescape/coordinates/TileTransform";
import NumberSlider from "../../../../lib/ui/controls/NumberSlider";
import ButtonRow from "../../../../lib/ui/ButtonRow";
import {NislIcon} from "../../nisl";
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";
import {Vector2} from "../../../../lib/math";
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;

export abstract class ParsingParameter<T = any> {
  constructor(private _default_value: ParsingParameter.P<T>) {}

  default(f: ParsingParameter.P<T>): this {
    this._default_value = f

    return this
  }

  getDefault(loc: PrototypeInstance): T {
    return ParsingParameter.P.apply(this._default_value, loc)
  }

  abstract renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): ParsingParameter.Editor<T>
}

export namespace ParsingParameter {
  import copyUpdate2 = util.copyUpdate2;
  import hboxl = C.hboxl;
  import inlineimg = C.inlineimg;
  import EntityActionMovement = Transportation.EntityActionMovement;
  import spacer = C.spacer;
  import span = C.span;

  export type P<T> = T | ((loc: PrototypeInstance) => T)

  export namespace P {
    export function apply<T>(p: P<T>, loc: PrototypeInstance): T {
      if (typeof p == "function") return (p as ((loc: PrototypeInstance) => T))(loc)
      else return p
    }
  }

  export function bool(): ParsingParameter<boolean> {
    return new class extends ParsingParameter<boolean> {
      constructor() {
        super(() => false)
      }

      override renderForm(depth: number): Editor<boolean> {
        const self = this

        return new class extends ParsingParameter.Editor<boolean> {
          constructor() {
            super(self)
          }

          render_implementation(value: boolean) {
            this.control.append(new Checkbox()
              .onCommit(v => this.commit(v))
              .setValue(value))
          }
        }
      }
    }
  }

  export function int(bounds: P<[number, number]> = [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]): ParsingParameter<number> {
    return new class extends ParsingParameter<number> {
      constructor() {
        super((loc) => Math.max(P.apply(bounds, loc)[0], 0))
      }

      override renderForm(depth: number, loc: PrototypeInstance): Editor<number> {
        const self = this

        return new class extends ParsingParameter.Editor<number> {
          constructor() {
            super(self)
          }

          render_implementation(value: number) {
            const [min, max] = P.apply(bounds, loc)

            if (max - min > 20) {
              this.control.append(new NumberInput(min, max)
                .onCommit(v => this.commit(v))
                .setValue(value))
            } else {
              this.control.append(new NumberSlider(min, max)
                .onCommit(v => this.commit(v))
                .setValue(value))
            }
          }
        }
      }
    }
  }

  export function floor(): ParsingParameter<floor_t> {
    return int([0, 3]) as ParsingParameter<floor_t>
  }

  export function time(): ParsingParameter<number> {
    return int([0, 20]).default(3)
  }

  export function string(): ParsingParameter<string> {

    return new class extends ParsingParameter<string> {
      constructor() {
        super(() => "")
      }

      override renderForm(depth: number): ParsingParameter.Editor<string> {
        const self = this

        return new class extends ParsingParameter.Editor<string> {
          constructor() {
            super(self)
          }

          render_implementation(value: string) {
            this.control.append(new TextField()
              .onCommit(v => this.commit(v))
              .setValue(value))
          }
        }
      }
    }
  }

  export function choose<T>(type_class: P<AbstractDropdownSelection.selectable<T>>, choices: P<T[]>): ParsingParameter<T> {

    return new class extends ParsingParameter<T> {
      constructor() {
        super((loc) => P.apply(choices, loc)[0])
      }

      override renderForm(depth: number, loc: PrototypeInstance): Editor<T> {
        const self = this

        return new class extends ParsingParameter.Editor<T> {
          render_implementation(value: T) {
            this.control.append(new DropdownSelection({type_class: P.apply(type_class, loc)}, P.apply(choices, loc))
              .onSelection(v => this.commit(v))
              .setValue(value))
          }
        }(self)
      }
    }
  }

  export function tileArea2(allow_relative: boolean = true, allow_absolute: boolean = true): ParsingParameter<tileArea2.Area> {

    return (new class extends ParsingParameter<tileArea2.Area> {

      constructor() {
        super(null);
      }

      renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): Editor<tileArea2.Area> {
        const self = this

        const transform = loc.getTransform()
        const inverse_transform = loc.getInverseTransform()

        return new class extends ParsingParameter.Editor<tileArea2.Area> {

          private wip_value: {
            type: "relativetoloc" | "absolute",
            tiles: TileCoordinates[]
          } = null

          interaction: ValueInteraction<any> = null

          render_implementation(value: tileArea2.Area): void {
            this.wip_value = value ? {
              type: value.type,
              tiles: TileArea.activate(value.area).getTiles()
            } : null

            this.update_render()
          }

          private act(type: "relativetoloc" | "absolute") {
            const editor = this

            map.setInteraction(
              this.interaction = (new class extends ValueInteraction<TileCoordinates[]> {
                constructor() {
                  super();

                  let current_tiles = editor.wip_value?.tiles || []

                  if (editor.wip_value?.type == "relativetoloc") {
                    current_tiles = current_tiles.map(t => TileCoordinates.transform(t, transform))
                  }

                  const interact = new DrawTileAreaInteraction(current_tiles)
                    .onPreview(v => this.preview(v))
                    .attachTopControl(null)
                    .addTo(this)

                  this.attachTopControl(new InteractionTopControl({name: "Draw Tile Area"})
                    .setContent(
                      c("<div style='font-family: monospace; white-space:pre'></div>")
                        .append(c().text(`[Shift + Mouse] add tiles, [Alt + Mouse] remove tiles`))
                    ))

                  interact.preview(current_tiles)
                }
              })
                .onPreview(v => {
                  if (v.length > 0) {
                    let new_tiles = v

                    if (type == "relativetoloc") {
                      new_tiles = new_tiles.map(t => TileCoordinates.transform(t, inverse_transform))
                    }

                    this.wip_value = {
                      type: type,
                      tiles: new_tiles
                    }
                  } else {
                    this.wip_value = null
                  }

                  this.update_render()
                })
                .onEnd(() => {
                  this.commitTiles()

                  this.interaction = null
                  this.update_render()
                })
            )
          }

          private commitTiles() {

            if (this.wip_value) {
              this.commit({
                type: this.wip_value.type,
                area: TileArea.fromTiles(this.wip_value.tiles)
              })
            } else {
              this.commit(null)
            }
          }

          private update_render(): void {

            this.control.empty().append(hboxl(
              this.wip_value
                ? span(`${this.wip_value.tiles.length} tiles [${this.wip_value.type == "relativetoloc" ? "rel" : "abs"}]`)
                : span("None"),
              spacer(),
              this.interaction ?
                new ButtonRow()
                  .buttons(
                    new LightButton("Abort")
                      .onClick(() => {
                        this.interaction?.cancel()
                        this.update_render()
                      }),
                    new LightButton("")
                      .append(NislIcon.delete())
                      .onClick(() => {
                        this.wip_value = null
                        this.interaction?.cancel()
                        this.update_render()

                        this.commitTiles()
                      })
                  )
                : new ButtonRow()
                  .buttons(
                    allow_relative ? new LightButton("Rel")
                      .onClick(() => this.act("relativetoloc")) : undefined,

                    allow_absolute ? new LightButton("Abs")
                      .onClick(() => this.act("absolute")) : undefined,

                    new LightButton("")
                      .append(NislIcon.delete())
                      .onClick(() => {
                        this.wip_value = null
                        this.interaction?.cancel()
                        this.update_render()

                        this.commitTiles()
                      })
                  )
            ))
          }
        }(self)
      }
    })
  }

  export namespace tileArea2 {
    export type Area = {
      type: "relativetoloc" | "absolute",
      area: TileArea
    }

    export function translate(instance: PrototypeInstance, area: Area): TileArea {
      if (!area) return null

      switch (area.type) {
        case "absolute":
          return area.area
        case "relativetoloc":
          return TileArea.transform(area.area, instance.getTransform())
      }
    }
  }

  export type Movement = {
    offset?: Transportation.EntityActionMovement.Offset,
    fixed_target?: { target: TileArea, relative?: boolean, origin_only?: boolean }
  }

  export function movement(): ParsingParameter<Movement> {

    return (new class extends ParsingParameter<Movement> {

      constructor() {
        super(null);
      }

      renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): Editor<Movement> {
        const self = this

        const transform = loc.getTransform()
        const inverse_transform = loc.getInverseTransform()

        return new class extends ParsingParameter.Editor<Movement> {
          interaction: ValueInteraction<any> = null

          wip_value: { tiles: TileCoordinates[], relative: boolean, origin_only: boolean } = null

          render_implementation(value: Movement): void {
            this.wip_value = value?.fixed_target ? {
              relative: value.fixed_target.relative,
              origin_only: value.fixed_target.origin_only,
              tiles: TileArea.activate(value.fixed_target.target).getTiles()
            } : null

            this.update_render()
          }

          private startAction(type: "offset" | "relativefixed" | "absolutefixed" | "originonly"): void {
            const editor = this

            if (type == "offset") {
              map.setInteraction(
                new DrawOffset({})
                  .onCommit(v => {
                      this.wip_value = null

                      this.commit({
                        offset: Transportation.EntityActionMovement.Offset.transform(v.offset, inverse_transform.matrix)
                      })

                      this.render()
                    }
                  )
              )
            } else {
              const will_be_relative = type == "relativefixed" || type == "originonly"

              map.setInteraction(
                this.interaction = (new class extends ValueInteraction<TileCoordinates[]> {
                  constructor() {
                    super();

                    let current_tiles = editor.wip_value?.tiles || []

                    if (editor.wip_value?.relative) {
                      current_tiles = current_tiles.map(t => TileCoordinates.transform(t, transform))
                    }

                    const interact = new DrawTileAreaInteraction(current_tiles)
                      .onPreview(v => this.preview(v))
                      .attachTopControl(null)
                      .addTo(this)

                    this.attachTopControl(new InteractionTopControl({name: "Draw Tile Area"})
                      .setContent(
                        c("<div style='font-family: monospace; white-space:pre'></div>")
                          .append(c().text(`[Shift + Mouse] add tiles, [Alt + Mouse] remove tiles`))
                      ))

                    interact.preview(current_tiles)
                  }
                })
                  .onPreview(v => {
                    if (v.length > 0) {
                      let new_tiles = v

                      if (will_be_relative) {
                        new_tiles = new_tiles.map(t => TileCoordinates.transform(t, inverse_transform))
                      }

                      this.wip_value = {
                        relative: will_be_relative,
                        tiles: new_tiles,
                        origin_only: type == "originonly"
                      }
                    } else {
                      this.wip_value = null
                    }
                    this.update_render()
                  })
                  .onEnd(() => {
                    this.commitWIP()

                    this.interaction = null
                    this.update_render()
                  })
              )
            }
          }

          private commitWIP() {
            if (this.wip_value) {
              this.commit({
                fixed_target: {
                  target: TileArea.fromTiles(this.wip_value.tiles),
                  relative: this.wip_value.relative,
                  origin_only: this.wip_value.origin_only
                },
              })
            } else {
              this.commit({offset: {x: 0, y: 0, level: 0}})
            }
          }


          private update_render(): void {
            const offset = this.get()?.offset ?? {x: 0, y: 0, level: 0}

            this.control.empty().append(hboxl(
              this.wip_value
                ? span(`${this.wip_value.tiles.length} tiles [${(this.wip_value.relative ? "rel" : "abs") + (this.wip_value.origin_only ? ", org" : "")}]`)
                : span(`+ (${offset.x} | ${offset.y} | ${offset.level})`),
              spacer(),
              this.interaction ?
                new ButtonRow()
                  .buttons(
                    new LightButton("Abort")
                      .onClick(() => {
                        this.interaction?.cancel()
                        this.update_render()
                      }),
                    new LightButton("")
                      .append(NislIcon.delete())
                      .onClick(() => {
                        this.wip_value = null
                        this.interaction?.cancel()
                        this.update_render()

                        this.commitWIP()
                      })
                  )
                : new ButtonRow()
                  .buttons(
                    new LightButton("Off")
                      .onClick(() => this.startAction("offset")),
                    new LightButton("Rel")
                      .onClick(() => this.startAction("relativefixed")),
                    new LightButton("Abs")
                      .onClick(() => this.startAction("absolutefixed")),
                    new LightButton("Ori")
                      .onClick(() => this.startAction("originonly")),

                    new LightButton("")
                      .append(NislIcon.delete())
                      .onClick(() => {
                        this.wip_value = null
                        this.interaction?.cancel()
                        this.update_render()

                        this.commitWIP()
                      })
                  )
            ))
          }
        }(self)
      }
    })
  }

  export function dir(): ParsingParameter<direction> {
    return choose<direction>({
      toHTML: (v: direction): Widget => c().text(direction.toString(v))
    }, () => direction.all)
  }

  export function tileArea(relative_to_loc: boolean = true): ParsingParameter<TileArea> {
    return (new class extends ParsingParameter<TileArea> {

      constructor() {
        super(TileArea.init({x: 0, y: 0, level: 0}));
      }

      renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): Editor<TileArea> {
        const self = this

        const transform = relative_to_loc ? loc.getTransform() : TileTransform.identity()
        const inverse_transform = relative_to_loc ? loc.getInverseTransform() : TileTransform.identity()

        return new class extends ParsingParameter.Editor<TileArea> {
          edited_tiles: TileCoordinates[]
          interaction: ValueInteraction<any> = null

          render_implementation(value: TileArea): void {
            this.edited_tiles = TileArea.activate(value).getTiles().filter(t => t.x != 0 || t.y != 0)

            this.update_render()
          }

          activate() {
            const editor = this

            if (this.interaction) {
              this.interaction.cancel()
            } else {
              map.setInteraction(
                this.interaction = (new class extends ValueInteraction<TileCoordinates[]> {
                  constructor() {
                    super();

                    new DrawTileAreaInteraction(editor.edited_tiles.map(t => TileCoordinates.transform(t, transform)))
                      .onPreview(v => this.preview(v))
                      .attachTopControl(null)
                      .addTo(this)

                    this.attachTopControl(new InteractionTopControl({name: "Draw Tile Area"})
                      .setContent(
                        c("<div style='font-family: monospace; white-space:pre'></div>")
                          .append(c().text(`[Shift + Mouse] add tiles, [Alt + Mouse] remove tiles`))
                      ))
                  }
                })
                  .onPreview(v => {
                    this.edited_tiles = v.map(t => TileCoordinates.transform(t, inverse_transform))
                    this.update_render()
                  })
                  .onEnd(() => {
                    this.commitTiles()

                    this.interaction = null
                    this.update_render()
                  })
              )

              this.update_render()
            }
          }

          private commitTiles() {
            this.commit(TileArea.fromTiles(this.edited_tiles))
          }

          private update_render(): void {

            this.control.empty().append(hboxl(
              this.edited_tiles.length > 0
                ? c().text(`${this.edited_tiles.length} tiles near ${TileCoordinates.toString(this.edited_tiles[0])}`)
                : c().text(`${this.edited_tiles.length} tiles`),
              new LightButton(this.interaction ? "Stop Editing" : "Edit")
                .onClick(() => {
                  this.activate()
                }),
              new LightButton("Reset")
                .onClick(() => {
                  this.edited_tiles = []
                  this.interaction?.cancel()
                  this.update_render()

                  this.commitTiles()
                })
            ))
          }
        }(self)
      }
    })
  }

  export function rec<T extends Record<string, Rec.Element<any>>>(
    elements: T
  ): ParsingParameter.Rec<T> {
    return new ParsingParameter.Rec(elements)
  }

  export function element<T>(name: string, type: ParsingParameter<T>, optional: boolean = false): Rec.Element<T> {
    return {
      name: name,
      type: type,
      optional: optional,
    }
  }

  export function cursorType(): ParsingParameter<CursorType> {
    return choose<CursorType>(() => ({
      toHTML: (v: CursorType) => {
        let meta = CursorType.meta(v)
        return c(`<div><img style="height: 18px; object-fit: contain; margin-right: 3px" src="${meta.icon_url}" alt="${meta.description}">${meta.description}</div>`)
      }
    }), CursorType.all().map(i => i.type))
  }

  export function customAction() {
    return rec({
      name: element("Name", string()),
      cursor: element("Icon", cursorType())
    })
  }

  export function locAction(): ParsingParameter<{
    id: number
  }> {

    return choose<{ id: number }>((loc) => ({
      toHTML: (v: { id: number }) => {
        const a = loc.prototype.actions[v.id]

        if (!a) return c().text("undefined")

        return hboxl(inlineimg(CursorType.meta(a[1]).icon_url), " ", a[0])
      }
    }), (loc) => loc.prototype.actions.map((a, i) => ({id: i})))
  }

  export function action() {
    return either({
      loc: locAction(),
      custom: customAction(),
    }).default(() => ({
      loc: {
        id: 0
      }
    }) as any)
  }

  export abstract class Editor<T = any, ParT extends ParsingParameter<T> = ParsingParameter<T>> {
    public control = c()
    public additional = c()

    private value: T

    value_changed = ewent<T>()

    constructor(protected type: ParT) {

    }

    activate(): void {

    }

    abstract render_implementation(value: T): void

    render(): void {
      this.control.empty()
      this.additional.empty()

      this.render_implementation(this.value)
    }

    protected commit(v: T) {
      this.value = v
      this.value_changed.trigger(v)
    }

    get(): T {
      return this.value
    }

    set(value: T): this {
      this.value = value
      this.render()

      return this
    }

    onChange(f: (_: T) => void): this {
      this.value_changed.on(f)
      return this
    }

  }

  export class Rec<T extends Record<string, Rec.Element<any>>> extends ParsingParameter<{ [key in keyof T]?: Rec.Element.extr<T[key]> }> {
    constructor(public elements: T) {
      super((loc) => {

        return Object.fromEntries(
          Object.entries(elements).map(([key, value]) => [key, value.optional ? undefined : value.type.getDefault(loc)])
        ) as { [key in keyof T]?: Rec.Element.extr<T[key]> } // There's probably an idiomatic way to get this to typecheck without this cast
      });
    }

    override renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): ParsingParameter.Editor<Record<string, any>> {
      const self = this

      return new class extends ParsingParameter.Editor {
        private elements: Rec.ElementWidget[]

        constructor() {
          super(self)
        }

        render_implementation(value: any) {
          this.elements = Object.entries(self.elements).map(([id, element]) =>
            new Rec.ElementWidget(element, element.optional ? "check" : "none", depth + 1, loc, map)
              .set(value?.[id])
              .onChange(v => {
                this.commit(copyUpdate2(this.get(), e => e[id] = v))
              })
          )

          this.additional.append(...this.elements.map(e => e.additional))
        }
      }
    }
  }

  export namespace Rec {
    import hbox = C.hbox;

    export type Element<T> = {
      name: string,
      type: ParsingParameter<T>
      optional?: boolean
    }

    export namespace Element {
      export type extr<T> = T extends Element<infer Q> ? Q : never
    }


    export class ElementWidget<T = any> extends Editor<T | undefined> {
      checkbox: Checkbox
      sub: Editor<T> = null

      constructor(public element: Element<T>,
                  public cb_type: "none" | "check" | "radio",
                  public depth: number,
                  private loc: PrototypeInstance,
                  private map: GameMapMiniWidget) {
        super(element.type)

        this.additional
          .css("margin-left", "3px")
          .css("padding-left", "3px")
          .css("border-left", `2px solid ${["blue", "purple", "green"][this.depth % 3]}`)
          .css("margin-top", "4px")
          .css("margin-bottom", "4px")
      }

      render_implementation(value: T | undefined) {
        const name_column = c().css("min-width", "100px")

        const control_column = c().css("flex-grow", "1")
        const el_content = c()

        switch (this.cb_type) {
          case "check":
            this.checkbox = new Checkbox(this.element.name, "checkbox")
            break;
          case "radio":
            this.checkbox = new Checkbox(this.element.name, "radio")
            break;
        }

        if (this.checkbox) {
          this.checkbox
            .setValue(value !== undefined)
            .onCommit((v) => {
              if (v != (this.get() !== undefined)) {
                const value = v ? this.element.type.getDefault(this.loc) : undefined

                this.commit(value)
                this.render()

                if (v) this.sub.activate()
              }
            })
            .appendTo(name_column)
        } else {
          name_column.text(this.element.name)
        }

        this.additional.append(
          hbox(name_column, control_column),
          el_content
        )

        this.sub = null

        if (value !== undefined) {
          this.sub = this.element.type
            .renderForm(this.depth + 1, this.loc, this.map)
            .set(value)
            .onChange(v => this.commit(v))

          control_column.append(this.sub.control)
          el_content.append(this.sub.additional)
        }
      }
    }
  }

  export function list<T>(base: ParsingParameter<T>, defaultSize: number = 0): ParsingParameter<T[]> {
    return new class extends ParsingParameter<T[]> {
      constructor() {super(l => new Array(defaultSize).fill(null).map(() => base.getDefault(l)));}

      renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): ParsingParameter.Editor<T[]> {
        const self = this

        return new class extends ParsingParameter.Editor<T[]> {
          private elements: Rec.ElementWidget[]

          constructor() {
            super(self)
          }

          render_implementation(value: T[]) {
            this.control.append(new LightButton("Add")
              .onClick(() => {
                  this.commit(copyUpdate2(this.get(), e => e.push(base.getDefault(loc))))
                  this.render()
                }
              )
            )

            this.elements = value.map((element, i) =>
              new Rec.ElementWidget({
                name: `Item ${i}`,
                type: base
              }, "check", depth + 1, loc, map)
                .set(element)
                .onChange(v => {
                  if (v == undefined) {
                    this.commit(copyUpdate2(this.get(), e => e.splice(i, 1)))
                    this.render()
                  } else {
                    this.commit(copyUpdate2(this.get(), e => e[i] = v))
                  }
                })
            )

            this.additional.append(...this.elements.map(e => e.additional))
          }
        }
      }
    }
  }

  export function either<T extends Record<string, ParsingParameter>>(
    elements: T
  ): ParsingParameter<{ [key in keyof T]?: T[key] }> {

    return new class extends ParsingParameter<{ [key in keyof T]?: T[key] }> {
      constructor() {
        super((loc) => {
          const [key, value] = Object.entries(elements)[0]

          return Object.fromEntries([[key, value.getDefault(loc)]]) as { [key in keyof T]?: T[key] }
        });
      }

      override renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): ParsingParameter.Editor<{ [key in keyof T]?: T[key] }> {
        const self = this

        return new class extends ParsingParameter.Editor {
          private elements: Rec.ElementWidget[]

          group: Checkbox.Group<any>

          constructor() {
            super(self)
          }

          render_implementation(value: any) {
            this.elements = Object.entries(elements).map(([id, element], index) =>
              new Rec.ElementWidget({
                type: element,
                name: id
              }, "radio", depth + 1, loc, map)
                .set(value?.[id])
                .onChange(v => {
                  if (v !== undefined) {
                    this.elements.forEach((e, i) => {
                      if (i != index) e.set(undefined)
                    })
                  }

                  this.commit({[id]: v})
                })
            )

            this.additional.append(...this.elements.map(e => e.additional))
          }
        }
      }
    }
  }

  export function offset(relative_to_loc: boolean = true): ParsingParameter<Transportation.EntityActionMovement.Offset> {
    return new class extends ParsingParameter<{ x: number; y: number; level: number }> {
      renderForm(depth: number, loc: PrototypeInstance, map: GameMapMiniWidget): ParsingParameter.Editor<Transportation.EntityActionMovement.Offset> {
        const transform = loc.getTransform()
        const inverse_transform = loc.getInverseTransform()

        return new class extends ParsingParameter.Editor<Transportation.EntityActionMovement.Offset> {
          transformed_value: Transportation.EntityActionMovement.Offset

          render_implementation(value: Transportation.EntityActionMovement.Offset): void {
            this.transformed_value = relative_to_loc
              ? Transportation.EntityActionMovement.Offset.transform(value, transform.matrix)
              : value

            this.control.append(
              hboxl(
                new NumberInput(-6400, 6400).setValue(this.transformed_value.x)
                  .onCommit(v => this.save(copyUpdate2(this.transformed_value, e => e.x = v))),
                " | ",
                new NumberInput(-6400, 6400).setValue(this.transformed_value.y)
                  .onCommit(v => this.save(copyUpdate2(this.transformed_value, e => e.y = v))),
                " | ",
                new NumberInput(-3, 3).setValue(this.transformed_value.level)
                  .onCommit(v => this.save(copyUpdate2(this.transformed_value, e => e.level = v))),
                new LightButton("Draw").onClick(() => {
                  map.setInteraction(new DrawOffset({})
                    .onCommit(v => {
                        this.save(v.offset)
                        this.render()
                      }
                    )
                  )
                })
              )
            )
          }

          save(offset: EntityActionMovement.Offset) {
            this.transformed_value = offset

            const saved_value = relative_to_loc
              ? Transportation.EntityActionMovement.Offset.transform(offset, inverse_transform.matrix)
              : offset

            this.commit(saved_value)
          }
        }(this)
      }
    }({x: 0, y: 0, level: 0})
  }
}