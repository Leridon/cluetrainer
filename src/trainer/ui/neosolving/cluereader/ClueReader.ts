import {Clues} from "../../../../lib/runescape/clues";
import * as a1lib from "@alt1/base";
import {AnchorImages} from "./AnchorImages";
import {Rectangle, Vector2} from "../../../../lib/math";
import {util} from "../../../../lib/util/util";
import {coldiff} from "../../../../skillbertssolver/cluesolver/oldlib";
import * as OCR from "@alt1/ocr";
import ClueFont from "./ClueFont";
import * as oldlib from "../../../../skillbertssolver/cluesolver/oldlib";
import {comparetiledata} from "../../../../skillbertssolver/cluesolver/oldlib";
import {clue_data} from "../../../../data/clues";
import {SlideReader} from "./SliderReader";
import {Notification} from "../../NotificationBar";
import {CompassReader} from "./CompassReader";
import {KnotReader} from "./KnotReader";
import {CapturedImage} from "../../../../lib/alt1/capture";
import {OverlayGeometry} from "../../../../lib/alt1/OverlayGeometry";
import {Sliders} from "../../../../lib/cluetheory/Sliders";
import {LockBoxReader} from "./LockBoxReader";
import {CapturedModal} from "./capture/CapturedModal";
import {CapturedSliderInterface} from "./capture/CapturedSlider";
import {TowersReader} from "./TowersReader";
import {CapturedCompass} from "./capture/CapturedCompass";
import {Log} from "../../../../lib/util/Log";
import {CelticKnots} from "../../../../lib/cluetheory/CelticKnots";
import {CapturedScan} from "./capture/CapturedScan";
import stringSimilarity = util.stringSimilarity;
import notification = Notification.notification;
import findBestMatch = util.findBestMatch;
import SliderState = Sliders.SliderState;
import log = Log.log;
import cleanedJSON = util.cleanedJSON;
import ScanStep = Clues.ScanStep;

const CLUEREADERDEBUG = false

let CLUEREADER_DEBUG_OVERLAY: OverlayGeometry = null

export class ClueReader {

  private initialized: Promise<void>

  anchors: {
    scanleveltext: ImageData;
    scanfartext: ImageData;
    orbglows: ImageData;
  }

  constructor(public tetracompass_only: boolean) {
    this.initialized = this.init()
  }

  async init() {
    this.anchors = await AnchorImages.getAnchorImages()
  }

  async read(img: CapturedImage): Promise<ClueReader.Result> {
    await this.initialized

    if (CLUEREADERDEBUG) {
      if (!CLUEREADER_DEBUG_OVERLAY) CLUEREADER_DEBUG_OVERLAY = new OverlayGeometry().withTime(5000)

      CLUEREADER_DEBUG_OVERLAY.clear()
    }

    if (!this.tetracompass_only) {
      // Check for modal interface
      {
        const modal = await CapturedModal.findIn(img)

        if (modal) {
          if (CLUEREADERDEBUG) {
            CLUEREADER_DEBUG_OVERLAY.rect(Rectangle.fromOriginAndSize(modal.body.screenRectangle().origin, modal.body.screenRectangle().size), {
              width: 1,
              color: a1lib.mixColor(255, 0, 0, 255)
            }).render()
          }

          const modal_type = (() => {
            const modal_type_map: {
              type: ClueReader.ModalType,
              possible_titles: string[]
            }[] =
              [
                {
                  type: "textclue", possible_titles: [
                    "mysterious clue",
                    "mysterious clue scroll",
                    "sandy clue scro",
                    "sandy clue scroll"
                  ]
                }, {
                type: "towers", possible_titles: [
                  "towers",
                ]
              }, {
                type: "lockbox", possible_titles: [
                  "lockbox",
                ]
              },
                {
                  type: "knot", possible_titles: [
                    "celtic knot",
                  ]
                }, {
                type: "map", possible_titles: [
                  "treasure map",
                ]
              }
              ]

            const title = modal.title().toLowerCase()

            if (CLUEREADERDEBUG) {
              console.log(`Title: ${title}`)
            }

            const best = findBestMatch(modal_type_map.map(
              m => ({value: m, score: findBestMatch(m.possible_titles, possible_title => stringSimilarity(title, possible_title)).score})
            ), m => m.score).value

            // Minimum score to avoid unrelated modals to be matched as something
            if (best.score < 0.7) return null

            return best.value.type
          })()

          if (modal_type) {
            switch (modal_type) {
              case "textclue":
                const text = ClueReader.readTextClueModalText(modal)

                if (text.length >= 10) {
                  const best = findBestMatch(
                    clue_data.all.flatMap<Clues.StepWithTextIndex>(c => c.text.map((text, text_index) => {
                      return {step: c, text_index: text_index}
                    })),
                    ({step, text_index}) => {
                      let reference_text = step.text[text_index]

                      if (step.type == "skilling" && step.tier == "master") {
                        reference_text = `Complete the action to solve the clue: ${reference_text}`
                      }

                      return stringSimilarity(text, reference_text)
                    }
                  )

                  if (best.score < 0.7) return null

                  return {
                    type: "textclue",
                    modal: modal,
                    step: best.value
                  }
                } else {
                  return null
                }
              case "map":
                const fingerprint = oldlib.computeImageFingerprint(modal.body.getData(), 20, 20, 90, 25, 300, 240);

                const best = findBestMatch(clue_data.map, c => comparetiledata(c.ocr_data, fingerprint), undefined, true)

                return {
                  type: "textclue",
                  modal: modal,
                  step: {step: best.value, text_index: 0}
                }
              case "knot": {
                const reader = new KnotReader.KnotReader(modal)
                const puzzle = await reader.getPuzzle()
                const buttons = await reader.getButtons()


                if (!puzzle) {
                  log().log("Knot found, but not parsed properly", "Clue Reader")
                  log().log(`Broken: ${reader.isBroken}, Reason: ${reader.brokenReason}`, "Clue Reader")

                  return null
                } else if (!buttons) {
                  log().log(`Could not identity knot shape: ${cleanedJSON(puzzle.shape)}`, "Clue Reader")
                  log().log(`Hash: ${cleanedJSON(CelticKnots.PuzzleShape.hash(puzzle.shape))}`, "Clue Reader")

                  return null
                }

                const solutions = CelticKnots.solveAll(puzzle)

                if (solutions.real.length == 0 && solutions.maybe.length == 0) {
                  log().log(`Read a not with no possible solution. Rejecting.`, "Clue Reader", puzzle)

                  return null
                }

                return {
                  type: "puzzle",
                  puzzle: {
                    type: "knot",
                    reader: reader,
                  },
                }
              }
              case "lockbox": {
                const reader = new LockBoxReader.LockBoxReader(modal)

                if (await reader.getPuzzle()) {
                  return {
                    type: "puzzle",
                    puzzle: {
                      type: "lockbox",
                      reader: reader,
                    },
                  }
                } else {
                  console.error("Lockbox found, but not parsed properly. Maybe it's concealed by something.")

                  return null
                }
              }
              case "towers": {
                const reader = new TowersReader.TowersReader(modal)

                if (true || await reader.getPuzzle()) {
                  return {
                    type: "puzzle",
                    puzzle: {
                      type: "tower",
                      reader: reader,
                    },
                  }
                } else {
                  console.error("Towers puzzle found, but not parsed properly. Maybe it's concealed by something.")

                  return null
                }
              }
            }
          }

          return null
        }
      }

      // Check for slider interface
      {
        const slider = await CapturedSliderInterface.findIn(img, false)

        if (slider) {
          const reader = new SlideReader.SlideReader(slider)
          const res = await reader.getPuzzle()

          if (CLUEREADERDEBUG) {
            res.tiles.forEach((tile, i) => {
              const pos = Vector2.add(
                reader.ui.body.screenRectangle().origin,
                {x: Math.floor(i % 5) * 56, y: Math.floor(i / 5) * 56}
              )

              alt1.overLayText(`${res.theme}\n${tile.position}`,
                a1lib.mixColor(0, 255, 0),
                10,
                pos.x,
                pos.y,
                5000
              )
            })

            notification(`Found theme ${res.theme}`).show()
          }

          if (res.match_score >= SlideReader.DETECTION_THRESHOLD_SCORE) {

            const state = res.tiles.map(t => t.position)

            if (!SliderState.isSolveable(state)) {
              Log.log().log(`Read impossible slider puzzle: ${state.join(",")}`)
            }

            return {
              type: "puzzle",
              puzzle: {type: "slider", reader: reader, puzzle: res},
            }
          }

          return null
        }
      }

      // Check for scan
      {
        const scan = await CapturedScan.find(img)

        if (scan) {
          console.log("New Log")
          console.log(scan.text())
          console.log(`Meerkats: ${scan.hasMeerkats()}`)
          console.log(`Different Level: ${scan.isDifferentLevel()}`)
          console.log(`Triple: ${scan.isTriple()}`)

          const scan_text = scan.scanArea()

          if (CLUEREADERDEBUG)
            notification(`Scan ${scan_text}`).show()

          let bestscore = 0;
          let best: ScanStep | null = null;

          for (let clue of clue_data.scan) {
            let score = stringSimilarity(scan_text, clue.scantext);

            if (score > bestscore) {
              best = clue;
              bestscore = score;
            }
          }

          return {type: "scan", step: best}
        }
      }
    }

    // Check for compass interface
    {
      const compass = await CapturedCompass.find(img)

      if (compass) {
        if (CLUEREADERDEBUG) {
          compass.body.debugOverlay(CLUEREADER_DEBUG_OVERLAY)
          compass.compass_area.debugOverlay(CLUEREADER_DEBUG_OVERLAY).render()
        }

        const is_arc = compass.isArcCompass()

        const reader = new CompassReader(compass)

        const compass_state = reader.getAngle()

        if (compass_state?.type == "likely_solved") {
          //console.error("Compass found, but already in solved state.")
          return null
        }

        if (compass_state?.type == "likely_closed" || compass_state?.type == "likely_concealed") {
          console.error("Compass found, but not parsed properly")
          console.error(`Broken: ${compass_state.type}, Reason: ${compass_state.details}`)

          return null
        }

        if (CLUEREADERDEBUG) {
          notification(`Compass ${JSON.stringify(compass_state)}`).show()
        }

        return {
          type: "compass",
          step: is_arc ? clue_data.arc_compass : (this.tetracompass_only ? clue_data.tetracompass : clue_data.gielinor_compass),
          reader: reader
        }
      }
    }
  }

  async readScreen(): Promise<ClueReader.Result> {
    return this.read(CapturedImage.capture())
  }
}

export namespace ClueReader {
  export type ModalType = "towers" | "lockbox" | "textclue" | "knot" | "map"

  export namespace Result {
    export type Kind = "textclue" | "scan" | "compass" | "puzzle"

    export namespace Puzzle {
      export type Type = "slider" | "knot" | "tower" | "lockbox"

      import SliderPuzzle = Sliders.SliderPuzzle;
      type puzzle_base = {
        type: Type
      }

      export type Slider = puzzle_base & {
        type: "slider",
        reader: SlideReader.SlideReader,
        puzzle: SliderPuzzle
      }

      export type Knot = puzzle_base & {
        type: "knot",
        reader: KnotReader.KnotReader,
      }

      export type Lockbox = puzzle_base & {
        type: "lockbox",
        reader: LockBoxReader.LockBoxReader,
      }

      export type Towers = puzzle_base & {
        type: "tower",
        reader: TowersReader.TowersReader,
      }

      export type Puzzle = Slider | Knot | Lockbox | Towers
    }

    type base = { type: Kind }

    export type TextClue = base & {
      type: "textclue",
      modal: CapturedModal,
      step: Clues.StepWithTextIndex,
    }

    export type ScanClue = base & {
      type: "scan",
      step: Clues.Scan,
    }

    export type CompassClue = base & {
      type: "compass",
      step: Clues.Compass,
      reader: CompassReader
    }

    export type Puzzle = base & {
      type: "puzzle",
      puzzle: Puzzle.Puzzle,
    }
  }

  export type Result = Result.TextClue | Result.ScanClue | Result.CompassClue | Result.Puzzle


  /**
   * Reads the text in the modal from a text clue.
   * Taken pretty much verbatim from skillbert's solver.
   * @param modal The read modal
   */
  export function readTextClueModalText(modal: CapturedModal): string {
    let buf = modal.body.getData()
    let lines: string[] = [];
    let linestart = 0;

    for (let y = 60; y < 290; y++) {
      let linescore = 0;
      let a: number = null

      for (let x = 220; x < 320; x++) {
        let i = 4 * x + 4 * buf.width * y;
        let a = coldiff(buf.data[i], buf.data[i + 1], buf.data[i + 2], 84, 72, 56);
        if (a < 80) { linescore++; }
      }

      if (linescore >= 3) {
        if (linestart == 0) {
          linestart = y;
        }
      } else if (linestart != 0) {
        a = Math.abs(linestart - y);
        linestart = 0;
        if (a >= 6 && a <= 18) {
          let b = OCR.findReadLine(buf, ClueFont, [[84, 72, 56]], 255, y - 4)
            || OCR.findReadLine(buf, ClueFont, [[84, 72, 56]], 265, y - 4);
          if (b) { lines.push(b.text); }
        }
      }
    }

    return lines.join(" ");
  }
}