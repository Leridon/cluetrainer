import {TileCoordinates, TileRectangle} from "../../../../lib/runescape/coordinates";
import {LocUtil} from "./util/LocUtil";
import {Rectangle, Transform, Vector2} from "../../../../lib/math";
import {TileTransform} from "../../../../lib/runescape/coordinates/TileTransform";
import {util} from "../../../../lib/util/util";

export namespace CacheTypes {

  import profileAsync = util.profileAsync;
  import profile = util.profile;
  export type objects = {
    models?: ({
      type: number,
      values: (number | number)[],
    }[] | {
      values: (number | number)[],
      type: number,
    }[]) | null
    name?: string | null
    examine?: string | null
    models_05?: ({
      models: {
        type: number,
        values: (number | number)[],
      }[],
      unktail: [
        (number | number),
        (number | number),
      ][],
    } | {
      models: {
        type: 10,
        values: (number | number)[],
        unktail: [
          (number | number),
          (number | number),
        ][],
      }[],
    }) | null
    width?: number | null
    length?: number | null
    probably_nocollision?: true | null
    maybe_allows_lineofsight?: true | null
    deletable?: boolean | null
    probably_morphFloor?: true | null
    unknown_16?: true | null
    occludes_1?: false | null
    probably_animation?: number | null
    maybe_blocks_movement?: true | null
    wallkit_related_1C?: number | null
    ambient?: number | null
    actions_0?: string | null
    actions_1?: string | null
    actions_2?: string | null
    actions_3?: string | null
    actions_4?: string | null
    contrast?: number | null
    color_replacements?: [
      number,
      number,
    ][] | null
    material_replacements?: [
      number,
      number,
    ][] | null
    recolourPalette?: number[] | null
    unknown_2C?: number | null
    unknown_2D?: number | null
    unknown_36?: true | null
    unknown_37?: true | null
    unknown_38?: true | null
    unknown_39?: true | null
    unknown_3c?: number | null
    mirror?: true | null
    unknown_40?: true | null
    scaleX?: number | null
    scaleY?: number | null
    scaleZ?: number | null
    mapscene_old?: number | null
    dummy_45?: number | null
    translateX?: number | null
    translateY?: number | null
    translateZ?: number | null
    unknown_49?: true | null
    unknown_4A?: true | null
    unknown_4B?: number | null
    morphs_1?: {
      unk1: number,
      unk2: (number | number)[],
      unk3: (number | number),
    } | null
    light_source_related_4E?: {
      maybe_color: number,
      maybe_radius: number,
    } | null
    unknown_4F?: {
      unknown_1: number,
      unknown_2: number,
      unknown_3: number,
      unknown_4: number[],
    } | null
    unknown_51?: number | null
    unknown_52?: true | null
    is_members?: true | null
    unknown_59?: true | null
    unknown_5A?: true | null
    isMembers?: true | null
    morphs_2?: {
      unk1: number,
      unk2: (number | number),
      unk3: (number | number)[],
      unk4: (number | number),
    } | null
    tilt_xz?: [
      number,
      number,
    ] | null
    under_water?: true | null
    probably_morphCeilingOffset?: (number | 0) | null
    unknown_60?: true | null
    ground_decoration_related_61?: true | null
    has_animated_texture?: true | null
    dummy_63?: {
      unknown_2: number,
      unknown_1: number,
    } | null
    dummy_64?: {
      unknown_2: number,
      unknown_1: number,
    } | null
    unused_65?: number | null
    mapscene?: number | null
    occludes_2?: false | null
    interactable_related_68?: number | null
    invertMapScene?: true | null
    headModels?: {
      model: number,
      unknown_2: number,
    }[] | null
    mapFunction?: number | null
    unknown_71?: number | null
    members_action_1?: string | null
    members_action_2?: string | null
    members_action_3?: string | null
    members_action_4?: string | null
    members_action_5?: string | null
    unknown_A0?: number[] | null
    singleuse_A2?: number | null
    unknown_A3?: {
      unknown_1: number,
      unknown_2: number,
      unknown_3: number,
      unknown_4: number,
    } | null
    singleuse_A4?: number | null
    singleuse_A5?: number | null
    singleuse_A6?: number | null
    floor_thickness?: number | null
    unused_a8?: true | null
    unused_a9?: true | null
    wallkit_related_AA?: number | null
    possibly_wallkit_skew_AB?: number | null
    lightsource_related_AD?: {
      unknown_1: number,
      unknown_2: number,
    } | null
    can_change_color?: true | null
    unknown_B2?: number | null
    unknown_BA?: number | null
    dummy_bc?: true | null
    treerockordoor_BD?: true | null
    action_cursors_0?: number | null
    action_cursors_1?: number | null
    action_cursors_2?: number | null
    action_cursors_3?: number | null
    action_cursors_4?: number | null
    action_cursors_5?: number | null
    tileplacement_related_c4?: number | null
    clan_citadel_C5?: number | null
    invisible_c6?: true | null
    flooroverlay_c7?: true | null
    singleuse_C8?: true | null
    unknown_C9?: {
      unknown_1: number,
      unknown_2: number,
      unknown_3: number,
      unknown_4: number,
      unknown_5: number,
      unknown_6: number,
    } | null
    singleuse_CA?: number | null
    unknown_CB?: true | null
    unknown_CC?: Uint8Array[] | null
    extra?: {
      prop: number,
      intvalue: number | null,
      stringvalue: string | null,
    }[] | null
  };

  export type npcs = {
    models?: (number | number)[] | null
    name?: string | null
    examine?: string | null
    unknown_08?: number | null
    unknown_0B?: number | null
    boundSize?: number | null
    unk_0D?: number | null
    unk_0E?: number | null
    unk_11?: number[] | null
    actions_0?: string | null
    actions_1?: string | null
    actions_2?: string | null
    actions_3?: string | null
    actions_4?: string | null
    color_replacements?: [
      number,
      number,
    ][] | null
    material_replacements?: [
      number,
      number,
    ][] | null
    recolourPalette?: number[] | null
    recolor_indices?: number | null
    retexture_indices?: number | null
    headModels?: (number | number)[] | null
    drawMapDot?: false | null
    combat?: number | null
    scaleXZ?: number | null
    scaleY?: number | null
    unknown_63?: true | null
    ambience?: number | null
    modelContract?: number | null
    head_icon_data?: number | null
    unknown_67?: number | null
    morphs_1?: {
      unk1: number,
      unk2: number[],
      unk3: (number | number),
    } | null
    unknown_6B?: false | null
    slowWalk?: false | null
    animateIdle?: false | null
    shadow?: {
      SrcColor: number,
      DstColor: number,
    } | null
    shadowAlphaIntensity?: {
      Src: number,
      Dst: number,
    } | null
    unknown_73?: [
      number,
      number,
    ] | null
    morphs_2?: {
      unk1: number,
      unk2: number,
      unk3: number[],
      unk4: number,
    } | null
    movementCapabilities?: number | null
    unknown_78?: [
      number,
      number,
      number,
      number,
    ] | null
    translations?: Uint8Array[] | null
    unk_7A?: number | null
    iconHeight?: number | null
    respawnDirection?: number | null
    animation_group?: number | null
    movementType?: number | null
    ambient_sound?: {
      unk1: number,
      unk2: number,
      unk3: number,
      unk4: number,
      unk45: number,
    } | null
    oldCursor?: {
      Op: number,
      Cursor: number,
    } | null
    oldCursor2?: {
      Op: number,
      Cursor: number,
    } | null
    attackCursor?: number | null
    armyIcon?: number | null
    unknown_8C?: number | null
    unknown_8D?: true | null
    mapFunction?: number | null
    unknown_8F?: true | null
    members_actions_0?: string | null
    members_actions_1?: string | null
    members_actions_2?: string | null
    members_actions_3?: string | null
    members_actions_4?: string | null
    unknown_9B?: {
      unknown_1: number,
      unknown_2: number,
      unknown_3: number,
      unknown_4: number,
    } | null
    aByte3076_set_1?: true | null
    aByte3076_set_0?: false | null
    quests?: number[] | null
    dummy_1?: true | null
    unknown_A3?: number | null
    unknown_A4?: {
      unknown_1: number,
      unknown_2: number,
    } | null
    unknown_A5?: number | null
    unknown_A8?: number | null
    unknown_A9?: false | null
    action_cursors_0?: number | null
    action_cursors_1?: number | null
    action_cursors_2?: number | null
    action_cursors_3?: number | null
    action_cursors_4?: number | null
    action_cursors_5?: number | null
    dummy_2?: true | null
    unknown_B3?: {
      unknown_1: number,
      unknown_2: number,
      unknown_3: number,
      unknown_4: number,
      unknown_5: number,
      unknown_6: number,
    } | null
    unknown_B4?: number | null
    unknown_B5?: {
      unknown_1: number,
      unknown_2: number,
    } | null
    unknown_B6?: true | null
    unknown_B7?: number | null
    unknown_B8?: number | null
    unknown_B9?: number | null
    unknown_DB?: number | null
    extra?: {
      prop: number,
      intvalue: number | null,
      stringvalue: string | null,
    }[] | null
    unknown_FD?: number | null
  };

  export type WorldLocation = {
    x: number,
    z: number,
    type: number,
    rotation: number,
    plane: number,
    locid: number,
    resolvedlocid: number,
    location: objects,
    sizex: number,
    sizez: number,
    placement: mapsquare_locations["locations"][number]["uses"][number]["extra"],
    visualLevel: number,
    effectiveLevel: number
  }

  export type mapsquare_locations = {
    locations: {
      id: number,
      uses: {
        y: number,
        x: number,
        plane: number,
        rotation: number,
        type: number,
        extra: {
          flags: number,
          rotation: number[] | null,
          translateX: number | null,
          translateY: number | null,
          translateZ: number | null,
          scale: number | null,
          scaleX: number | null,
          scaleY: number | null,
          scaleZ: number | null,
        } | null,
      }[],
    }[],
  };

  export type LocUse = Omit<WorldLocation, "location"> & {
    location: undefined,
    box: TileRectangle,
    origin: TileCoordinates
  }

  export type LocWithUsages = {
    id: number,
    location: objects,
    uses: LocUse[]
  }

  export type LocInstance = LocUse & {
    loc_with_usages: LocWithUsages,
    prototype: objects,
    loc_id: number,
  }

  export class LocDataFile {

    private lookup_table: LocWithUsages[]
    private all: LocWithUsages[]

    constructor(private data: Record<number, LocWithUsages>) {
      this.lookup_table = new Array(Math.max(...Object.values(data).map(o => o.id)) + 1)

      Object.values(data).forEach(o => {
        this.lookup_table[o.id] = o
      })

      this.all = this.lookup_table.filter(i => !!i)
    }

    static async fromURL(url: string): Promise<LocDataFile> {
      const data = await profileAsync(async () => await (await fetch(url)).json(), "Fetching data")

      return profile(() => new LocDataFile(data), "Preparing data")
    }


    getById(id: number): LocWithUsages {
      return this.lookup_table[id]
    }

    get(id: number): LocInstance[] {
      return LocUtil.getInstances(this.getById(id))
    }

    getAll(): LocWithUsages[] {
      return this.all
    }
  }

  export namespace LocInstance {
    export function getTransform(instance: LocInstance): TileTransform {
      const rotation = Transform.rotation((4 - instance.rotation) % 4)

      const rotated_box = Rectangle.from({x: 0, y: 0}, Vector2.transform({x: (instance.prototype.width ?? 1) - 1, y: (instance.prototype.length ?? 1) - 1}, rotation))

      return TileTransform.chain(
        TileTransform.translation(
          Vector2.sub(instance.origin, Rectangle.bottomLeft(rotated_box)),
          instance.origin.level
        ),
        rotation,
      )
    }

    export function getInverseTransform(instance: LocInstance): TileTransform {
      const rotation = Transform.rotation(instance.rotation % 4)

      const rotated_box = Rectangle.from({x: 0, y: 0}, Vector2.transform({x: (instance.prototype.width ?? 1) - 1, y: (instance.prototype.length ?? 1) - 1},
        Transform.rotation((4 - instance.rotation) % 4)))

      return TileTransform.chain(
        rotation,
        TileTransform.translation(
          Vector2.sub(Rectangle.bottomLeft(rotated_box), instance.origin),
          -instance.origin.level
        ),
      )
    }

  }
}