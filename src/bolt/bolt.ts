import {ewent, EwentHandler} from "../lib/reactive";

export class BoltApi {
  private message = ewent<BoltApi.Message>()
  private screen_capture = ewent<BoltApi.Message.ScreenCapture>()
  private plugin_message = ewent<BoltApi.Message.PluginMessage>()

  constructor() {
    this.message.on(msg => {
      switch (msg.type) {
        case "pluginMessage":
          this.plugin_message.trigger(msg)
          const message = (new TextDecoder()).decode(msg.content);
          break;
        case "screenCapture":
          this.screen_capture.trigger(msg)
          break;
      }
    })

    window.addEventListener('message', async (event: MessageEvent<BoltApi.Message>) => {
      if (typeof (event.data) !== "object") return;

      this.message.trigger(event.data)
    });
  }

  async send(message: string): Promise<Response> {
    return fetch("https://bolt-api/send-message", {method: 'POST', body: message});
  }

  async startReposition(x: number, y: number): Promise<Response> {
    return fetch(`https://bolt-api/start-reposition?h=${x}&v=${y}`);
  }

  async onMessage(f: (msg: BoltApi.Message) => void): Promise<EwentHandler<BoltApi.Message>> {
    return this.message.on(f)
  }
}

export namespace BoltApi {
  export type Message = Message.PluginMessage | Message.ScreenCapture

  export namespace Message {
    type base = {
      type: string
    }

    export type PluginMessage = base & { type: "pluginMessage", content: AllowSharedBufferSource }
    export type ScreenCapture = base & { type: "screenCapture", width: number, height: number, content: AllowSharedBufferSource }
  }
}