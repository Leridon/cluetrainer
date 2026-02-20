import {Finder} from "../../capture/Finder";
import {CapturedImage} from "../../capture";
import {ScreenRectangle} from "../../ScreenRectangle";
import {Vector2} from "../../../math";
import {async_lazy, lazy} from "../../../Lazy";
import {CapturedChatbox} from "./CapturedChatbox";
import {ChatAnchors} from "./ChatAnchors";
import {Alt1Overlay} from "../../overlay/Alt1Overlay";
import {Log} from "../../../util/Log";
import log = Log.log;

export class ChatboxFinder implements Finder<CapturedChatbox[]> {
  debug_overlay = lazy(() => new Alt1Overlay().start())
  debug = false;

  private constructor(
    public readonly needles: ChatAnchors.Needles,
  ) {
  }

  /**
   * Finds all chat boxes in the given image.
   * @param img The image to search for chat boxes.
   */
  find(img: CapturedImage): CapturedChatbox[] {
    return Alt1Overlay.debug(() => this.debug_overlay.get(), this.debug, (debug_geometry) : CapturedChatbox[] => {
      // First, find plus/minus icons that indicate the top right of the chatbox.
      const top_rights: CapturedImage[] = [
        this.needles.tr_minus,
        this.needles.tr_minus_hover,
        this.needles.tr_plus,
        this.needles.tr_plus_hover
      ].flatMap(needle => img.findNeedle(needle))

      if (this.debug) console.log(`Found top_rights ${top_rights.length}`)

      if (top_rights.length == 0) return []

      const relevant_bubble_area: ScreenRectangle = {
        origin: {
          x: img.screen_rectangle.origin.x,
          y: Math.min(...top_rights.map(tr => tr.screen_rectangle.origin.y))
        },
        size: {
          x: Math.min(...top_rights.map(tr => tr.screen_rectangle.origin.x)),
          y: img.screen_rectangle.size.y - Math.min(...top_rights.map(tr => tr.screen_rectangle.origin.y))
        }
      }

      // Next, search for quickchat bubbles. We are interested in the ones in the bottom chat line.

      const bubbles = img.getScreenSection(relevant_bubble_area).findNeedle(this.needles.chatbubble)
      if (this.debug) {
        console.log(`Found bubbles ${bubbles.length}`)

        bubbles.forEach(bub => bub.debugOverlay2(debug_geometry))
      }

      if (bubbles.length == 0) return []

      if (this.debug) {
        console.log(`Found filtered bubbles ${bubbles.length}`)
      }

      const initial_bls = img.getScreenSection(relevant_bubble_area).findNeedle(this.needles.bot_left)
        .filter(bl =>
          bubbles.some(bubble => {
            const delta = Vector2.sub(bubble.screen_rectangle.origin, bl.screen_rectangle.origin)

            return delta.y <= -12 && delta.y >= -16
              && delta.x >= 14 && delta.x <= 110
          })
        )

      if (this.debug) {
        console.log(`Found bot_lefts ${initial_bls.length}`)

        initial_bls.forEach(bub => bub.debugOverlay2(debug_geometry))
      }

      function pairByPredicate<A, B, C>(
        as: A[],
        bs: B[],
        combinator: (a: A, b: B) => C,
        predicate: (c: C, as: A[], bs: B[]) => boolean
      ): C[] {
        const a_map: { used: boolean, a: A }[] = as.map(a => ({used: false, a}))
        const b_map: { used: boolean, b: B }[] = bs.map(b => ({used: false, b}))

        const pairs: C[] = []

        for (const a of a_map) {
          if (a.used) continue

          for (const b of b_map) {
            if (b.used) continue

            const c = combinator(a.a, b.b)

            if (predicate(c, as, bs)) {
              pairs.push(c)
              a.used = true
              b.used = true
            }
          }
        }

        return pairs
      }

      type Pair = {
        bot_left: CapturedImage,
        top_right: CapturedImage,
        body: CapturedImage
      }

      const areas = pairByPredicate(top_rights, initial_bls, (tr, bl): Pair => {
        const body_area = ScreenRectangle.fromPixels(
          Vector2.add(tr.screen_rectangle.origin, ChatboxFinder.BODY_TR_FROM_TR_ANCHOR),
          Vector2.add(bl.screen_rectangle.origin, ChatboxFinder.BODY_BL_FROM_BL_ANCHOR),
        )

        return {
          bot_left: bl,
          top_right: tr,
          body: img.getScreenSection(body_area)
        }
      }, (pair) => {
        return top_rights.every(tr => !ScreenRectangle.contains(pair.body.screen_rectangle, tr.screen_rectangle.origin))
          && initial_bls.every(bl => !ScreenRectangle.contains(pair.body.screen_rectangle, bl.screen_rectangle.origin))
      })

      if (this.debug) {
        console.log(`Found chatboxes ${areas.length}`)
      }

      return areas.map(pair => {
        log().log("", "", pair.body.getData())
        return new CapturedChatbox(pair.body, "main")
      })
    })
  }

  static instance = async_lazy(async () => {
    const needles = await ChatAnchors.Needles.instance.get()

    return new ChatboxFinder(needles)
  })
}

export namespace ChatboxFinder {
  export const BODY_BL_FROM_BL_ANCHOR: Vector2 = {x: 4, y: -25}

  export const BODY_TR_FROM_TR_ANCHOR: Vector2 = {x: 15, y: 20}
}