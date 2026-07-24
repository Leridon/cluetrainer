import {CapturedImage} from "../../capture";
import {FontDefinition} from "alt1/ocr";
import {ChatAnchors} from "./ChatAnchors";

export class CapturedChatbox {
  public font: CapturedChatbox.ChatFont = null
  public lowest_baseline: number = null

  constructor(
    public body: CapturedImage,
    public readonly type: CapturedChatbox.Type) {}

  public visibleRows(): number {
    return ~~(this.body.size.y / this.font.lineheight)
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

    const section = this.body.getSubSection({origin: {x: 0, y: this.body.screen_rectangle.size.y - height}, size: {x: 7, y: height}})

    for (const font_needle of needles.brackets) {
      const pos = section.findNeedle(font_needle.img)

      if (pos.length == 0) continue

      const position = pos[0]

      const relative_baseline =
        position.screen_rectangle.origin.y
        - this.body.screen_rectangle.origin.y
        + font_needle.baseline_y_from_needle_top

      const n = Math.floor(
        (this.body.screen_rectangle.size.y - relative_baseline - 1)
        /
        font_needle.font.lineheight
      )

      this.lowest_baseline = relative_baseline + n * font_needle.font.lineheight

      this.font = font_needle.font

      return true
    }

    this.font = null
    this.lowest_baseline = null

    return false
  }
}

export namespace CapturedChatbox {
  export type Type = "main" | "cc" | "fc" | "gc" | "gcc"

  export type ChatFont = {
    fontsize: number,
    lineheight: number,
    icon_y_from_baseline: number,
    def: FontDefinition
  }

  export const fonts: ChatFont[] = [
    {fontsize: 10, lineheight: 14, icon_y_from_baseline: -8, def: require("alt1/fonts/chatbox/10pt.js")},
    {fontsize: 12, lineheight: 16, icon_y_from_baseline: -9, def: require("alt1/fonts/chatbox/12pt.js")},
    {fontsize: 14, lineheight: 18, icon_y_from_baseline: -10, def: require("alt1/fonts/chatbox/14pt.js")},
    {fontsize: 16, lineheight: 21, icon_y_from_baseline: -10, def: require("alt1/fonts/chatbox/16pt.js")},
    {fontsize: 18, lineheight: 23, icon_y_from_baseline: -11, def: require("alt1/fonts/chatbox/18pt.js")},
    {fontsize: 20, lineheight: 25, icon_y_from_baseline: -11, def: require("alt1/fonts/chatbox/20pt.js")},
    {fontsize: 22, lineheight: 27, icon_y_from_baseline: -12, def: require("alt1/fonts/chatbox/22pt.js")},
  ]

  export function getFont(size: number): ChatFont {
    return fonts.find(f => f.fontsize == size)
  }
}