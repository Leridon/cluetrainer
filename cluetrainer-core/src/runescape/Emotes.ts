export type Emote = typeof Emotes.values[number]

export namespace Emotes {
  export const values = [
    "yes", "think", "beckon", "dance", "cry", "clap",
    "no", "wave", "laugh", "jig", "blowkiss", "salute",
    "boworcurtsy", "shrug", "jumpforjoy", "twirl", "panic",
    "angry", "cheer", "yawn", "headbang", "raspberry"
  ] as const

  export function meta(emote: Emote) {
    const lookup: Record<Emote, string> = {
      yes: "Yes",
      think: "Think",
      beckon: "Beckon",
      dance: "Dance",
      cry: "Cry",
      clap: "Clap",
      no: "No",
      wave: "Wave",
      laugh: "Laugh",
      jig: "Jig",
      blowkiss: "Blow Kiss",
      salute: "Salute",
      boworcurtsy: "Bow or Curtsy",
      shrug: "Shrug",
      jumpforjoy: "Jump for Joy",
      twirl: "Twirl",
      panic: "Panic",
      angry: "Angry",
      cheer: "Cheer",
      yawn: "Yawn",
      headbang: "Headbang",
      raspberry: "Raspberry"
    }

    return {
      name: lookup[emote]
    }
  }
}