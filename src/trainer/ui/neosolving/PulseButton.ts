import LightButton from "../widgets/LightButton";
import {Scans} from "../../../lib/runescape/clues/scans";
import {TextRendering} from "../TextRendering";
import {C} from "../../../lib/ui/constructors";
import Widget from "../../../lib/ui/Widget";
import Pulse = Scans.Pulse;
import render_digspot = TextRendering.render_digspot;
import simplify_with_context = Scans.Pulse.simplify_with_context;
import cls = C.cls;

export class PulseIcon extends Widget {
  constructor(pulse: Pulse, context: Pulse[] | null) {
    super();

    const urls = [
      'assets/icons/pulse_single.png',
      'assets/icons/pulse_double.png',
      'assets/icons/pulse_triple.png',
    ]

    this.addClass("ctr-neosolving-pulseicon")

    let {type, text} = context
      ? simplify_with_context(pulse, context)
      : {type: pulse.pulse, text: pulse.different_level ? "DL" : null}


    if (type != null) {
      c("<img>")
        .setAttribute("src", urls[pulse.pulse - 1])
        .appendTo(this)
    }

    if (text != null) {
      cls("tele-icon-code-overlay").text(text).appendTo(this)
    }
  }
}

export default class PulseButton extends LightButton {
  private constructor(value: { type: "pulse", value: Pulse, context: Pulse[] } | { type: "spot", value: number }) {
    super("", "round");

    this.addClass("ctr-neosolving-pulsebutton")

    this.css("position", "relative")

    switch (value.type) {
      case "pulse":
        this.append(new PulseIcon(value.value, value.context))

        break;
      case "spot":
        this.empty().append(render_digspot(value.value))
        break;
    }
  }

  static forPulse(pulse: Pulse, context: Pulse[] | null): PulseButton {
    return new PulseButton({type: "pulse", value: pulse, context: context})
  }

  static forSpot(spot: number): PulseButton {
    return new PulseButton({type: "spot", value: spot})
  }
}