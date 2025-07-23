import Behaviour from "../lib/ui/Behaviour";
import {CaptureInterval} from "../lib/alt1/capture";
import {ChatReader} from "../lib/alt1/readers/ChatReader";
import Widget from "../lib/ui/Widget";
import * as jquery from "jquery";
import TextField from "../lib/ui/controls/TextField";
import Properties from "../trainer/ui/widgets/Properties";
import {observe} from "../lib/reactive";
import {BigNisButton} from "../trainer/ui/widgets/BigNisButton";
import {Notification, NotificationBar} from "../trainer/ui/NotificationBar";
import KeyValueStore from "../lib/util/KeyValueStore";
import {util} from "../lib/util/util";
import {C} from "../lib/ui/constructors";
import {storage} from "../lib/util/storage";
import * as lodash from "lodash";
import {List} from "../lib/ui/List";
import {ClickToCopy} from "../lib/ui/ClickToCopy";
import {MessageBuffer} from "../lib/alt1/readers/chatreader/ChatBuffer";
import {ExpandIcon, NislIcon} from "../trainer/ui/nisl";
import {ExpansionBehaviour} from "../lib/ui/ExpansionBehaviour";
import {Alt1} from "../lib/alt1/Alt1";
import {LogViewer} from "../devtools/LogViewer";
import {Log} from "../lib/util/Log";
import notification = Notification.notification;
import findBestMatch = util.findBestMatch;
import stringSimilarity = util.stringSimilarity;
import formatTimeWithoutMilliseconds = util.formatTimeWithoutMilliseconds;
import bold = C.bold;
import span = C.span;
import inlineimg = C.inlineimg;
import hbox = C.hbox;
import Message = MessageBuffer.Message;
import renderTimespan = util.renderTimespan;
import spacer = C.spacer;
import log = Log.log;

const item_mapping: {
  item: string,
  broadcast_text: string
}[] = [
  {item: "Barrows dye", broadcast_text: "Barrows dye"},
  {item: "Shadow dye", broadcast_text: "Shadow dye"},
  {item: "Ice dye", broadcast_text: "Ice dye"},
  {item: "Third Age dye", broadcast_text: "Third age dye"},
  {item: "Blood dye", broadcast_text: "Blood dye"},
  {item: "Backstab cape", broadcast_text: "Backstab cape"},
  {item: "Sack of effigies", broadcast_text: "Effigies Cape"},
  {item: "Explosive barrel", broadcast_text: "Explosive Barrel Cape"},
  {item: "Third age full helmet", broadcast_text: "Third Age full helmet"},
  {item: "Third age platebody", broadcast_text: "Third Age platebody"},
  {item: "Third age platelegs", broadcast_text: "Third Age platelegs"},
  {item: "Third age kiteshield", broadcast_text: "Third Age kiteshield"},
  {item: "Third age ranger coif", broadcast_text: "Third Age ranger coif"},
  {item: "Third age ranger body", broadcast_text: "Third Age range top"},
  {item: "Third age ranger body", broadcast_text: "Third Age ranger body"},
  {item: "Third age ranger chaps", broadcast_text: "Third Age ranger chaps"},
  {item: "Third age vambraces", broadcast_text: "Third Age vambraces"},
  {item: "Third age mage hat", broadcast_text: "Third Age mage hat"},
  {item: "Third age robe top", broadcast_text: "Third Age robe top"},
  {item: "Third age robe", broadcast_text: "Third Age robe"},
  {item: "Third age amulet", broadcast_text: "Third Age amulet"},
  {item: "Third age druidic wreath", broadcast_text: "Third Age druidic wreath"},
  {item: "Third age druidic robe top", broadcast_text: "Third Age druidic robe top"},
  {item: "Third age druidic robe bottom", broadcast_text: "Third Age druidic robe"},
  {item: "Third age druidic cloak", broadcast_text: "Third Age druidic cloak"},
  {item: "Third age druidic staff", broadcast_text: "Third Age druidic staff"},
  {item: "Second-Age full helm", broadcast_text: "Second Age full helm"},
  {item: "Second-Age platebody", broadcast_text: "Second Age platebody"},
  {item: "Second-Age platelegs", broadcast_text: "Second Age platelegs"},
  {item: "Second-Age sword", broadcast_text: "Second Age sword"},
  {item: "Second-Age range coif", broadcast_text: "Second Age range coif"},
  {item: "Second-Age range top", broadcast_text: "Second Age range top"},
  {item: "Second-Age range legs", broadcast_text: "Second Age range legs"},
  {item: "Second-Age bow", broadcast_text: "Second Age shortbow"},
  {item: "Second-Age mage mask", broadcast_text: "Second Age mage hat"},
  {item: "Second-Age robe top", broadcast_text: "Second Age robe top"},
  {item: "Second-Age robe bottom", broadcast_text: "Second Age robe bottoms"},
  {item: "Second-Age staff", broadcast_text: "Second Age staff"},
  {item: "Orlando Smith's hat", broadcast_text: "Orlando Smith's hat"},
  {item: "Golden Compass", broadcast_text: "golden compass"},

]

namespace Backend {
  export const LOCAL_TEST_TOKEN = "testtoken"
  export const TEST_EVENT_TOKEN = "9deac295-16f6-4090-9775-3d33514efa2f"
  const host = "https://api.cluetrainer.app"

  export async function verify_login(token: string): Promise<User> {
    if (token == LOCAL_TEST_TOKEN) return {
      token: token,
      name: "Zyklop Marco",
      event: {
        name: "Clue Chasers Winter Opening",
        date: {
          from: 1728399531613,
          to: 1828399531613
        }
      }
    }
    else {
      const res = await fetch(`${host}/api/broadcastreader/verify_token`, {
        method: "POST",
        body: JSON.stringify({
          token: token
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
      });

      if (!res.ok) return null

      return (await res.json()) as User
    }

    return null
  }

  export async function submit(user: User, broadcasts: DetectedBroadcast[]): Promise<boolean> {
    if (user.token == LOCAL_TEST_TOKEN) return true

    const res = await fetch(`${host}/api/broadcastreader/broadcasts`, {
      method: "POST",
      body: JSON.stringify({
        token: user.token,
        broadcasts: broadcasts
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });

    return res.ok
  }
}

type User = {
  token: string,
  name: string,
  event: Event
}

type Event = {
  name: string,
  date: {
    from: number,
    to: number
  },
}

type DetectedBroadcast = {
  message_timestamp: number,
  player: string,
  item: string,
  deleted?: boolean
}

namespace DetectedBroadcast {
  export function isSame(a: DetectedBroadcast, b: DetectedBroadcast): boolean {
    return Math.abs(a.message_timestamp - b.message_timestamp) < 5000 && a.item == b.item && a.player == b.player
  }
}

class LoginWidget extends Widget {
  storage = new storage.Variable<User>("broadcastreaderuser", () => null)

  user = observe<User>(null)

  constructor() {
    super();

    this.css2({
      "width": "100%"
    })

    this.user.subscribe(user => this.storage.set(user))

    this.user.subscribe(u => this.render(u), true)

    const cached_user = this.storage.get()

    if (cached_user) this.login(cached_user.token)
  }

  login = async (token: string) => {
    const user = await Backend.verify_login(token)

    console.log(`Login: ${user?.name}`)

    if (!user) notification("Invalid token", "error").show()
    else this.user.set(user)
  }

  updateTime() {
    const user = this.user.value()

    if (!user || !this.timeSpan) return

    const now = Date.now()

    if (now < this.user.value().event.date.from) {
      this.timeSpan.text(`Event starts in ${renderTimespan(user.event.date.from - now)}.`)
    } else if (now < user.event.date.to) {
      this.timeSpan.text(`Event ends in ${renderTimespan(user.event.date.to - now)}.`)
    } else {
      this.timeSpan.text(`Event ended ${renderTimespan(now - user.event.date.to)} ago.`)
    }
  }

  private timeSpan: Widget

  render(user: User = this.user.value()) {
    this.empty()

    const layout = new Properties().appendTo(this)

    if (!user) {
      const password_input = new TextField(true)
        .onConfirm(token => this.login(token))

      layout.row(password_input)

      layout.row(new BigNisButton("Start tracking", "confirm").onClick(() => this.login(password_input.get())))
    } else {
      layout.row(`Logged in as '${user.name}' for '${user.event.name}'`)

      layout.row(this.timeSpan = span())

      this.updateTime()

      layout.row(new BigNisButton("Stop Tracking", "cancel").onClick(() => {
        this.user.set(null)
      }))
    }
  }
}

type EventBuffer = {
  user: User,
  detected: DetectedBroadcast[]
}

namespace EventBuffer {
  export function add(buffer: EventBuffer, detection: DetectedBroadcast): boolean {
    const is_new = !buffer.detected.some(existing => DetectedBroadcast.isSame(existing, detection))

    if (is_new) {
      buffer.detected.push(detection)

      buffer.detected = lodash.sortBy(buffer.detected, e => -e.message_timestamp)
    }

    return is_new
  }
}

export class BroadcastReaderApp extends Behaviour {
  login: LoginWidget
  chatreader: ChatReader
  storage = new KeyValueStore("broadcastreadercache")

  detection_table: Widget

  private buffer: {
    user: User,
    detected: DetectedBroadcast[]
  }

  protected begin() {
    if (Alt1.exists()) {
      alt1.identifyAppUrl("appconfig.broadcastreader.json");
    }

    NotificationBar.instance().appendTo(jquery("body"))


    document.body.addEventListener("keydown", async e => {
      if (e.key == "F6") {
        log().log("Log exported")

        LogViewer.do(log().get())
      }
    })

    setInterval(() => {
      this.login.updateTime()
    }, 1000)

    const container = c().css("width", "100%").css2({
      "overflow-y": "auto",
      "overflow-x": "hidden",
    }).appendTo(Widget.wrap(jquery("#main-content")))

    const layout = new Properties().css("width", "100%").appendTo(container)

    layout.header("CC event broadcast reader")

    if (window.alt1) {
      /*
      layout.header("Emergency")

      layout.paragraph(text_link("Click here", () => {}), " to access the emergency kill switch in case the backend behaves horribly wrong.")

      layout.row(new BigNisButton("Emergency Kill Switch", "cancel"))

       */

      const expand = new ExpandIcon().setExpanded(true)
      const list = new List()
        .item("When you are on the dedicated world, login using the access token provided to you. The tracker will start immediately.")
        .item("If you hop to a different world at any time during the event, please stop the tracker by logging out.")
        .item("Make sure chat timestamps are turned on or the chat reader won't work.")
        .item("The chat reader works best with 12pt font size. 10pt and 22pt are known to cause issues.")
        .item("Make sure world broadcasts are using the ", span("standard broadcast color").css("color", "rgb(255, 140, 56)"), ".")
        .item("Make sure no other broadcast types are using this color.")
        .item("You can use the token ", new ClickToCopy(Backend.LOCAL_TEST_TOKEN), " to test the reader locally without submitting to the backend.")
        .item("The token ", new ClickToCopy(Backend.TEST_EVENT_TOKEN), " logs you in as a generic test user for a testing event connected to the backend.")

      layout.header(hbox(spacer().css("margin-right", "15px"), "Instructions", spacer(), expand))

      ExpansionBehaviour.vertical({
        target: list,
        starts_collapsed: false
      }).bindToClickable(expand)
        .onChange(collapsed => expand.setExpanded(!collapsed))

      layout.row(list)

      layout.header("Login")

      const login = this.login = new LoginWidget()

      layout.row(login)

      layout.row(this.detection_table = c())

      login.user.subscribe(async user => {
        if (user) {
          const existing_buffer = await this.storage.get<EventBuffer>(user.token)

          if (existing_buffer) {
            this.buffer = existing_buffer

            this.buffer.user = user

            Backend.submit(user, existing_buffer.detected)
          } else {
            this.buffer = {
              user: user,
              detected: []
            }
          }
        } else {
          this.buffer = null
        }

        this.renderDetections()
      })

      this.chatreader = ChatReader.instance().setDebugEnabled()

      this.chatreader.new_message.on(message => {
        if (!this.buffer) return

        // Discard messages outside the event time
        if (message.timestamp < this.buffer.user.event.date.from || message.timestamp > this.buffer.user.event.date.to) return

        console.log(message.text)

        const match = message.text.match("\u2746News: [\u{1F480}\u26AF\u3289\u328F]?([^\u{1F480}\u26AF\u3289\u328F]*) comp[il]eted a Treasure Trai[il] and received(( a)|( an))? (.*)!")

        // Discard messages not matching any
        if (!match) {
          return
        }

        const color = Message.color(message)
        const player = match[1]
        const item = match[5]

        if (!lodash.isEqual([255, 140, 56], color) && !(lodash.isEqual([255, 0, 0], color) && item.includes("Orlando"))) {
          console.log(`Does not match color: ${color.join(", ")}`)
          return
        }

        const best = findBestMatch(item_mapping, m => stringSimilarity(m.broadcast_text, item), 0.9)

        // Discard if matching item could not be found
        if (!best) {
          console.log(`no matching item found for ${item}`)
          return;
        }

        const is_new = EventBuffer.add(this.buffer, {
          item: best.value.item,
          player: player,
          message_timestamp: message.timestamp
        })

        if (is_new) {
          console.log(`Submitting ${best.value.item} for ${player}`)

          this.saveChanges()
        } else {
          console.log(`Discarding because ${best.value.item} isn't new`)
        }
      })

      this.chatreader.subscribe({options: () => ({interval: CaptureInterval.fromApproximateInterval(100), paused: () => login.user.value() == null})})
    } else {
      layout.row(
        c(`<a href='${this.addToAlt1Link()}'></a>`)
          .append(new BigNisButton("", "confirm")
            .setContent(hbox(
              inlineimg("/assets/icons/Alt1.png"),
              "Add to Alt1 Toolkit"
            )))
      )

      layout.paragraph("Alternatively, visit ",
        new ClickToCopy(window.location.toString()),
        " in Alt1's builtin browser to get an installation prompt.")
    }
  }

  private addToAlt1Link(): string {
    return `alt1://addapp/${window.location.protocol}//${window.location.host}${window.location.pathname.slice(0, window.location.pathname.lastIndexOf("/") + 1)}appconfig.json`
  }

  private renderDetections() {
    this.detection_table.empty()

    if (!this.buffer) return

    const layout = new Properties().appendTo(this.detection_table)

    const grid = c().css2({
      "display": "grid",
      "column-gap": "5px",
      "row-gap": "2px",
      "grid-template-columns": "auto auto auto 20px"
    })

    layout.header("Detected Broadcasts")

    layout.row(grid)

    grid.append(
      c().append(bold("Time")),
      c().append(bold("Player")),
      c().append(bold("Item")),
      c()
    )

    for (let broadcast of this.buffer.detected) {
      grid.append(
        c().append(formatTimeWithoutMilliseconds(broadcast.message_timestamp))
          .toggleClass("ctr-striked", broadcast.deleted),
        c().append(broadcast.player)
          .toggleClass("ctr-striked", broadcast.deleted),
        c().append(broadcast.item)
          .toggleClass("ctr-striked", broadcast.deleted),
        c().append(NislIcon.delete()
          .css2(broadcast.deleted ? {filter: "grayscale"} : {})
          .toggleClass("ctr-striked", broadcast.deleted)
          .addClass("ctr-clickable")
          .on("click", () => {
            broadcast.deleted = !broadcast.deleted

            this.saveChanges()
          })
        )
      )
    }
  }

  saveChanges() {
    Backend.submit(this.buffer.user, this.buffer.detected)
    this.storage.set(this.buffer.user.token, this.buffer)

    this.renderDetections()
  }

  protected end() {

  }
}