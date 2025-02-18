import * as lodash from "lodash";
import {ewent} from "../../../reactive";
import {util} from "../../../util/util";
import {OCR} from "../../OCR";

export class MessageBuffer {
  new_message = ewent<MessageBuffer.Message>()

  private _messages: MessageBuffer.Message[] = []

  add(message: MessageBuffer.Message): boolean {
    let i = this._messages.length

    while (i > 0) {
      const msg = this._messages[i - 1]

      if (MessageBuffer.Message.equals(message, msg)) return false

      if (msg.timestamp < message.timestamp) break

      i--
    }

    this._messages.splice(i, 0, message)

    this.new_message.trigger(message)

    return true
  }

  get(): MessageBuffer.Message[] {
    return this._messages
  }
}

export namespace MessageBuffer {

  export type Message = {
    local_timestamp: {
      stamp: number,
      hours: number, minutes: number, seconds: number
    },
    fragments: Message.Fragment[],
    timestamp: number,
    text: string
  }

  export namespace Message {
    export type Fragment = {
      text: string,
      color: OCR.ColorTriplet
    }

    import padInteger = util.padInteger;

    export function toString(msg: Message): string {
      return `${new Date(msg.timestamp).toString()} [${padInteger(msg.local_timestamp.hours, 2)}:${padInteger(msg.local_timestamp.minutes, 2)}:${padInteger(msg.local_timestamp.seconds, 2)}] ${msg.text}`
    }

    export function equals(a: Message, b: Message): boolean {
      if (!a || !b) debugger

      return a.local_timestamp.stamp == b.local_timestamp.stamp && a.text == b.text
    }

    export function color(m: Message): OCR.ColorTriplet {
      return lodash.findLast(m.fragments, f => f.color != null)?.color
    }
  }
}