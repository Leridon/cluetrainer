import {Rectangle, Vector2} from "../lib/math";
import lodash from "lodash";
import {FontDefinition, GenerateFontMeta} from "alt1/ocr";
import Widget from "../lib/ui/Widget";
import Properties from "../trainer/ui/widgets/Properties";
import LightButton from "../trainer/ui/widgets/LightButton";
import {ImageDetect} from "alt1";
import {observe} from "../lib/reactive";
import TextArea from "../lib/ui/controls/TextArea";
import {OCR} from "../lib/alt1/OCR";
import {util} from "../lib/util/util";
import {C} from "../lib/ui/constructors";
import {IssueWidget} from "../trainer/pathedit/EditedPathOverview";
import {ClueReader} from "../trainer/ui/neosolving/cluereader/ClueReader";
import {SettingsLayout} from "../trainer/ui/settings/SettingsEdit";

export namespace FontSheets {

  import selectFile = util.selectFile;
  import img = C.img;
  import span = C.span;
  import info = SettingsLayout.info;
  import hbox = C.hbox;
  type Color = [number, number, number, number]

  namespace Color {
    export function isBlank(c: Color) {
      return c[3] == 0
    }
  }

  class ImageView {
    readonly size: Vector2

    constructor(
      private readonly image: ImageData,
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

  type Settings = {
    image: ImageData,
    font_script: FontScript
  }

  type GlyphWithCharacter = {
    sprite: ImageView,
    char: string
  }

  type Glyphs = GlyphWithCharacter[]

  namespace Glyphs {
    export function find(glyphs: Glyphs, char: string) {
      return glyphs.find(g => g.char == char)
    }
  }

  type IntermediateResults = {
    settings: Settings,
    rows: ImageView[]
    glyphs: GlyphWithCharacter[],
    without_bearings: ImageData,
    after_fontscript: ImageData,
    font_meta: GenerateFontMeta,
    font_definition: FontDefinition
  }

  export type GlyphPlacement = { bearing: number, padleft: number, padright: number }
  export type GlyphWithPlacement = GlyphWithCharacter & { placement: GlyphPlacement }

  export type Font<GlyphType extends GlyphWithCharacter> = {
    meta: GenerateFontMeta,
    glyphs: GlyphType[]
  }

  export type GlyphsWithPlacement = Font<GlyphWithPlacement>

  export namespace GlyphPlacements {
    export function init(glyphs: GlyphWithCharacter[]): GlyphWithPlacement[] {
      return glyphs.map(g => ({...g, placement: {bearing: 0, padleft: 0, padright: 0}}))
    }

    export function normalize(glyphs: GlyphWithPlacement[]): void {
      const min = Math.min(...glyphs.map(g => g.placement.bearing))

      glyphs.forEach(g => g.placement.bearing -= min)
    }
  }


  type Paddings = Record<string, { left: number, right: number }>

  export namespace Paddings {
    export function init(font: GlyphWithCharacter[]) {
      const paddings: Paddings = {}

      font.forEach(c => paddings[c.char] = {left: 0, right: 0})

      return paddings
    }

    export function get(self: Paddings, char: string) {
      return self[char] ?? {left: 0, right: 0}
    }
  }

  /**
   * Create an image sheet for use with OCR.loadFontImage
   *
   * @param chars The glyphs of the font.
   */
  export function createSheet2(font: GlyphsWithPlacement): ImageData {
    const SPACING = 1

    const glyph_height = Math.max(...font.glyphs.map(c => c.sprite.size.y + c.placement.bearing))

    const width = lodash.sum(font.glyphs.map(c => {
      const left = c.placement.padleft
      const right = c.placement.padright

      return c.sprite.size.x + Math.max(0, left) + Math.max(0, right)
    })) + (font.glyphs.length - 1) * SPACING
    const height = glyph_height + 2

    const final = new ImageData(width, height)

    let x = 0
    for (const glyph of font.glyphs) {
      const left = glyph.placement.padleft
      const right = glyph.placement.padright

      final.putImageData(glyph.sprite.getData(), x + Math.max(0, left), glyph.placement.bearing)

      const char_width = glyph.sprite.size.x + left + right

      const start_xi = -Math.min(left, 0)
      for (let xi = 0; xi < char_width; xi++) {
        final.setPixel(x + start_xi + xi, final.height - 1, [255, 255, 255, 255])
      }

      x += glyph.sprite.size.x + SPACING + Math.max(0, left) + Math.max(0, right)
    }

    return final
  }

  export function assignGlyphs(ordered_glyphs: ImageView[]): GlyphWithCharacter[] {
    return ordered_glyphs.map((g, i) => ({
      sprite: g,
      char: String.fromCharCode(i + 2)
    })).filter(c => c.char.charCodeAt(0) >= 33 && c.char.charCodeAt(0) <= 126 && c.char != "`")
  }

  export function doFont(settings: Settings): IntermediateResults {
    // TODO
    //  - The correct width of some chars doesn't match the width of the trimmed glyph (T for example)
    //  - The lineheight isn't calculated properly (should be 25 for the test font)

    const view = ImageView.whole(settings.image).trim()

    const rows = splitRows(view)
    const glyphs = rows.flatMap(splitColumns).map(view => view.trim())
    const chars = assignGlyphs(glyphs);

    const font: GlyphsWithPlacement = {
      meta: {
        basey: Glyphs.find(chars, "O").sprite.size.y - 1,
        chars: chars.map(c => c.char).join(""),
        color: [255, 255, 255],
        seconds: ",.-:;\"'`´",
        shadow: false,
        spacewidth: 4,
        treshold: 0.6,
        unblendmode: "raw"
      },
      glyphs: GlyphPlacements.init(chars)
    }

    const without_bearings = createSheet2(font)

    FontScript.evaluate(settings.font_script, font)

    const after_font_script = createSheet2(font)

    return {
      settings: settings,
      rows: rows,
      glyphs: chars,
      without_bearings: without_bearings,
      after_fontscript: after_font_script,
      font_meta: font.meta,
      font_definition: OCR.loadFontImage(after_font_script, font.meta)
    }
  }

  function dataUrl(image: ImageData): string {
    return `data:image/png;base64,${image.toPngBase64()}`
  }

  export type FontScript = FontScript.Instruction[]

  export namespace FontScript {
    export type Instruction = Pad | Align | Normalize | Space
    export type Pad = { type: "pad", target: RegExp, left: number, right: number }
    export type Align = { type: "align", target: RegExp, side: "bottom" | "top" | "center", reference: string }
    export type Space = { type: "space", width: number }
    export type Normalize = { type: "normalize" }

    export function parse(script: string): { script: FontScript, errors: { line: number, message: string }[] } {
      const lines = script.split("\n").map(l => l.trim())

      const instructions: FontScript = []
      const errors: { line: number, message: string }[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line.length == 0) continue;

        const [instruction, ...args] = line.split(/\s+/)

        switch (instruction) {
          case "center":
          case "aligntop":
          case "alignbot": {
            if (args.length != 2) {
              errors.push({line: i + 1, message: `${instruction} expects 2 arguments: <target:regex> <reference:char>`})
              break;
            }

            const [target, reference] = args
            const side_mapping: Record<string, Align["side"]> = {
              "aligntop": "top",
              "alignbot": "bottom",
              "center": "center"
            }

            const side: Align["side"] = side_mapping[instruction]

            instructions.push({type: "align", target: new RegExp(target), side: side, reference: reference})
            break
          }
          case "pad": {
            if (args.length != 3) {
              errors.push({line: i + 1, message: `${instruction} expects 3 arguments: <target:regex> <left:number> <right:number>`})
              break;
            }

            const [target, left, right] = args

            instructions.push({type: "pad", target: new RegExp(target), left: Number(left), right: Number(right)})
            break;
          }
          case "normalize": {
            if (args.length != 0) {
              errors.push({line: i + 1, message: `${instruction} does not expect arguments.`})
              break;
            }

            instructions.push({type: "normalize"})
            break;
          }
          case "space": {
            if (args.length != 1) {
              errors.push({line: i + 1, message: `${instruction} expects 1 argument: <width:number>.`})
              break;
            }

            instructions.push({type: "space", width: Number(args[0])})
            break;
          }
          default: {
            errors.push({line: i + 1, message: `Unknown instruction: ${instruction}`})
            break;
          }
        }
      }

      return {script: instructions, errors: errors}
    }

    export function evaluate(script: FontScript, font: GlyphsWithPlacement) {
      for (const instruction of script) {
        switch (instruction.type) {
          case "pad": {
            font.glyphs.forEach(c => {
              if (instruction.target.test(c.char)) {
                c.placement.padleft = instruction.left
                c.placement.padright = instruction.right
              }
            })
            break;
          }
          case "align": {
            function align_top(ref: GlyphWithPlacement, char: GlyphWithPlacement) {
              char.placement.bearing = ref.placement.bearing
            }

            function align_bot(ref: GlyphWithPlacement, char: GlyphWithPlacement) {
              char.placement.bearing = ref.placement.bearing + ref.sprite.size.y - char.sprite.size.y
            }

            function align_center(ref: GlyphWithPlacement, char: GlyphWithPlacement) {
              char.placement.bearing = ref.placement.bearing + ~~((ref.sprite.size.y - char.sprite.size.y) / 2)
            }

            const reference = font.glyphs.find(c => c.char == instruction.reference)

            font.glyphs.forEach(c => {
              if (instruction.target.test(c.char)) {
                switch (instruction.side) {
                  case "bottom":
                    align_bot(reference, c)
                    break;
                  case "top":
                    align_top(reference, c)
                    break;
                  case "center":
                    align_center(reference, c)
                    break;
                }
              }
            })
            break;
          }
          case "normalize": {
            GlyphPlacements.normalize(font.glyphs)
            break;
          }
          case "space": {
            font.meta.spacewidth = instruction.width
          }
        }
      }
    }

    export function toString(script: FontScript): string {
      return script.map(s => {
        switch (s.type) {
          case "pad":
            return `pad ${s.target.source} ${s.left} ${s.right}`
          case "align":
            if (s.side == "center") return `center ${s.target.source} ${s.reference}`

            return `align${s.side == "top" ? "top" : "bot"} ${s.target.source} ${s.reference}`
          case "normalize":
            return `normalize`
        }
      }).join("\n")
    }
  }

  export class FontSheetEditor extends Widget {
    private settings = observe<Settings>({
      image: undefined,
      font_script: []
    }).structuralEquality()

    private view_sheet: Widget
    private view_rows: Widget
    private view_glyphs: Widget
    private view_before_bearings: Widget
    private font_script_errors: Widget
    private view_after_fontscript: Widget
    private font_meta_view: TextArea
    private font_definition_view: TextArea

    constructor(initial_settings: Settings) {
      super();

      this.settings.set(initial_settings)

      const layout = new Properties().appendTo(this)

      layout.row(new LightButton("Select File", "rectangle")
        .onClick(async () => {
          const file = await selectFile("image/png")

          const image = await ImageDetect.imageDataFromFileBuffer(new Uint8Array(await file.arrayBuffer()))

          this.settings.update(s => s.image = image)
        })
      )

      layout.row(this.view_sheet = new Widget())
      layout.header("Rows")
      layout.row(this.view_rows = new Widget())
      layout.header("Glyphs")
      layout.row(this.view_glyphs = new Widget())
      layout.header("Before Fontscript")
      layout.row(this.view_before_bearings = new Widget())
      layout.header(hbox("Fontscript", info(new Properties()
        .header("Available commands")
        .row(span("aligntop <target:regex> <ref:char>: Aligns top of all character matching 'target' to the top of 'ref'."))
        .row(span("alignbot <target:regex> <ref:char>: Aligns bottom of all character matching 'target' to the bottom of 'ref'."))
        .row(span("center <target:regex> <ref:char>: Aligns center of all character matching 'target' to the center of 'ref'."))
        .row(span("pad <target:regex> <left:number> <right:number>: Sets the left and right padding for all characters matching 'target'."))
        .row(span("normalize: Normalizes all vertical bearings to be at least 0."))
      )))
      layout.row(new TextArea()
        .css("height", "360px")
        .setValue(FontScript.toString(initial_settings.font_script))
        .onCommit(t => this.settings.update(s => {
          const results = FontScript.parse(t)

          this.font_script_errors.empty()

          results.errors.forEach(e => {
            this.font_script_errors.append(new IssueWidget({message: `Line ${e.line}: ${e.message}`, level: 0}))
          })

          s.font_script = results.script
        })))
      layout.row(this.font_script_errors = new Widget())
      layout.row(this.view_after_fontscript = new Widget())

      layout.header("Font Meta")
      layout.row(this.font_meta_view = new TextArea({readonly: true})
        .css2({
          "height": "10em"
        })
        .on("click", () => this.font_meta_view.raw().select())
      )

      layout.header("Font Definition")
      layout.row(this.font_definition_view = new TextArea({readonly: true})
        .css2({
          "height": "10em"
        })
        .on("click", () => this.font_definition_view.raw().select())
      )

      this.settings.subscribe(s => this.updateResults(doFont(s)), true)
    }

    private updateResults(results: IntermediateResults) {
      ClueReader.CLUE_FONT = results.font_definition

      function box(image: ImageData): Widget {
        return img(dataUrl(image))
          .css("border", "1px solid red")
          .css("margin", "2px")
      }

      this.view_sheet.empty().append(box(results.settings.image))

      this.view_rows.empty()

      for (const row of results.rows) {
        this.view_rows.append(box(row.getData()))
      }

      this.view_glyphs.empty()

      for (const glyph of results.glyphs) {
        this.view_glyphs.append(
          span(glyph.char).append(box(glyph.sprite.getData()))
            .css("border", "1px solid white")
            .css("padding", "1px")
            .css("margin", "1px")
        )
      }

      this.font_meta_view.setValue(JSON.stringify(results.font_meta, null, 2))
      this.font_definition_view.setValue(JSON.stringify(results.font_definition))

      this.view_before_bearings.empty().append(box(results.without_bearings))
      this.view_after_fontscript.empty().append(box(results.after_fontscript))
    }
  }
}