import {Clues} from "../../../../lib/runescape/clues";
import {Rectangle, Vector2} from "../../../../lib/math";
import {util} from "../../../../lib/util/util";
import * as oldlib from "../../../../skillbertssolver/cluesolver/oldlib";
import {coldiff, comparetiledata} from "../../../../skillbertssolver/cluesolver/oldlib";
import * as OCR from "alt1/ocr";
import ClueFont from "./ClueFont";
import {clue_data} from "../../../../data/clues";
import {SlideReader, SliderReader} from "./SliderReader";
import {Notification} from "../../NotificationBar";
import {CompassReader} from "./CompassReader";
import {KnotReader} from "./KnotReader";
import {CapturedImage} from "../../../../lib/alt1/capture";
import {LegacyOverlayGeometry} from "../../../../lib/alt1/LegacyOverlayGeometry";
import {Sliders} from "../../../../lib/cluetheory/Sliders";
import {LockBoxReader} from "./LockBoxReader";
import {CapturedModal} from "./capture/CapturedModal";
import {CapturedSliderInterface} from "./capture/CapturedSlider";
import {TowersReader} from "./TowersReader";
import {CapturedCompass} from "./capture/CapturedCompass";
import {Log} from "../../../../lib/util/Log";
import {CelticKnots} from "../../../../lib/cluetheory/CelticKnots";
import {CapturedScan} from "./capture/CapturedScan";
import {Finder} from "../../../../lib/alt1/capture/Finder";
import {Alt1Color} from "../../../../lib/alt1/Alt1Color";
import stringSimilarity = util.stringSimilarity;
import notification = Notification.notification;
import findBestMatch = util.findBestMatch;
import SliderState = Sliders.SliderState;
import log = Log.log;
import cleanedJSON = util.cleanedJSON;
import async_init = util.async_init;
import AsyncInitialization = util.AsyncInitialization;

const CLUEREADERDEBUG = false

let CLUEREADER_DEBUG_OVERLAY: LegacyOverlayGeometry = null

export class ClueReader {

  public readonly initialization: AsyncInitialization<{
    scan_finder: Finder<CapturedScan>,
    lockbox_reader: LockBoxReader,
    tower_reader: TowersReader,
    knot_reader: KnotReader,
    slider_reader: SliderReader,
    modal_finder: Finder<CapturedModal>
    slider_finder: CapturedSliderInterface.Finder,
    compass_finder: Finder<CapturedCompass>
  }>

  constructor(public tetracompass_only: boolean) {
    this.initialization = async_init(async () => {
      return {
        scan_finder: await CapturedScan.finder.get(),
        lockbox_reader: await LockBoxReader.instance(),
        tower_reader: await TowersReader.instance(),
        knot_reader: await KnotReader.instance(),
        slider_reader: await SlideReader.instance(),
        modal_finder: await CapturedModal.finder.get(),
        slider_finder: await CapturedSliderInterface.Finder.instance.get(),
        compass_finder: await CapturedCompass.finder.get()
      }
    })

    this.initialization.wait().catch(error => {
      log().log("Clue Reader initialization failed.", "Clue Reader")

      if (error instanceof Error) {
        log().log(error.toString(), "Clue Reader")
        log().log(error.stack, "Clue Reader")
      }

      throw error;
    })
  }

  read(img: CapturedImage): ClueReader.Result {
    if (!this.initialization.isInitialized()) return null

    const readers = this.initialization.get()

    if (CLUEREADERDEBUG) {
      if (!CLUEREADER_DEBUG_OVERLAY) CLUEREADER_DEBUG_OVERLAY = new LegacyOverlayGeometry().withTime(5000)

      CLUEREADER_DEBUG_OVERLAY.clear()
    }

    if (!this.tetracompass_only) {
      // Check for modal interface
      {
        const modal = readers.modal_finder.find(img)

        if (modal) {
          if (CLUEREADERDEBUG) {
            CLUEREADER_DEBUG_OVERLAY.rect(Rectangle.fromOriginAndSize(modal.body.screenRectangle().origin, modal.body.screenRectangle().size), {
              width: 1,
              color: Alt1Color.red
            }).render()
          }

          function findModalTypeByTitle(title: string): ClueReader.ModalType {
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

            if (CLUEREADERDEBUG) {
              console.log(`Title: ${title}`)
            }

            const best = findBestMatch(modal_type_map.map(
              m => ({value: m, score: findBestMatch(m.possible_titles, possible_title => stringSimilarity(title, possible_title)).score})
            ), m => m.score).value

            // Minimum score to avoid unrelated modals to be matched as something
            if (!best?.score || best.score < 0.7) return null

            return best.value.type
          }


          const do_modal_type = ((modal_type: ClueReader.ModalType): ClueReader.Result => {
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

                  if (!best?.score || best.score < 0.7) return null

                  return {
                    type: "textclue",
                    modal: modal,
                    step: best.value
                  }
                } else {
                  return null
                }
              case "map":
                const MAP_DETECTION_MAX_SCORE = 130000

                const fingerprint = oldlib.computeImageFingerprint(modal.body.getData(), 20, 20, 90, 25, 300, 240);

                const best = findBestMatch(clue_data.map, c => comparetiledata(c.ocr_data, fingerprint), undefined, true)

                if (CLUEREADERDEBUG) {
                  log().log("Best map match", "ClueReader")
                  log().log(best, "ClueReader")
                }

                if (!best?.score || best.score > MAP_DETECTION_MAX_SCORE) return null

                if (CLUEREADERDEBUG) {
                  log().log(`Found ${best.value.id}, confidence ${best.score}`)
                }

                return {
                  type: "textclue",
                  modal: modal,
                  step: {step: best.value, text_index: 0}
                }
              case "knot": {
                const reader = new KnotReader.CapturedKnot(modal, readers.knot_reader)
                const puzzle = reader.readPuzzle()
                const buttons = reader.getButtons()

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
                const reader = new LockBoxReader.CapturedLockbox(modal, readers.lockbox_reader)

                if (reader.getPuzzle()) {
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
                const reader = new TowersReader.CapturedTowers(modal, readers.tower_reader)

                if (reader.getPuzzle()) {
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
          });

          const title = modal.title()

          if (title) {
            const modal_type = findModalTypeByTitle(modal.title())

            if (CLUEREADERDEBUG) {
              console.log(`Detected modal interface: ${modal_type}`)
            }

            return do_modal_type(modal_type)
          } else {
            // No title could be read. Fall back to trying all types
            for (const type of ClueReader.ModalType.all) {
              const res = do_modal_type(type)

              if (res) return res
            }
          }

          return null
        }
      }

      // Check for slider interface
      {
        const slider = readers.slider_finder.find(img, false, readers.slider_reader)

        if (slider) {
          const res = slider.getPuzzle()

          if (CLUEREADERDEBUG) {
            res.tiles.forEach((tile, i) => {
              const pos = Vector2.add(
                slider.body.screenRectangle().origin,
                {x: Math.floor(i % 5) * 56, y: Math.floor(i / 5) * 56}
              )

              alt1.overLayText(`${res.theme}\n${tile.position}`,
                Alt1Color.green.for_overlay,
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
              puzzle: {type: "slider", reader: slider, puzzle: res},
            }
          }

          return null
        }
      }

      // Check for scan
      {
        const scan = readers.scan_finder.find(img)

        if (scan) {
          const scan_text = scan.scanArea()

          if (CLUEREADERDEBUG)
            notification(`Scan ${scan_text}`).show()

          const best = findBestMatch(clue_data.scan, scan => stringSimilarity(scan_text, scan.scantext), 0.3)

          if (!best) return null

          return {type: "scan", step: best.value, scan_interface: scan}
        }
      }
    }

    // Check for compass interface
    {
      const compass = readers.compass_finder.find(img)

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
}

export namespace ClueReader {
  export type ModalType = "towers" | "lockbox" | "textclue" | "knot" | "map"

  export namespace ModalType {
    export const all: ModalType[] = ["towers", "lockbox", "textclue", "knot", "map"]
  }

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
        reader: CapturedSliderInterface,
        puzzle: SliderPuzzle
      }

      export type Knot = puzzle_base & {
        type: "knot",
        reader: KnotReader.CapturedKnot,
      }

      export type Lockbox = puzzle_base & {
        type: "lockbox",
        reader: LockBoxReader.CapturedLockbox,
      }

      export type Towers = puzzle_base & {
        type: "tower",
        reader: TowersReader.CapturedTowers,
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
      scan_interface: CapturedScan | null,
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