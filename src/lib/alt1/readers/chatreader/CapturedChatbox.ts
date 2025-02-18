import {CapturedImage} from "../../capture";
import {FontDefinition} from "alt1/ocr";
import {ChatAnchors} from "./ChatAnchors";

export class CapturedChatbox {
  public font: CapturedChatbox.Font = null
  private offset: number = null

  constructor(
    public body: CapturedImage,
    public type: CapturedChatbox.Type) {}

  public visibleRows(): number {
    return ~~(this.body.size.y / this.font.lineheight)
  }

  public line(i: number): CapturedImage {
    if (this.font == null || this.offset == null) return null

    return this.body.getSubSection({
      origin: {x: 0, y: this.body.size.y - (i + 1) * this.font.lineheight - this.offset},
      size: {x: this.body.size.x, y: this.font.lineheight}
    })
  }

  public update(capture: CapturedImage) {
    this.body = capture.getScreenSection(this.body.screen_rectangle)
  }

  /**
   * Identify the used font size and vertical scroll offset for this chatbox.
   * @param needles The needle images containing image data for all bracket sizes. Needs to be provided by the caller to avoid async infecting the entire module
   */
  public identifyFontAndOffset(needles: ChatAnchors.Needles): boolean {

    const height = Math.min(this.body.screen_rectangle.size.y, 60)

    const section = this.body.getSubSection({origin: {x: 1, y: this.body.screen_rectangle.size.y - height}, size: {x: 3, y: height}})

    for (const font of needles.brackets) {
      const pos = section.findNeedle(font.img)

      if (pos.length == 0) continue

      const position = pos[0]

      this.font = font.font

      const delta = (this.body.screen_rectangle.origin.y + this.body.screen_rectangle.size.y) - position.screen_rectangle.origin.y

      this.offset = delta % font.font.lineheight

      return true
    }

    this.font = null
    this.offset = null

    return false
  }
}

export namespace CapturedChatbox {
  export type Type = "main" | "cc" | "fc" | "gc" | "gcc"

  export type Font = {
    fontsize: number,
    baseline_y: number,
    lineheight: number,
    icon_y: number,
    dy: number,
    def: FontDefinition
  }

  export const fonts: Font[] = [
    {fontsize: 12, lineheight: 16, icon_y: -9, baseline_y: 10, dy: -1, def: require("alt1/fonts/chatbox/12pt.js")},
    {fontsize: 14, lineheight: 18, icon_y: -10, baseline_y: 12, dy: -3, def: require("alt1/fonts/chatbox/14pt.js")},
    {fontsize: 10, lineheight: 14, icon_y: -8, baseline_y: 8, dy: 2, def: require("alt1/fonts/chatbox/10pt.js")},
    {fontsize: 16, lineheight: 21, icon_y: -10, baseline_y: 12, dy: -6, def: require("alt1/fonts/chatbox/16pt.js")},
    {fontsize: 18, lineheight: 23, icon_y: -11, baseline_y: 14, dy: -8, def: require("alt1/fonts/chatbox/18pt.js")},
    {fontsize: 20, lineheight: 25, icon_y: -11, baseline_y: 16, dy: -11, def: require("alt1/fonts/chatbox/20pt.js")},
    {fontsize: 22, lineheight: 27, icon_y: -12, baseline_y: 17, dy: -13, def: require("alt1/fonts/chatbox/22pt.js")},
  ]

  export function getFont(size: number): Font {
    return fonts.find(f => f.fontsize == size)
  }
}