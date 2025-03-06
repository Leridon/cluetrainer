import {async_lazy, LazyAsync} from "../../../Lazy";
import {NeedleImage} from "../../capture";
import {CapturedChatbox} from "./CapturedChatbox";

export namespace ChatAnchors {
  import Font = CapturedChatbox.Font;
  import getFont = CapturedChatbox.getFont;

  export type Needles = {
    brackets: { img: NeedleImage, font: Font }[],
    gamefiltered: NeedleImage;
    gameoff: NeedleImage;
    entertochat: NeedleImage;
    tr_plus: NeedleImage;
    tr_minus: NeedleImage;
    chatbubble: NeedleImage;
    gameall: NeedleImage;
  }

  export namespace Needles {
    export const instance: LazyAsync<Needles> = async_lazy(async () => {
      return {
        brackets: [
          {font: getFont(10), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_10pt.png")},
          {font: getFont(12), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_12pt.png")},
          {font: getFont(14), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_14pt.png")},
          {font: getFont(16), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_16pt.png")},
          {font: getFont(18), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_18pt.png")},
          {font: getFont(20), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_20pt.png")},
          {font: getFont(22), img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_22pt.png")},
        ],
        tr_minus: await NeedleImage.fromURL("/alt1anchors/chat/tr_minus.png"),
        tr_plus: await NeedleImage.fromURL("/alt1anchors/chat/tr_plus.png"),
        chatbubble: await NeedleImage.fromURL("/alt1anchors/chat/chatbubble.png"),
        entertochat: await NeedleImage.fromURL("/alt1anchors/chat/entertochat.png"),
        gameall: await NeedleImage.fromURL("/alt1anchors/chat/gameall.png"),
        gamefiltered: await NeedleImage.fromURL("/alt1anchors/chat/gamefilter.png"),
        gameoff: await NeedleImage.fromURL("/alt1anchors/chat/gameoff.png"),
      }
    })
  }
}