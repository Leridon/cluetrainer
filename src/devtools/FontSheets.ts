import {Rectangle, Vector2} from "../lib/math";
import lodash, { set } from "lodash";
import {Log} from "../lib/util/Log";
import { cpuUsage } from "process";
import { GenerateFontMeta } from "alt1/ocr";

export namespace FontSheets {
  import log = Log.log;
  type Color = [number, number, number, number]

  namespace Color {
    export function isBlank(c: Color) {
      return c[3] == 0
    }
  }

  class ImageView {
    readonly size: Vector2

    constructor(
      public readonly image: ImageData,
      public readonly area: Rectangle
    ) {
      this.size = {
        x: area.botright.x - area.topleft.x + 1,
        y: area.botright.y - area.topleft.y + 1,
      }
    }

    static whole(image: ImageData) {
      return new ImageView(image, {topleft: {x: 0, y: 0}, botright: {x: image.width - 1, y: image.height}})
    }

    getSubsection(rect: Rectangle): ImageView {
      return new ImageView(
        this.image,
        Rectangle.move(rect, this.area.topleft)
      )
    }

    private translate(pos: Vector2): Vector2 {
      return Vector2.add(pos, this.area.topleft)
    }

    get(pos: Vector2): Color {
      let {x, y} = this.translate(pos)

      return this.image.getPixel(x, y)
    }

    line(y: number): ImageView {
      if (y < 0) y = this.size.x + y

      return this.getSubsection({topleft: {x: 0, y}, botright: {x: this.size.x - 1, y}})
    }

    column(x: number): ImageView {
      if (x < 0) x = this.size.x + x

      return this.getSubsection({topleft: {x, y: 0}, botright: {x, y: this.size.y - 1}})
    }

    every(f: (_: Color) => boolean): boolean {
      for (let x = 0; x < this.size.x; x++) {
        for (let y = 0; y < this.size.y; y++) {
          if (!f(this.get({x, y}))) return false
        }
      }
      return true
    }

    any(f: (_: Color) => boolean): boolean {
      return !this.every(c => !f(c))
    }

    reduce(left: number, right: number, top: number, bottom: number): ImageView {
      return new ImageView(
        this.image,
        {
          topleft: Vector2.add(this.area.topleft, {x: left, y: top}),
          botright: Vector2.add(this.area.botright, {x: -right, y: -bottom})
        }
      )
    }

    trim(): ImageView {
      let left = 0;
      let right = 0;
      let top = 0;
      let bottom = 0;

      while (left < this.size.x && this.column(left).every(Color.isBlank)) left++;
      while (right < this.size.x && this.column(this.size.x - 1 - right).every(Color.isBlank)) right++;
      while (top < this.size.y && this.line(top).every(Color.isBlank)) top++;
      while (bottom < this.size.y && this.line(this.size.y - 1 - bottom).every(Color.isBlank)) bottom++;

      return new ImageView(this.image, Rectangle.shrink(this.area, {left, right, top, bottom}))
    }

    getData(): ImageData {
      const section = new ImageData(this.size.x, this.size.y)

      for (let x = 0; x < this.size.x; x++) {
        for (let y = 0; y < this.size.y; y++) {
          section.setPixel(x, y, this.get({x, y}))
        }
      }

      return section
    }
  }

  export function splitRows(image: ImageView): ImageView[] {
    const rows: ImageView[] = []

    let start_of_row = 0
    let row: number = 0

    while (row < image.size.y) {
      // Skip all rows that are not blank
      while (row < image.size.y && !image.line(row).every(Color.isBlank)) row++

      // Now row is the y of the first line where everything is blank
      rows.push(image.getSubsection({topleft: {x: 0, y: start_of_row}, botright: {x: image.size.x - 1, y: row - 1}}))

      // Skip all fully blank rows
      while (row < image.size.y && image.line(row).every(Color.isBlank)) row++

      start_of_row = row
    }

    return rows
  }

  export function splitColumns(image: ImageView): ImageView[] {
    const columns: ImageView[] = []

    let start_of_column = 0
    let col: number = 0

    while (col < image.size.x) {
      // Skip all cols that are not blank
      while (col < image.size.x && !image.column(col).every(Color.isBlank)) col++

      // Now row is the y of the first line where everything is blank
      columns.push(image.getSubsection({topleft: {x: start_of_column, y: 0}, botright: {x: col - 1, y: image.size.y - 1}}))

      // Skip all fully blank rows
      while (col < image.size.x && image.column(col).every(Color.isBlank)) col++

      start_of_column = col
    }

    return columns
  }

  type Bearings = Record<string, number>

  namespace Bearings {
    export function get(self: Bearings, char: string): number {
      return self[char] ?? 0
    } 

    export function add(self: Bearings, char: string, bearing: number) {
      self[char] = get(self, char) + bearing 
    }

    export function set(self: Bearings, char: string, bearing: number) {
      self[char] = bearing 
    }

    export function combine(a: Bearings, b: Bearings): Bearings {
      const clone = lodash.cloneDeep(a)

      Object.entries(b).forEach(([char, bearing]) => {
          add(clone, char, bearing)
      })

      return clone
    }

    export function parse(input: string): Bearings {
      const components = input.replace(/\s+/, "").split(/[;]+/)

      const bearings: Bearings = {}

      components.forEach(comp => {
        const char = comp.charAt(0)
        const bearing = Number.parseInt(comp.substring(1, comp.length))

        if(!Number.isNaN(bearing)) {
          Bearings.set(bearings, char, bearing)
        }
      })
      
      return bearings
    }

    export function toString(self: Bearings): string {
      return Object.entries(self).map(([char, bearing]) => {
        return `${char}${bearing}`
      }).join(";")
    }
  }

  type Settings = {
    image: ImageData,
    pre_automatic_bearing: Bearings
    post_automatic_bearing: Bearings
  }
  
  type GlyphWithCharacter = {
    sprite: ImageView,
    char: string
  }

  type IntermediateResults = {
    rows: ImageView[]
    glyphs: GlyphWithCharacter[],
    without_bearings: ImageData,
    manual_bearings_1: ImageData,
    automatic_bearings: ImageData,
    manual_bearings_2: ImageData,
    font_meta: GenerateFontMeta
  }

  export function createSheet(chars: GlyphWithCharacter[], bearings: Bearings): ImageData {
    const max_ascent = Math.max(...chars.map(c => c.sprite.size.y - (bearings[c.char] ?? 0)))
    const max_descent = Math.max(...chars.map(c => bearings[c.char] ?? 0))

    const width = lodash.sum(chars.map(c => c.sprite.size.x)) + (chars.length - 1) * 2
    const height = max_ascent + max_descent + 2

    const final = new ImageData(width, height)

    let x = 0
    for (let glyph of chars) {
      final.putImageData(glyph.sprite.getData(), x, max_ascent - glyph.sprite.size.y + (bearings[glyph.char] ?? 0))

      for (let xi = 0; xi < glyph.sprite.size.x; xi++) {
        final.setPixel(x + xi, final.height - 1, [255, 255, 255, 255])
      }

      x += glyph.sprite.size.x + 2
    }

    return final
  }

  export function automaticBearings(chars: GlyphWithCharacter[], existing_bearings: Bearings): Bearings {
    // Align most lower case characters on the bottom of o
    // Align lowe case characters with ascend to the top of i
    // Align upper case characters to the top of O
    // Center all other characters
    
    return {}
  }

  export function assignGlyphs(ordered_glyphs: ImageView[]): GlyphWithCharacter[] {
    return ordered_glyphs.map((g, i) => ({
      sprite: g,
      char: String.fromCharCode(i + 2)
    })).filter(c => c.char.charCodeAt(0) >= 33 && c.char.charCodeAt(0) <= 126)
  }

  export function doFont(settings: Settings): IntermediateResults {
    const view = ImageView.whole(settings.image).trim()

    const rows = splitRows(view)
    const glyphs = rows.flatMap(splitColumns).map(view => view.trim())
    const chars = assignGlyphs(glyphs);

    const without_bearings = createSheet(chars, {})
    const manual_bearings_1 = createSheet(chars, settings.pre_automatic_bearing)
    
    const automatic_bearings = Bearings.combine(settings.pre_automatic_bearing, automaticBearings(chars, settings.pre_automatic_bearing))
    
    const with_automatic_bearings = createSheet(chars, automatic_bearings)
    
    const full_bearings = Bearings.combine(automatic_bearings, settings.post_automatic_bearing)
    const with_manual_bearings_2 = createSheet(chars, full_bearings)

    return {
      rows: rows,      
      glyphs: chars,
      without_bearings: without_bearings,
      manual_bearings_1: manual_bearings_1,
      automatic_bearings: with_automatic_bearings,
      manual_bearings_2: with_manual_bearings_2,
      font_meta: {
        
      }
    }
  }
}