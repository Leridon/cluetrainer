import {Finder} from "../../capture/Finder";
import {CapturedImage} from "../../capture";
import {ScreenRectangle} from "../../ScreenRectangle";
import {Vector2} from "../../../math";
import {async_lazy, lazy} from "../../../Lazy";
import * as lodash from "lodash";
import {CapturedChatbox} from "./CapturedChatbox";
import {ChatAnchors} from "./ChatAnchors";
import {Log} from "../../../util/Log";
import log = Log.log;

export class ChatboxFinder implements Finder<CapturedChatbox[]> {

  private constructor(
    public readonly needles: ChatAnchors.Needles,
  ) {
  }

  /**
   * Finds all chat boxes in the given image.
   * @param img The image to search for chat boxes.
   */
  find(img: CapturedImage): CapturedChatbox[] {

    // First, find plus/minus icons that indicate the top right of the chatbox. FIXME Currently, this fails when the button is hovered.
    const top_rights: { capture: ScreenRectangle, expanded: boolean }[] = [
      ...img.findNeedle(this.needles.tr_minus).map(img => ({capture: img.screen_rectangle, expanded: true})),
      ...img.findNeedle(this.needles.tr_plus).map(img => ({capture: img.screen_rectangle, expanded: false})),
    ]

    if (top_rights.length == 0) return []

    // Next, search for quickchat bubbles. We are interested in the ones in the bottom chat line.
    const initial_bubbles = img.findNeedle(this.needles.chatbubble)

    function isWhite(pixel: [number, number, number, number]): boolean {
      return pixel[0] == 255 && pixel[1] == 255 && pixel[2] == 255
    }

    // We need to filter out the quickchat bubbles used for quick responses.
    // To do so, we check for the colon directly to the right of the detected bubble and see if it matches our expected layout.
    const bubbles = initial_bubbles
      .map(b => b.screen_rectangle)
      .filter(bubble_location => {

        // Get a 1 pixel wide, 10 pixel high column of pixels to the right of the chatbubble. This strip should contain exactly to fully white pixels that make up the colon.
        const data = img.getSubSection(ScreenRectangle.move(
          bubble_location, {x: 11, y: 0}, {x: 1, y: 10}
        )).getData()

        // To distinguish this colon from the ones in the chat, we need to match for an exact order of pixels instead of just counting white pixels
        // From top to bottom, this array describes whether the respective pixel should or should not be white
        const colon_signature = [false, false, true, false, false, false, true, false, false]

        // Sometimes, the bubble is vertically off by 1 pixel. So we need to check 2 possible positions, which we iterate through with this loop
        for (let dy = 0; dy <= 1; dy++) {

          // Check for the colon_signature at the current dy.
          if (colon_signature.every((should_be_white, y) => {
            return isWhite(data.getPixel(0, y + dy)) == should_be_white
          })) {
            // If the signature fully matches, we've found a correct chatbox
            bubble_location.origin.y -= dy;
            return true
          }
        }

        // Chat is active, look for white border
        /*const pixels = img.getSubSection(ScreenRectangle.move(
          bubble_location, {x: 0, y: -6}, {x: 1, y: 2}
        )).getData()

        if (pixels.data[4] == 255) return true
        if (pixels.data[0] == 255) {
          bubble_location.origin.y -= 1
          return true
        }*/

        return false
      })

    if (bubbles.length == 0) return []

    type PositionCandidate = { taken: boolean, position: Vector2 }

    const bubble_map: { taken: boolean, position: Vector2 }[] = bubbles.map(b => ({taken: false, position: b.origin}))
    const tr_map: { taken: boolean, position: { capture: ScreenRectangle, expanded: boolean } }[] = top_rights.map(b => ({taken: false, position: b}))

    const viable_pairs: {
      bubble: PositionCandidate,
      top_right: { taken: boolean, position: { capture: ScreenRectangle, expanded: boolean } }
    }[] = []

    for (const top_right of tr_map) {
      for (const bubble of bubble_map) {
        if (bubble.position.x + 120 > top_right.position.capture.origin.x) continue
        if (bubble.position.y < top_right.position.capture.origin.y + 80) continue

        const area = ScreenRectangle.fromPixels(top_right.position.capture.origin, bubble.position)

        if (tr_map.some(tr => tr != top_right && ScreenRectangle.contains(area, tr.position.capture.origin))) continue

        viable_pairs.push({bubble: bubble, top_right: top_right})
      }
    }

    return viable_pairs.map(pair => {
      if (pair.bubble.taken || pair.top_right.taken) return []

      const nameread = null // OCR.readLine(nameline, CapturedChatbox.chatfont, [255, 255, 255], 110, 13, false, true);

      function kind_by_name(name: string): { offset: number; type: CapturedChatbox.Type } {
        switch (name) {
          case "Clan Chat":
            return {type: "cc", offset: 62}
          case "Friends Chat":
            return {type: "fc", offset: 76}
          case "Group Chat":
            return {type: "gc", offset: 69}
          case "Guest Clan Chat":
            return {type: "gcc", offset: 98}
          default:
            return null
        }
      }

      const kind = kind_by_name(nameread?.text)

      if (kind) {
        pair.bubble.taken = true
        pair.top_right.taken = true

        return [new CapturedChatbox(img.getSubSection(ScreenRectangle.fromPixels(
          Vector2.add(pair.top_right.position.capture.origin, {x: 13, y: 20}),
          Vector2.add(pair.bubble.position, {x: -kind.offset, y: -10}),
        )), kind.type)]
      }

      // Check for left boundary by looking for the game chat filter
      if (pair.top_right.position.expanded) {
        const width = Math.max(pair.bubble.position.x, 250)

        const area = img.getSubSection(
          {
            origin: {x: pair.bubble.position.x - width, y: pair.top_right.position.capture.origin.y - 2},
            size: {x: width, y: 16}
          }
        );

        const positions = [this.needles.gamefiltered, this.needles.gameall, this.needles.gameoff].map(anchor => lazy(() => area.findNeedle(anchor)))
          .find(r => r.get().length > 0)?.get()

        if (positions) {
          const left = lodash.maxBy(positions, pos => pos.screen_rectangle.origin.x)

          return [new CapturedChatbox(img.getSubSection(ScreenRectangle.fromPixels(
            Vector2.add(pair.top_right.position.capture.origin, {x: 13, y: 20}),
            Vector2.add(pair.bubble.position, {x: 0, y: -10}),
            Vector2.add(left.screen_rectangle.origin, {x: 0, y: 22}),
          )), "main")]
        }
      }

      // Last resort: Check for left boundary by looking for a timestamp
      {
        const width = Math.max(pair.bubble.position.x, 250)
        const height = pair.bubble.position.y - pair.top_right.position.capture.origin.y - 30

        const area = img.getSubSection(
          {
            origin: {x: pair.bubble.position.x - width, y: pair.top_right.position.capture.origin.y + 20},
            size: {x: width, y: Math.min(60, height)}
          }
        );

        const anchor = (() => {
          for (const anchor of this.needles.brackets) {
            const positions = area.findNeedle(anchor.img)

            if (positions.length > 0) return lodash.minBy(positions, p => p.screen_rectangle.origin.x)
          }

          return null
        })()

        if (anchor) {
          return [new CapturedChatbox(img.getSubSection(ScreenRectangle.fromPixels(
            Vector2.add(pair.top_right.position.capture.origin, {x: 13, y: 20}),
            Vector2.add(pair.bubble.position, {x: 0, y: -10}),
            Vector2.add(anchor.screen_rectangle.origin, {x: -1, y: 0}),
          )), "main")]
        }
      }

      return []
    }).flat()
  }

  static instance = async_lazy(async () => {
    const needles = await ChatAnchors.Needles.instance.get()

    return new ChatboxFinder(needles)
  })
}