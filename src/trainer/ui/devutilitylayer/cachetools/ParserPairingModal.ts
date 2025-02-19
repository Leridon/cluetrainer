import {FormModal} from "../../../../lib/ui/controls/FormModal";
import {CacheTypes} from "./CacheTypes";
import {TransportParser} from "./TransportParser";
import Properties from "../../widgets/Properties";
import {Parsers3, parsers} from "./parsers";
import {DropdownSelection} from "../../widgets/DropdownSelection";
import Widget from "../../../../lib/ui/Widget";
import {LocParsingTable, ParserPairing, ParsingAssociationGroup} from "./ParsingTable";
import {BigNisButton} from "../../widgets/BigNisButton";
import {SearchSelection} from "../../widgets/SearchSelection";
import {Checkbox} from "../../../../lib/ui/controls/Checkbox";
import TextField from "../../../../lib/ui/controls/TextField";
import {GameMapMiniWidget} from "../../../../lib/gamemap/GameMap";
import {TileRectangle} from "../../../../lib/runescape/coordinates";
import * as leaflet from "leaflet"
import {C} from "../../../../lib/ui/constructors";
import {Vector2} from "../../../../lib/math";
import {NavigationControl} from "../NavigationControl";
import img = C.img;
import {ProcessedCacheTypes} from "./ProcessedCacheTypes";
import PrototypeInstance = ProcessedCacheTypes.PrototypeInstance;
import {TileArea} from "../../../../lib/runescape/coordinates/TileArea";
import {PrototypeInstanceEntity} from "./FilteredPrototypeLayer";

export class ParserPairingEdit extends Widget {
  map: GameMapMiniWidget

  properties: Properties

  constructor(private loc: PrototypeInstance, private parsing_table: LocParsingTable, private pairing: ParserPairing) {
    super();

    if (!pairing) this.pairing = {group: null, instance_group: null}

    this.map = new GameMapMiniWidget()
      .css("width", "100%")
      .css("height", "400px")
      .appendTo(this)

    new NavigationControl().addTo(this.map.main_layer)

    new PrototypeInstanceEntity(this.loc, null)
      .addTo(this.map.main_layer)

    leaflet.marker(Vector2.toLatLong(TileRectangle.center(TileArea.toRect(this.loc.box), false)), {
      icon: leaflet.divIcon({
        iconSize: [33, 33],
        iconAnchor: [16, 16],
        className: "",
        html: img(`./assets/icons/alignedcompass.png`)
          .css("rotate", `${(this.loc.instance.rotation ?? 0) * 90}deg`)
          .css("scale", "0.9")
          .raw()
      }),
    }).addTo(this.map.main_layer)

    this.properties = new Properties()

    this.renderProps()
  }

  center_map() {
    this.map.map.fitView(TileRectangle.extend(TileArea.toRect(this.loc.box), 3), {maxZoom: 20})
  }

  protected renderProps() {
    this.properties.empty()

    /*        c().css("border", "1px dashed white")
                .append(new LocInstanceProperties(this.loc, this.parsing_table))
                .appendTo(this)
    */

    const props = this.properties

    props.header(new Checkbox("Pair with LOC-group")
      .setValue(!!this.pairing.group)
      .onCommit(v => {
        if (v) {
          this.pairing.group = {
            id: -1,
            name: "",
            parser: Parsers3.getById("ignore"),
            argument: undefined
          }
        } else {
          this.pairing.group = undefined
          this.pairing.instance_group = undefined
        }

        this.renderProps()
      })
    )

    if (this.pairing.group) {
      props.named("Group", new SearchSelection<ParsingAssociationGroup>({
        type_class: {
          toHTML: item => {
            if (item) {
              if (item.group_name.length == 0) return c().text("No name").css("font-style", "italic")
              else return c().text(item.group_name)
            } else return c().text("Create new group")
          },
        },
        search_term: item => {
          return item ? item.group_name : "Create new group"
        }
      }, [null].concat(this.parsing_table.data.associations.filter(a => a.group_name.length > 0)))
        .setValue(this.parsing_table.getGroup(this.pairing.group.id))
        .onSelection(group => {
          if (group) {
            this.pairing.group.id = group.group_id
            this.pairing.group.name = group.group_name
            this.pairing.group.parser = Parsers3.getById(group.parser_id)
            this.pairing.group.argument = group.per_group_arg
          } else {
            this.pairing.group.id = -1
            this.pairing.group.name = ""
            this.pairing.group.parser = Parsers3.getById("ignore")
            this.pairing.group.argument = undefined
          }

          this.renderProps()
        }))

      props.named("Parser", new DropdownSelection<TransportParser>({
          type_class: {
            toHTML: (v: TransportParser) => c().text(v ? v.name : "None")
          }
        }, parsers.filter(p => !p.legacy))
          .setValue(this.pairing.group.parser)
          .onSelection(parser => {
            this.pairing.group.parser = parser
            this.pairing.group.argument = undefined

            if (parser.per_loc_group_parameter) {
              this.pairing.group.argument = parser.per_loc_group_parameter.getDefault(this.loc)
            }

            this.renderProps()
          })
      )

      props.named("Group Name", new TextField()
        .setValue(this.pairing.group.name)
        .onCommit(v => {
          this.pairing.group.name = v
        })
      )

      if (this.pairing.group.parser.per_loc_group_parameter) {
        props.header("Loc ")
      }


      if (this.pairing.group.parser.per_loc_group_parameter) {
        props.header("Group Parameter")

        const test_par = this.pairing.group.parser.per_loc_group_parameter.renderForm(0, this.loc, this.map)
          .set(this.pairing.group.argument)
          .onChange(v => this.pairing.group.argument = v)

        props.row(test_par.control)
        props.row(test_par.additional)
      }

      if (this.pairing.group.parser.per_instance_parameter) {
        props.header(new Checkbox("Pair with Instance Group")
          .setValue(!!this.pairing.instance_group)
          .onCommit(v => {
            if (v) {
              this.pairing.instance_group = {
                id: -1,
                name: "",
                argument: this.pairing.group.parser.per_instance_parameter?.getDefault(this.loc)
              }
            } else {
              this.pairing.instance_group = undefined
            }

            this.renderProps()
          })
        )

        if (this.pairing.instance_group) {
          const group = this.parsing_table.getGroup(this.pairing.group.id)

          props.named("Group", new SearchSelection<ParsingAssociationGroup["instance_groups"][number]>({
            type_class: {
              toHTML: item => {
                if (item) {
                  if (item.name.length == 0) return c().text("No name").css("font-style", "italic")
                  else return c().text(item.name)
                } else return c().text("Create new instance group")
              },
            },
            search_term: item => {
              return item ? item.name : "Create new group"
            }
          }, [null].concat((group?.instance_groups ?? []).filter(g => g.name)))
            .setValue(group?.instance_groups?.find(i => i.id == this.pairing.instance_group.id) ?? null)
            .onSelection(group => {
              if (group) {
                this.pairing.instance_group.id = group.id
                this.pairing.instance_group.name = group.name
                this.pairing.instance_group.argument = group.per_instance_argument
              } else {
                this.pairing.instance_group.id = -1
                this.pairing.instance_group.name = ""
                this.pairing.instance_group.argument = this.pairing.group.parser.per_instance_parameter?.getDefault(this.loc)
              }

              this.renderProps()
            }))

          props.named("IGroup Name", new TextField()
            .setValue(this.pairing.instance_group.name)
            .onCommit(v => {
              this.pairing.instance_group.name = v
            })
          )

          if (this.pairing.group.parser.per_instance_parameter) {
            const test_par = this.pairing.group.parser.per_instance_parameter.renderForm(0, this.loc, this.map)
              .set(this.pairing.instance_group.argument)
              .onChange(v => this.pairing.instance_group.argument = v)

            props.row(test_par.control)
            props.row(test_par.additional)
          }
        }
      }
    }

    props.appendTo(this)
  }

  get(): ParserPairing {
    return this.pairing
  }
}

export class ParserPairingModal extends FormModal<{
  type: "cancelled" | "saved",
  pairing?: ParserPairing | null
}> {

  edit: ParserPairingEdit

  constructor(private loc: PrototypeInstance, private parsing_table: LocParsingTable, private existing_pairing: ParserPairing) {
    super({
      size: "large",
      fixed: true,
      disable_close_button: true
    });

    this.title.set("Edit Parser Pairing")
    this.shown.on(() => {
      this.edit.center_map()
    })

  }

  async show(): Promise<this> {
    const promise = super.show();

    //setTimeout(() => this.edit.center_map(), 1000)

    return promise
  }

  render() {
    super.render()

    this.edit = new ParserPairingEdit(this.loc, this.parsing_table, this.existing_pairing)
      .appendTo(this.body)
  }

  getButtons(): BigNisButton[] {
    return [
      new BigNisButton("Cancel", "neutral")
        .onClick(() => this.confirm({type: "cancelled"})),
      new BigNisButton("Save", "confirm")
        .onClick(() => this.confirm({type: "saved", pairing: this.edit.get()})),
    ]
  }

  protected getValueForCancel(): { type: "cancelled" | "saved"; pairing: ParserPairing } {
    return {type: "cancelled", pairing: this.edit.get()}
  }
}