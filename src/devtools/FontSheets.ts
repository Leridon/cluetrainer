import {Rectangle, Vector2} from "../lib/math";
import lodash from "lodash";
import {FontDefinition, GenerateFontMeta} from "alt1/ocr";
import Widget from "../lib/ui/Widget";
import Properties from "../trainer/ui/widgets/Properties";
import LightButton from "../trainer/ui/widgets/LightButton";
import {util} from "../lib/util/util";
import {ImageDetect} from "alt1";
import {observe} from "../lib/reactive";
import {C} from "../lib/ui/constructors";
import TextArea from "../lib/ui/controls/TextArea";
import {OCR} from "../lib/alt1/OCR";

export namespace FontSheets {
  import selectFile = util.selectFile;
  import img = C.img;
  import span = C.span;
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

    export function normalize(glyphs: Glyphs, bearings: Bearings): Bearings {
      const min = Math.min(...glyphs.map(g => get(bearings, g.char)))

      const clone = lodash.cloneDeep(bearings)

      glyphs.forEach(g => add(clone, g.char, -min))

      return clone
    }

    export function parse(input: string): Bearings {
      const components = input.replace(/\s+/, "").split(" ")

      const bearings: Bearings = {}

      components.forEach(comp => {
        const char = comp.charAt(0)
        const bearing = Number.parseInt(comp.substring(1, comp.length))

        if (!Number.isNaN(bearing)) {
          Bearings.set(bearings, char, bearing)
        }
      })

      return bearings
    }

    export function toString(self: Bearings): string {
      return Object.entries(self)
        .filter(([char, bearing]) => bearing != 0)
        .map(([char, bearing]) => `${char}${bearing}`)
        .join(" ")
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
    after_manual_bearings_1: ImageData,
    after_automatic_bearings: ImageData,
    after_manual_bearings_2: ImageData,
    automatic_bearings: Bearings,
    font_meta: GenerateFontMeta,
    font_definition: FontDefinition
  }

  export function createSheet(chars: GlyphWithCharacter[], bearings: Bearings): ImageData {
    const glyph_height = Math.max(...chars.map(c => c.sprite.size.y + Bearings.get(bearings, c.char)))

    const width = lodash.sum(chars.map(c => c.sprite.size.x)) + (chars.length - 1) * 2
    const height = glyph_height + 2

    const final = new ImageData(width, height)

    let x = 0
    for (let glyph of chars) {
      final.putImageData(glyph.sprite.getData(), x, Bearings.get(bearings, glyph.char))

      for (let xi = 0; xi < glyph.sprite.size.x; xi++) {
        final.setPixel(x + xi, final.height - 1, [255, 255, 255, 255])
      }

      x += glyph.sprite.size.x + 2
    }

    return final
  }

  export function automaticBearings(chars: GlyphWithCharacter[], existing_bearings: Bearings): Bearings {
    const bearings = lodash.clone(existing_bearings)

    function getchars(ref: string): string[] {
      const results = []

      for (let i = 0; i < ref.length; i++) results.push(ref.charAt(i))

      return results
    }

    function range(from: string, to: string): string[] {
      const a = from.charCodeAt(0)
      const b = to.charCodeAt(0)

      const range: string[] = []

      for (let i = a; i <= b; i++) {
        range.push(String.fromCharCode(i))
      }

      return range
    }

    const align_top = (ref: string) => (char: string) => {
      const should_top = Bearings.get(bearings, ref)
      const is_top = Bearings.get(bearings, char)

      const delta = should_top - is_top

      Bearings.add(bearings, char, delta)
    }

    const align_bot = (ref: string) => (char: string) => {
      const should_bot = Bearings.get(bearings, ref) + Glyphs.find(chars, ref).sprite.size.y
      const is_bot = Bearings.get(bearings, char) + Glyphs.find(chars, char).sprite.size.y

      const delta = should_bot - is_bot

      Bearings.add(bearings, char, delta)
    }

    const center = (ref: string) => (char: string) => {
      const should_center = Bearings.get(bearings, ref) + ~~(Glyphs.find(chars, ref).sprite.size.y / 2)
      const is_center = Bearings.get(bearings, char) + ~~(Glyphs.find(chars, char).sprite.size.y / 2)

      const delta = should_center - is_center

      Bearings.add(bearings, char, delta)
    }

    const all_cahrs = chars.map(c => c.char)

    all_cahrs.forEach(align_bot("O"))
    getchars("gpqy").forEach(align_top("o"))
    getchars("j").forEach(align_top("i"))
    range("A", "Z").forEach(align_top("O"))
    range("0", "9").forEach(align_top("O"))
    align_top(":")(";")
    align_bot(";")(",")
    getchars("(){}[]+-<=>@#|/\\~").forEach(center("O"))

    return Bearings.normalize(chars, bearings)
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

    const automatic_bearings = automaticBearings(chars, settings.pre_automatic_bearing)

    const with_automatic_bearings = createSheet(chars, automatic_bearings)

    const full_bearings = Bearings.combine(automatic_bearings, settings.post_automatic_bearing)
    const with_manual_bearings_2 = createSheet(chars, full_bearings)

    const font_meta: GenerateFontMeta = {
      basey: Glyphs.find(chars, "O").sprite.size.y - 1 + Bearings.get(automatic_bearings, "O"),
      chars: chars.map(c => c.char).join(""),
      color: [255, 255, 255],
      seconds: "",
      shadow: false,
      spacewidth: 4,
      treshold: 0.6,
      unblendmode: "raw"
    }

    return {
      settings: settings,
      rows: rows,
      glyphs: chars,
      without_bearings: without_bearings,
      after_manual_bearings_1: manual_bearings_1,
      after_automatic_bearings: with_automatic_bearings,
      after_manual_bearings_2: with_manual_bearings_2,
      automatic_bearings: automatic_bearings,
      font_meta: font_meta,
      font_definition: OCR.loadFontImage(with_manual_bearings_2, font_meta)
    }
  }

  function dataUrl(image: ImageData): string {
    return `data:image/png;base64,${image.toPngBase64()}`
  }

  export class FontSheetEditor extends Widget {
    private settings = observe<Settings>({
      image: undefined,
      pre_automatic_bearing: {},
      post_automatic_bearing: {}
    }).structuralEquality()

    private view_sheet: Widget
    private view_rows: Widget
    private view_glyphs: Widget
    private view_before_bearings: Widget
    private view_after_bearings_1: Widget
    private view_after_bearings_2: Widget
    private view_after_bearings_3: Widget
    private automatic_bearing_view: TextArea
    private font_meta_view: TextArea
    private font_definition_view: TextArea

    constructor(initial_settings: Settings) {
      super();

      this.settings.set(initial_settings)

      const layout = new Properties().appendTo(this)

      layout.row(new LightButton("Select File", "rectangle")
        .onClick(async () => {
          const file = await selectFile("image/png")

          const image = await ImageDetect.imageDataFromFileBuffer(await file.bytes())

          this.settings.update(s => s.image = image)
        })
      )

      layout.row(this.view_sheet = new Widget())
      layout.header("Rows")
      layout.row(this.view_rows = new Widget())
      layout.header("Glyphs")
      layout.row(this.view_glyphs = new Widget())
      layout.header("Without Bearings")
      layout.row(this.view_before_bearings = new Widget())
      layout.header("Pre-Automatic Manual Bearings")
      layout.row(new TextArea()
        .setValue(Bearings.toString(initial_settings.pre_automatic_bearing))
        .onChange(t => this.settings.update(s => s.pre_automatic_bearing = Bearings.parse(t.value))))
      layout.row(this.view_after_bearings_1 = new Widget())
      layout.header("Automatic Bearings")
      layout.row(this.automatic_bearing_view = new TextArea({readonly: true}).setEnabled(false))
      layout.row(this.view_after_bearings_2 = new Widget())
      layout.header("Post-Automatic Manual Bearings")
      layout.row(new TextArea()
        .setValue(Bearings.toString(initial_settings.post_automatic_bearing))
        .onChange(t => this.settings.update(s => s.post_automatic_bearing = Bearings.parse(t.value))))
      layout.row(this.view_after_bearings_3 = new Widget())

      layout.header("Font Meta")
      layout.row(this.font_meta_view = new TextArea({readonly: true})
        .css2({
          "height": "20em"
        })
        .on("click", () => this.font_meta_view.raw().select())
      )

      layout.header("Font Definition")
      layout.row(this.font_definition_view = new TextArea({readonly: true})
        .css2({
          "height": "20em"
        })
        .on("click", () => this.font_definition_view.raw().select())
      )


      this.settings.subscribe(s => this.updateResults(doFont(s)), true)
    }

    private updateResults(results: IntermediateResults) {
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

      this.automatic_bearing_view.setValue(Bearings.toString(results.automatic_bearings))
      this.font_meta_view.setValue(JSON.stringify(results.font_meta, null, 2))
      this.font_definition_view.setValue(JSON.stringify(results.font_definition))

      this.view_before_bearings.empty().append(box(results.without_bearings))
      this.view_after_bearings_1.empty().append(box(results.after_manual_bearings_1))
      this.view_after_bearings_2.empty().append(box(results.after_automatic_bearings))
      this.view_after_bearings_3.empty().append(box(results.after_manual_bearings_2))
    }
  }
}