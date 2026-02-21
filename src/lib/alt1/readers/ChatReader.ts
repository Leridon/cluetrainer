import {AbstractCaptureService, CapturedImage, CaptureInterval, DerivedCaptureService, InterestedToken, NeedleImage} from "../capture";
import {util} from "../../util/util";
import {ScreenRectangle} from "../ScreenRectangle";
import {OCR} from "../OCR";
import {ColortTriplet} from "alt1/ocr";
import {async_lazy, lazy} from "../../Lazy";
import * as a1lib from "alt1";
import {Log} from "../../util/Log";
import {ChatboxFinder} from "./chatreader/ChatboxFinder";
import {ChatAnchors} from "./chatreader/ChatAnchors";
import {CapturedChatbox} from "./chatreader/CapturedChatbox";
import {MessageBuffer} from "./chatreader/ChatBuffer";
import lodash from "lodash";
import {Alt1} from "../Alt1";
import {Alt1ScreenCaptureService} from "../capture/Alt1ScreenCaptureService";
import {Alt1Color} from "../Alt1Color";
import {ewent} from "../../reactive";
import {Alt1Overlay} from "../overlay/Alt1Overlay";
import log = Log.log;
import AsyncInitialization = util.AsyncInitialization;
import async_init = util.async_init;
import Message = MessageBuffer.Message;

/**
 * A service class to read chat messages. It will search for chat boxes periodically, so it will find the chat
 * again even if it is moved or font sizes change. To read messages, timestamps need to be turned on in game.
 * This is a hard requirement because the reader uses timestamps to differentiate repeated identical messages
 * and also to buffer messages so that scrolling the chat up and down does not cause messages to be read again.
 */
export class ChatReader extends DerivedCaptureService {
  public debug_mode: boolean = false

  private buffer = new MessageBuffer()

  new_message = this.buffer.new_message
  new_message_bulk = ewent<Message[]>()

  private collected_unreported_messages: MessageBuffer.Message[] = []

  private last_search = Number.NEGATIVE_INFINITY
  private chatboxes: ChatReader.SingleChatboxReader[] = []

  private capture_interest: AbstractCaptureService.InterestToken<{ area: ScreenRectangle, interval: CaptureInterval } | null, CapturedImage>

  private initialization: AsyncInitialization<{
    needles: ChatAnchors.Needles,
    icons: ChatReader.ChatIcons,
    finder: ChatboxFinder
  }>

  private constructor(capturing: Alt1ScreenCaptureService, private search_interval: number = 6000) {
    super();

    this.new_message.on(msg => {
      this.collected_unreported_messages.push(msg)
      if (this.debug_mode) log().log(Message.toString(msg))
    })

    this.initialization = async_init(async () => {
      const finder = await ChatboxFinder.instance.get()
      const needles = await ChatAnchors.Needles.instance.get()
      const icons = await ChatReader.ChatIcons.instance.get()

      this.capture_interest = this.addDataSource(capturing, (time) => {
        const should_refind = time.time - this.search_interval > this.last_search || this.chatboxes.length == 0

        if (should_refind) return null

        const area = ScreenRectangle.union(...this.chatboxes.map(c => c.chatbox.body.screen_rectangle))

        if (area.origin.x > 3000) debugger

        return {area: ScreenRectangle.union(...this.chatboxes.map(c => c.chatbox.body.screen_rectangle)), interval: null}
      })

      return {
        needles: needles,
        icons: icons,
        finder: finder
      }
    })
  }

  processNotifications(interested_tokens: InterestedToken<AbstractCaptureService.Options, null>[]): null {
    const notification = this.capture_interest.lastNotification()
    const capture = notification.value

    try {
      if (notification.time.time - this.search_interval > this.last_search || this.chatboxes.length == 0) {

        this.last_search = notification.time.time

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

        this.chatboxes.forEach((box) =>
          box.chatbox.identifyFontAndOffset(this.initialization.get().needles)
        )
        // TODO: If font can't be identified, display some kind of warning

      } else {
        this.chatboxes.forEach(box => {
          box.chatbox.update(capture)
        })
      }

      Alt1Overlay.debug(() => this.debug_overlay.get(), this.debug_mode, debug_geometry => {
        this.chatboxes.forEach(box => {
          debug_geometry.rectangle(box.chatbox.body.screenRectangle(), {
            color: Alt1Color.red,
            width: 1
          })
        })
      })

      for (const box of this.chatboxes) box.read()

      if (this.collected_unreported_messages.length > 0) {
        this.new_message_bulk.trigger(this.collected_unreported_messages)
        this.collected_unreported_messages = []
      }

    } catch (e) {
      log().log(e)
    }

    return null
  }

  private debug_overlay = lazy(() => new Alt1Overlay().start())

  setDebugEnabled(debug: boolean = true): this {
    this.debug_mode = debug

    return this
  }

  static readonly _instance = lazy(() => new ChatReader(Alt1.instance().capturing))

  static instance(): ChatReader {
    return ChatReader._instance.get()
  }
}

export namespace ChatReader {
  import findBestMatch = util.findBestMatch;
  import index = util.index;
  export type ChatIcon = {
    image: NeedleImage,
    character: string
  }

  export type ChatIcons = ChatIcon[]

  export namespace ChatIcons {
    export const instance = async_lazy<ChatIcons>(async () => {

      return [
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_broadcast_bronze.data.png"), character: "\u2746"}, //HEAVY CHEVRON SNOWFLAKE
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_broadcast_death.data.png"), character: "\u{1F480}"}, //SKULL
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_broadcast_gold.data.png"), character: "\u2746"}, //HEAVY CHEVRON SNOWFLAKE
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_broadcast_silver.data.png"), character: "\u2746"}, //HEAVY CHEVRON SNOWFLAKE
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgegim.data.png"), character: "\u3289"}, //CIRCLED IDEOGRAPH TEN
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgehcim.data.png"), character: "\u{1F480}"}, //SKULL
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgeironman.data.png"), character: "\u26AF"}, //UNMARRIED PARTNERSHIP SYMBOL
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgepmod.data.png"), character: "\u2655"}, //WHITE CHESS QUEEN
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgepmodvip.data.png"), character: "\u2655"}, //WHITE CHESS QUEEN
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgergim.data.png"), character: "\u328F"}, //CIRCLED IDEOGRAPH EARTH
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badgevip.data.png"), character: "\u2730"}, //SHADOWED WHITE STAR
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/chat_link.data.png"), character: "\u{1F517}"}, //LINK SYMBOL
        {image: await NeedleImage.fromURL("/alt1anchors/chat/chatbubble.png"), character: "\u{1F5E8}"}, // Left Speech Bubble
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_dragon_trophy.png"), character: "\u{1F409}"}, // Dragon
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_combat_achievements_grandmaster.png"), character: "\u{1F6E1}"}, // Shield
        {image: await NeedleImage.fromURL("/alt1anchors/chat/icons/badge_combat_achievements_master.png"), character: "\u{2694}"}, // Crossed swords
      ]
    })

    export const ironman_icons = [
      "\u{1F480}", "\u26AF", "\u3289", "\u328F"
    ]
  }

  export class SingleChatboxReader {
    buffer = new MessageBuffer()

    new_message = this.buffer.new_message

    consecutive_messages = ewent<Message[]>()

    constructor(private readonly icons: ChatReader.ChatIcons,
                public readonly chatbox: CapturedChatbox) {

    }

    private readLine(i: number): Message.Fragment[] {
      const body_img = this.chatbox.body.getData()

      const font_definition = this.chatbox.font.def

      const fragments: Message.Fragment[] = []

      let scan_x = 0
      const baseline = this.chatbox.lowest_baseline - i * this.chatbox.font.lineheight

      const read_string = (colors: ColortTriplet[] = ChatReader.all_colors as ColortTriplet[]): boolean => {
        const data = OCR.readLine(body_img, font_definition, colors, scan_x, baseline, true, false);

        if (data.text) {
          data.fragments.forEach(frag => {
            fragments.push({
              text: frag.text,
              color: frag.color
            })
          })


          scan_x = index(data.fragments, -1).xend

          return true
        }

        return false
      };

      const read_icon = (): boolean => {
        const MAX_AVERAGE_DIFFERENCE = 80
        const MAX_PIXEL_DIFFERENCE = 120

        for (const addspace of [true, false]) {
          const badgeleft = scan_x + (addspace ? font_definition.spacewidth : 0)

          const matched_icon = findBestMatch(this.icons, icon =>
              a1lib.ImageDetect.simpleCompare(body_img, icon.image.underlying, badgeleft, baseline + this.chatbox.font.icon_y_from_baseline, MAX_PIXEL_DIFFERENCE)
            , MAX_AVERAGE_DIFFERENCE, true)

          if (matched_icon) {
            if (addspace) fragments.push({text: " ", color: null})

            fragments.push({text: matched_icon.value.character, color: null})

            scan_x = badgeleft + matched_icon.value.image.underlying.width

            return true;
          }
        }

        return false
      }

      const timestamp_open = OCR.readChar(body_img, font_definition, [255, 255, 255], scan_x, baseline, false, false);

      const has_timestamp = timestamp_open?.chr == "["

      if (has_timestamp) {
        fragments.push({text: "[", color: [255, 255, 255]})

        scan_x += timestamp_open.basechar.width
      }

      // Read start text or text after opening bracket
      read_string(ChatReader.all_colors)

      while (scan_x < this.chatbox.body.screen_rectangle.origin.x + this.chatbox.body.screen_rectangle.size.x - this.chatbox.font.def.width) {
        if (!read_icon()) break
        if (!read_string(ChatReader.all_colors)) break
      }

      return fragments
    }

    private commit(message: { text: string, fragments: Message.Fragment[] }): MessageBuffer.Message | null {
      const now = Date.now()

      const m = message.text.match(/^\[(\d{2}):(\d{2}):(\d{2})]/);

      if (!m) return null // Reject messages without a timestamp

      const hours = +m[1]
      const minutes = +m[2]
      const seconds = +m[3]

      function addDays(date: Date, days: number): Date {
        const new_date = new Date(date.valueOf());
        new_date.setDate(new_date.getDate() + days);
        return new_date;
      }

      const today = new Date(Date.now())

      today.setHours(hours)
      today.setMinutes(minutes)
      today.setSeconds(seconds)
      today.setMilliseconds(0)

      const date = lodash.minBy([today, addDays(today, -1), addDays(today, 1)], date => Math.abs(now - date.valueOf()))

      return this.buffer.add({
        local_timestamp: {
          stamp: hours * 60 * 60 + minutes * 60 + seconds,
          hours, minutes, seconds
        },
        fragments: message.fragments,
        timestamp: date.valueOf(),
        text: message.text.substring(11) // Strip timestamp from message itself
      })
    }

    read(): void {
      if (!this.chatbox.font) return

      let row = 0

      const max_rows = this.chatbox.visibleRows()

      const new_messages: MessageBuffer.Message[] = []

      while (row < max_rows) {
        const component_lines: Message.Fragment[][] = []

        while (row < max_rows && !index(component_lines, -1)?.[0]?.text.startsWith("[")) {
          component_lines.push(this.readLine(row))

          row++
        }

        const line = component_lines.reverse().map(l => l.map(f => f.text).join("")).join(" ")

        if (!line.startsWith("[")) return

        const actually_new_message = this.commit({text: line, fragments: component_lines.flat()})

        if (!actually_new_message) break

        new_messages.push(actually_new_message)
      }

      if (new_messages.length > 0) {
        this.consecutive_messages.trigger(new_messages.reverse())
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
    [254, 128, 0],
    [223, 112, 0],
    [51, 199, 20],
    [60, 183, 30]
  ]
}