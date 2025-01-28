import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken, NeedleImage, ScreenCaptureService} from "../capture";
import {OverlayGeometry} from "../OverlayGeometry";
import {util} from "../../util/util";
import {ScreenRectangle} from "../ScreenRectangle";
import {OCR} from "../OCR";
import {ColortTriplet} from "alt1/ocr";
import {async_lazy} from "../../properties/Lazy";
import {defaultcolors} from "alt1/chatbox";
import * as a1lib from "alt1";
import {Log} from "../../util/Log";
import over = OverlayGeometry.over;
import log = Log.log;
import A1Color = util.A1Color;
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import {ChatboxFinder} from "./chatreader/ChatboxFinder";
import {ChatAnchors} from "./chatreader/ChatAnchors";
import {CapturedChatbox} from "./chatreader/CapturedChatbox";
import {MessageBuffer} from "./chatreader/ChatBuffer";
import { Alt1Color } from "../Alt1Color";

/**
 * A service class to read chat messages. It will search for chat boxes periodically, so it will find the chat
 * again even if it is moved or font sizes change. To read messages, timestamps need to be turned on in game.
 * This is a hard requirement because the reader uses timestamps to differentiate repeated identical messages
 * and also to buffer messages so that scrolling the chat up and down does not cause messages to be read again.
 */
export class ChatReader extends DerivedCaptureService {
  private debug_mode: boolean = false

  private buffer = new MessageBuffer()

  new_message = this.buffer.new_message

  private last_search = Number.NEGATIVE_INFINITY
  private chatboxes: ChatReader.SingleChatboxReader[] = []

  private capture_interest: AbstractCaptureService.InterestToken<{ area: ScreenRectangle, interval: CaptureInterval } | null, CapturedImage>

  private initialization: AsyncInitialization<{
    needles: ChatAnchors.Needles,
    icons: ChatReader.ChatIcons,
    finder: ChatboxFinder
  }>

  constructor(private capturing: ScreenCaptureService, private search_interval: number = 6000) {
    super();

    this.new_message.on(msg => {
      if (!this.debug_mode) return

      console.log(msg.text)
    })

    this.initialization = async_init(async () => {
      const finder = await ChatboxFinder.instance.get()
      const needles = await ChatAnchors.Needles.instance.get()
      const icons = await ChatReader.ChatIcons.instance.get()

      this.capture_interest = this.addDataSource(capturing, () => null)

      return {
        needles: needles,
        icons: icons,
        finder: finder
      }
    })
  }

  processNotifications(interested_tokens: InterestedToken<AbstractCaptureService.Options, null>[]): null {
    const capture = this.capture_interest.lastNotification().value

    try {
      if (Date.now() - this.search_interval > this.last_search) {
        const current_boxes = this.initialization.get().finder.find(capture)

        // Remove readers that weren't found anymore
        this.chatboxes = this.chatboxes.filter(box => current_boxes.some(box2 => ScreenRectangle.equals(box.chatbox.body.screenRectangle(), box2.body.screenRectangle())))

        this.chatboxes.forEach(box => {
          box.chatbox.update(capture)
        })

        const new_readers = current_boxes.filter(box => !this.chatboxes.some(box2 => ScreenRectangle.equals(box.body.screenRectangle(), box2.chatbox.body.screenRectangle())))
          .map(c => new ChatReader.SingleChatboxReader(this.initialization.get().icons, c))

        new_readers.forEach(reader => reader.new_message.on(m => this.buffer.add(m)))

        this.chatboxes.push(...new_readers)

        this.chatboxes.forEach(box => box.chatbox.identifyFontAndOffset(this.initialization.get().needles))
        // TODO: If font can't be identified, display some kind of warning

      } else {
        this.chatboxes.forEach(box => {
          box.chatbox.update(capture)
        })
      }

      if (this.debug_mode) {
        this.debug_overlay.clear()

        this.chatboxes.forEach(box => {
          this.debug_overlay.rect2(box.chatbox.body.screenRectangle(), {
            color: Alt1Color.red,
            width: 1
          })
        })

        this.debug_overlay.render()
      }

      for (const box of this.chatboxes) box.read()

    } catch (e) {
      log().log(e)
    }

    return null
  }

  private debug_overlay: OverlayGeometry = over()

  setDebugEnabled(debug: boolean = true): this {
    this.debug_mode = debug

    return this
  }
}

export namespace ChatReader {
  export type ChatIcon = {
    image: NeedleImage,
    character: string
  }

  export type ChatIcons = ChatIcon[]

  export namespace ChatIcons {
    export const instance = async_lazy<ChatIcons>(async () => {

      return [
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badgevip.data.png"), character: "\u2730"}, //SHADOWED WHITE STAR
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badgepmod.data.png"), character: "\u2655"}, //WHITE CHESS QUEEN
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badgepmodvip.data.png"), character: "\u2655"}, //WHITE CHESS QUEEN
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badge_broadcast_gold.data.png"), character: "\u2746"}, //HEAVY CHEVRON SNOWFLAKE
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badge_broadcast_silver.data.png"), character: "\u2746"}, //HEAVY CHEVRON SNOWFLAKE
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badge_broadcast_bronze.data.png"), character: "\u2746"}, //HEAVY CHEVRON SNOWFLAKE
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badgeironman.data.png"), character: "\u26AF"}, //UNMARRIED PARTNERSHIP SYMBOL
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badgehcim.data.png"), character: "\u{1F480}"}, //SKULL
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/badge_hcimdeath.png"), character: "\u{1F480}"}, //SKULL
        {image: await NeedleImage.fromURL("alt1anchors/chat/icons/chat_link.data.png"), character: "\u{1F517}"}, //LINK SYMBOL
      ]
    })
  }

  import index = util.index;

  export class SingleChatboxReader {
    buffer = new MessageBuffer()

    new_message = this.buffer.new_message

    constructor(private readonly icons: ChatReader.ChatIcons,
                public readonly chatbox: CapturedChatbox) {

    }

    private readLine(i: number): string {
      const line = this.chatbox.line(i)
      const line_img = line.getData()

      const fodef = this.chatbox.font.def

      const fragments: string[] = []

      let scan_x = 0
      const baseline = this.chatbox.font.baseline_y

      const read_string = (colors: ColortTriplet[] = defaultcolors as ColortTriplet[]): boolean => {
        const data = OCR.readLine(line_img, fodef, colors, scan_x, baseline, true, false);

        if (data.text) {
          fragments.push(data.text)

          scan_x = index(data.fragments, -1).xend

          return true
        }

        return false
      };

      const read_icon = (): boolean => {

        for (const addspace of [true, false]) {
          const badgeleft = scan_x + (addspace ? fodef.spacewidth : 0)

          const matched_icon = this.icons.find(icon => {
              return a1lib.ImageDetect.simpleCompare(line_img, icon.image.underlying, badgeleft, baseline + this.chatbox.font.icon_y) < Number.POSITIVE_INFINITY
            }
          )

          if (matched_icon) {
            if (addspace) fragments.push(" ")

            fragments.push(matched_icon.character)

            scan_x = badgeleft + matched_icon.image.underlying.width

            return true;
          }
        }

        return false
      }

      const timestamp_open = OCR.readChar(line_img, fodef, [255, 255, 255], scan_x, baseline, false, false);

      const has_timestamp = timestamp_open?.chr == "["

      if (has_timestamp) {
        fragments.push("[")

        scan_x += timestamp_open.basechar.width
      }

      // Read start text or text after opening bracket
      read_string(ChatReader.all_colors)

      while (scan_x < this.chatbox.body.screen_rectangle.origin.x + this.chatbox.body.screen_rectangle.size.x - this.chatbox.font.def.width) {
        if (!read_icon()) break
        if (!read_string()) break
      }

      return fragments.join("")
    }

    private commit(message: string): boolean {
      let m = message.match(/^\[(\d{2}):(\d{2}):(\d{2})]/);

      if (!m) return false // Reject messages without a timestamp

      const timestamp = (+m[1]) * 60 * 60 + (+m[2]) * 60 + (+m[3]);

      return this.buffer.add({
        timestamp: timestamp,
        text: message.substring(11) // Strip timestamp from message itself
      })
    }

    read(): void {
      if (!this.chatbox.font) return

      let row = 0

      const max_rows = this.chatbox.visibleRows()

      while (row < max_rows) {
        const components: string[] = []

        while (row < max_rows && !index(components, -1)?.startsWith("[")) {
          components.push(this.readLine(row))

          row++
        }

        const line = components.reverse().join(" ")

        if (!line.startsWith("[")) return

        const actually_new_message = this.commit(line)

        if (!actually_new_message) break
      }
    }
  }

  export const all_colors: ColortTriplet[] = [
    [255, 176, 0], // orange, ex brooch of the gods
    [235, 47, 47], // weird red, ex divine blessing disappearing
    [0, 255, 0],
    [0, 255, 255],
    [0, 175, 255],
    [0, 0, 255],
    [255, 82, 86],
    [159, 255, 159],
    [0, 111, 0],
    [255, 143, 143],
    [255, 152, 31],
    [255, 111, 0],
    [255, 255, 0],
    //[239, 0, 0],//messes up broadcast detection [255,0,0]
    [239, 0, 175],
    [255, 79, 255],
    [175, 127, 255],
    //[48, 48, 48],//fuck this color, its unlegible for computers and people alike
    [127, 255, 255],
    [128, 0, 0],
    [255, 255, 255],
    [127, 169, 255],
    [255, 140, 56], //orange drop received text
    [255, 0, 0], //red achievement world message
    [69, 178, 71], //blueish green friend broadcast
    [164, 153, 125], //brownish gray friends/fc/cc list name
    [215, 195, 119], //interface preset color
    [45, 185, 20], // Green in "Completion time" for bosses
    [254, 128, 0]
  ]
}