import Widget from "../../../lib/ui/Widget";
import {Observable, observe} from "../../../lib/reactive";
import {Transportation} from "../../../lib/runescape/transportation";
import {ShortcutEditGameLayer, ShortcutEditor} from "./ShortcutEditor";
import {InteractionGuard} from "../../../lib/gamemap/interaction/InteractionLayer";
import {SmallImageButton} from "../widgets/SmallImageButton";
import {C} from "../../../lib/ui/constructors";
import {ShortcutViewLayer} from "./ShortcutView";
import ShortcutPolygon = ShortcutViewLayer.ShortcutPolygon;
import vbox = C.vbox;

export class ShortcutEdit extends Widget {
  private header: Widget
  private body: Widget

  constructor(public config: {
                value: Observable<Transportation.Transportation>,
                ovalue?: ShortcutEditor.OValue,
                edit_layer?: ShortcutEditGameLayer,
                interaction_guard: InteractionGuard,
                associated_preview: ShortcutPolygon,
                centered_handler: (s: Transportation.Transportation) => any,
                collapsible: boolean,
                single_action?: boolean
              } = null
  ) {
    super(vbox());

    this.init(vbox(
      this.header = vbox(),
      this.body = vbox()
    )).addClass("ctr-shortcut-edit")

    if (this.config.collapsible) this.body.css("display", "none")

    this.config.value.subscribe(() => this.render(), true)
  }

  static forSimple(shortcut: Transportation.Transportation,
                   guard: InteractionGuard,
                   centered_handler: (s: Transportation.Transportation) => any = null
  ) {
    return new ShortcutEdit({
        value: observe(shortcut),
        ovalue: null,
        edit_layer: null,
        interaction_guard: guard,
        associated_preview: null,
        centered_handler: centered_handler,
        collapsible: false,
        single_action: true
      }
    )
  }

  static forEditor(shortcut: ShortcutEditor.OValue,
                   edit_layer: ShortcutEditGameLayer,
                   centered_handler: (s: Transportation.Transportation) => any
  ): ShortcutEdit {
    return new ShortcutEdit({
        value: shortcut,
        ovalue: shortcut,
        edit_layer: edit_layer,
        interaction_guard: edit_layer.interactionGuard,
        associated_preview: edit_layer.view.getView(shortcut),
        centered_handler: centered_handler,
        collapsible: true
      }
    )
  }

  private render() {
    this.header.empty()
    this.body.empty()

    /*

    let header = hbox(
        span(Transportation.name(this.config.value.value())),
        spacer(),
        sibut("/assets/icons/move.png", () => {
            this.config.interaction_guard.set(new PlaceShortcut(this.config.value.value(), TileRectangle.center(Transportation.bounds(this.config.value.value())), null)
                .onCommit(n => this.config.value.set(Object.assign(n)))
                .onStart(() => this.config.associated_preview?.setOpacity(0))
                .onEnd(() => this.config.associated_preview?.setOpacity(1))
            )
        }).setEnabled(!this.config.ovalue?.value()?.is_builtin),
        sibut("/assets/icons/copy.png", () => this.config.edit_layer.startPlacement(this.config.value.value())).setEnabled(!!this.config.edit_layer),
        sibut("/assets/icons/delete.png", () => this.config.ovalue.remove()).setEnabled(this.config.ovalue && !this.config.ovalue.value().is_builtin),
        sibut("/assets/icons/fullscreen.png", () => this.config.centered_handler(this.config.value.value())).setEnabled(!!this.config.centered_handler),
    )
        .addClass('ctr-shortcut-edit-header')
        .appendTo(this.header)

    if (this.config.collapsible) {
        header.container.on("click", () => this.body.container.animate({"height": "toggle"}))
        header.css("cursor", "pointer")
    }

    let props = new Properties()

    let v = this.config.value.value()

    props.named("Name", new TextField()
        .setValue(v.name)
        .onCommit(v => {
            this.config.value.update(o => o.name = v)
        }))

    switch (v.type) {
        case "door": {
            props.named("Bounds",
                c("<div style='display: flex'></div>")
                    .append(c("<span style='margin-right: 5px;'></span>").setInnerHtml(`Door (${direction.toString(v.direction)}) at ${TileCoordinates.toString(v.position)}`))
                    .append(c().css("flex-grow", "1"))
                    .append(
                        new LightButton("Select")
                            .onClick(() => {
                                this.config.interaction_guard.set(
                                    new DrawDoor({
                                        done_handler: (new_v) => {
                                            this.config.value.update(() => {
                                                assert(v.type == "door")
                                                v.position = new_v.position
                                                v.direction = new_v.direction
                                            })
                                        }
                                    })
                                        .onStart(() => { this.config.associated_preview?.setOpacity(0) })
                                        .onEnd(() => this.config.associated_preview?.setOpacity(1))
                                        .attachTopControl(new InteractionTopControl().setName("Selecting interactive area").setText("Click and drag a rectangle around the area where this interaction can be triggered from."))
                                )
                            })))

        }
            break;
        case "entity": {
            props.named("Click-Area",
                c("<div style='display: flex'></div>")
                    .append(c("<span style='margin-right: 5px;'></span>").text(`${Rectangle.width(v.clickable_area)}x${Rectangle.height(v.clickable_area)} at ${TileCoordinates.toString(TileRectangle.bl(v.clickable_area))}`))
                    .append(c().css("flex-grow", "1"))
                    .append(
                        new LightButton("Select")
                            .onClick(() => {

                                    this.config.interaction_guard.set(
                                        new GameMapDragAction({
                                            preview_render: (area) => {
                                                let copy = lodash.cloneDeep(this.config.value.value())
                                                assert(copy.type == "entity")

                                                copy.clickable_area = TileRectangle.extend(area, 0.5)

                                                return new ShortcutPolygon(observe(copy))
                                            }
                                        })
                                            .preview((() => {
                                                assert(v.type == "entity");
                                                return TileRectangle.extend(v.clickable_area, -0.5)
                                            })())
                                            .onStart(() => { this.config.associated_preview?.setOpacity(0) })
                                            .onEnd(() => this.config.associated_preview?.setOpacity(1))
                                            .onCommit(a => {
                                                this.config.value.update(v => {
                                                    assert(v.type == "entity")
                                                    v.clickable_area = TileRectangle.extend(a, 0.5)
                                                })
                                            })
                                            .attachTopControl(new InteractionTopControl().setName("Selecting clickable area").setText("Click and drag a rectangle around the area that is clickable for this entity."))
                                    )
                                }
                            ))
            )

            v.actions.forEach((action, action_i) => {
                props.row(
                    c("<div style='display: flex'></div>")
                        .append(c(`<div class='nisl-property-header' style="flex-grow: 1">Action #${action_i + 1}: ${action.name}</div>`))
                        .append(SmallImageButton.new("/assets/icons/delete.png")
                            .setEnabled(!this.config.single_action)
                            .onClick(() => {
                                this.config.value.update(v => {
                                    assert(v.type == "entity")
                                    v.actions.splice(v.actions.indexOf(action), 1)
                                })
                            })))

                props.named("Name", new TextField()
                    .setValue(action.name)
                    .onCommit(v => {
                        this.config.value.update(() => action.name = v)
                    }))

                props.named("Cursor", new InteractionSelect()
                    .setValue(action.cursor)
                    .onSelection((v) => {
                        this.config.value.update(() => action.cursor = v)
                    })
                )
                props.named("Ticks", new NumberInput(0, 100)
                    .setValue(action.time)
                    .onCommit((v) => this.config.value.update(() => action.time = v))
                )
                props.named("Area",
                    c("<div style='display: flex'></div>")
                        .append(c("<span style='margin-right: 5px;'></span>").text(`${Rectangle.tileWidth(action.interactive_area)}x${Rectangle.tileHeight(action.interactive_area)} at ${TileCoordinates.toString(TileRectangle.bl(action.interactive_area))}`))
                        .append(c().css("flex-grow", "1"))
                        .append(
                            new LightButton("Select")
                                .onClick(() => {

                                    this.config.interaction_guard.set(
                                        new GameMapDragAction({
                                            preview_render: (area) => {
                                                let copy = lodash.cloneDeep(this.config.value.value())
                                                assert(copy.type == "entity")
                                                copy.actions[action_i].interactive_area = area
                                                return new ShortcutPolygon(observe(copy))
                                            }
                                        })
                                            .preview(action.interactive_area)
                                            .onStart(() => { this.config.associated_preview?.setOpacity(0) })
                                            .onEnd(() => this.config.associated_preview?.setOpacity(1))
                                            .onCommit(a => this.config.value.update(() => action.interactive_area = a))
                                            .attachTopControl(new InteractionTopControl().setName("Selecting interactive area").setText("Click and drag a rectangle around the area where this interaction can be triggered from."))
                                    )
                                })))
                props.named("Targeting", new DropdownSelection<"offset" | "fixed">({
                        type_class: {
                            toHTML: (v: string) => c().text(lodash.capitalize(v))
                        }
                    }, ["offset", "fixed"])
                        .setValue(action.movement.type)
                        .onSelection((v) => {
                            switch (v) {
                                case "offset": {
                                    this.config.value.update(() => {
                                        if (action.movement.type == "fixed") {
                                            action.movement = {
                                                type: "offset",
                                                offset: {...Vector2.sub(action.movement.target, Rectangle.center(action.interactive_area)), level: action.movement.target.level}
                                            }
                                        }
                                    })
                                    break;
                                }
                                case "fixed": {
                                    this.config.value.update(() => {
                                        if (action.movement.type == "offset") {
                                            action.movement = {
                                                type: "fixed",
                                                target: TileCoordinates.lift(
                                                    Vector2.add(action.movement.offset, Rectangle.center(action.interactive_area)),
                                                    floor_t.clamp(action.interactive_area.level + action.movement.offset.level)
                                                ),
                                                relative: false
                                            }
                                        }
                                    })

                                    break;
                                }
                            }
                        })
                )

                switch (action.movement.type) {
                    case "offset":
                        props.named("Offset",
                            c("<div style='display: flex'></div>")
                                .append(c("<span style='margin-right: 5px;'></span>")
                                    .text(`${action.movement.offset.x}|${action.movement.offset.y}, Level ${util.signedToString(action.movement.offset.level)}`)
                                )
                                .append(c().css("flex-grow", "1"))
                                .append(
                                    new LightButton("Draw")
                                        .onClick(() => {
                                            this.config.interaction_guard.set(
                                                new DrawOffset({
                                                    preview_render: (offset) => {
                                                        let copy = lodash.cloneDeep(this.config.value.value())

                                                        assert(copy.type == "entity")
                                                        let a = copy.actions[action_i]
                                                        assert(a.movement.type == "offset")
                                                        a.movement.offset = offset.offset
                                                        return new ShortcutPolygon(observe(copy))
                                                    }
                                                }, action.interactive_area)
                                                    .preview((() => {
                                                        assert(action.movement.type == "offset")
                                                        return {origin: TileRectangle.center(action.interactive_area), offset: action.movement.offset}
                                                    })())
                                                    .onStart(() => { this.config.associated_preview?.setOpacity(0) })
                                                    .onEnd(() => this.config.associated_preview?.setOpacity(1))
                                                    .onCommit((v) => {
                                                        this.config.value.update(() => {
                                                            assert(action.movement.type == "offset")
                                                            action.movement.offset = v.offset
                                                        })
                                                    })
                                            )
                                        })
                                ))
                        break

                    case "fixed":
                        let target_thing = c()

                        target_thing.append(new MapCoordinateEdit(
                                action.movement.target,
                                () => this.config.interaction_guard.set(new SelectTileInteraction({
                                        preview_render: (target) => {
                                            let copy = lodash.cloneDeep(this.config.value.value())
                                            assert(copy.type == "entity")
                                            let a = copy.actions[action_i]
                                            assert(a.movement.type == "fixed")
                                            a.movement.target = target

                                            return new ShortcutPolygon(observe(copy))
                                        }
                                    })
                                        .preview((() => {
                                            assert(action.movement.type == "fixed");
                                            return action.movement.target
                                        })())
                                        .onStart(() => { this.config.associated_preview?.setOpacity(0) })
                                        .onEnd(() => this.config.associated_preview?.setOpacity(1))
                                        .attachTopControl(new InteractionTopControl().setName("Selecting tile").setText("Select the target of this map connection."))
                                )).onCommit((v) => {
                                this.config.value.update(() => {
                                    assert(action.movement.type == "fixed")
                                    action.movement.target = v
                                })
                            })
                        )

                        target_thing.append(C.hbox(
                                new Checkbox().setValue(action.movement.relative)
                                    .onCommit((v) => {
                                        this.config.value.update(() => {
                                            assert(action.movement.type == "fixed")
                                            action.movement.relative = v
                                        })
                                    }),
                                C.span("Relative to shortcut?").tooltip("If checked, the target will move and rotate with the shortcut.")
                            )
                        )

                        props.named("Target", target_thing)

                        break
                }

                let orientation_dropdown = new DropdownSelection<Transportation.transport_orientation_type>({
                    type_class: {
                        toHTML: (v: Transportation.transport_orientation_type) => {
                            switch (v.type) {
                                case "byoffset":
                                    return span("By movement vector")
                                case "toentitybefore":
                                    return span("Turn to entity (before)")
                                case "toentityafter":
                                    return span("Turn to entity (after)")
                                case "keep":
                                    return span("Keep previous")
                                case "forced":
                                    return span(`Force ${direction.toString(v.direction)}`)
                                default:
                                    return span("")
                            }
                        }
                    }
                }, [
                    {type: "keep"},
                    {type: "byoffset"},
                    {type: "toentityafter"},
                    {type: "toentitybefore"},
                ].concat(direction.all.map(d => ({
                        type: "forced",
                        relative: false,
                        direction: d
                    })
                )) as Transportation.transport_orientation_type[])
                    .onSelection((v) => {
                        this.config.value.update(() => {
                            if (v.type == "forced") {
                                let old_relative = action.orientation.type == "forced"
                                    ? action.orientation.relative
                                    : true
                                action.orientation = {...v, relative: old_relative}
                            } else {
                                action.orientation = v
                            }
                        })
                    })
                    .setValue(action.orientation)

                props.named("Orientation",
                    vbox(
                        orientation_dropdown,
                        action.orientation.type != "forced"
                            ? undefined
                            : hbox(new Checkbox().setValue(action.orientation.relative)
                                    .onCommit((v) => {
                                        this.config.value.update(() => {
                                            assert(action.orientation.type == "forced")
                                            action.orientation.relative = v
                                        })
                                    }),
                                C.span("Relative to shortcut?").tooltip("If checked, the forced direction will rotate with the shortcut.")
                            )
                    ))
            })

            if (!this.config.single_action) {
                props.row(vbox(new LightButton("+ Add Action")
                    .onClick(() => {
                        this.config.value.update(v => {
                            assert(v.type == "entity")

                            v.actions.push({
                                    cursor: v.actions[0]?.cursor || "generic",
                                    movement: [{offset: {x: 0, y: 0, level: v.clickable_area.level}}],
                                    name: v.actions[0]?.name || "Use",
                                    time: v.actions[0]?.time || 3
                                }
                            )
                        })
                    })).css("text-align", "center"))
            }

            break;
        }
    }

    props.appendTo(this.body)

     */
  }
}