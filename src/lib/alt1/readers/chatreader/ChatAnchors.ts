import {async_lazy, LazyAsync} from "../../../Lazy";
import {NeedleImage} from "../../capture";
import {CapturedChatbox} from "./CapturedChatbox";

export namespace ChatAnchors {
  import ChatFont = CapturedChatbox.ChatFont;
  import getFont = CapturedChatbox.getFont;

  export type Needles = {
    brackets: { img: NeedleImage, baseline_y_from_needle_top: number, font: ChatFont }[],
    tr_plus: NeedleImage;
    tr_plus_hover: NeedleImage;
    tr_minus: NeedleImage;
    tr_minus_hover: NeedleImage;
    chatbubble: NeedleImage;
    bot_left: NeedleImage;
  }

  export namespace Needles {
    export const instance: LazyAsync<Needles> = async_lazy(async () => {
      return {
        brackets: [
          {
            font: getFont(10),
            baseline_y_from_needle_top: 8,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_10pt.png")
          },
          {
            font: getFont(12),
            baseline_y_from_needle_top: 10,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_12pt.png")
          },
          {
            font: getFont(14),
            baseline_y_from_needle_top: 12,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_14pt.png")
          },
          {
            font: getFont(16),
            baseline_y_from_needle_top: 12,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_16pt.png")
          },
          {
            font: getFont(18),
            baseline_y_from_needle_top: 14,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_18pt.png")
          },
          {
            font: getFont(20),
            baseline_y_from_needle_top: 16,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_20pt.png")
          },
          {
            font: getFont(22),
            baseline_y_from_needle_top: 17,
            img: await NeedleImage.fromURL("/alt1anchors/chat/lbracket_22pt.png")
          },
        ],
        tr_minus: await NeedleImage.fromURL("/alt1anchors/chat/tr_minus.png"),
        tr_plus: await NeedleImage.fromURL("/alt1anchors/chat/tr_plus.png"),
        tr_minus_hover: await NeedleImage.fromURL("/alt1anchors/chat/tr_minus_hover.png"),
        tr_plus_hover: await NeedleImage.fromURL("/alt1anchors/chat/tr_plus_hover.png"),
        chatbubble: await NeedleImage.fromURL("/alt1anchors/chat/chatbubble.png"),
        bot_left: await NeedleImage.fromURL("/alt1anchors/chat/chat_bar_bl.png"),
      }
    })
  }
}