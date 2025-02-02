import {Sliders} from "../../../../lib/cluetheory/Sliders";
import {Rectangle, Transform, Vector2} from "../../../../lib/math";
import {mixColor} from "alt1";
import {LegacyOverlayGeometry} from "../../../../lib/alt1/LegacyOverlayGeometry";
import {SlideReader} from "../cluereader/SliderReader";
import {deps} from "../../../dependencies";
import * as lodash from "lodash";
import {findLastIndex} from "lodash";
import {util} from "../../../../lib/util/util";
import {ClueReader} from "../cluereader/ClueReader";
import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {AbstractPuzzleSolving} from "./AbstractPuzzleSolving";
import {AbstractPuzzleProcess} from "./AbstractPuzzleProcess";
import {PDBSolver} from "../../../../lib/cluetheory/sliders/PDBSolver";
import {RegionChainDistanceTable} from "../../../../lib/cluetheory/sliders/RegionChainDistanceTable";
import {async_lazy, lazy} from "../../../../lib/Lazy";
import KeyValueStore from "../../../../lib/util/KeyValueStore";
import {Observable, observe} from "../../../../lib/reactive";
import {RandomSolver} from "../../../../lib/cluetheory/sliders/RandomSolver";
import {ProgressBar} from "../../widgets/ProgressBar";
import {RegionDistanceTable} from "../../../../lib/cluetheory/sliders/RegionDistanceTable";
import {Log} from "../../../../lib/util/Log";
import {CapturedImage} from "../../../../lib/alt1/capture";
import {ScreenRectangle} from "../../../../lib/alt1/ScreenRectangle";
import {Alt1Color} from "../../../../lib/alt1/Alt1Color";
import profileAsync = util.profileAsync;
import log = Log.log;
import index = util.index;
import SliderPuzzle = Sliders.SliderPuzzle;
import SliderState = Sliders.SliderState;
import SolvingProcess = Sliders.SolvingProcess;
import AnnotatedMoveList = Sliders.AnnotatedMoveList;
import over = LegacyOverlayGeometry.over;
import Move = Sliders.Move;
import MoveList = Sliders.MoveList;


class SliderGuideProcess extends AbstractPuzzleProcess {
  settings = deps().app.settings.settings.solving.puzzles.sliders

  private guiding_start_time = -1
  private solved_time = -1

  private puzzle: SliderPuzzle

  private initial_state: SliderState
  private active_solving_process: {
    solver: SolvingProcess,
    solving_from: number
  } = null

  private error_recovery_solution: {
    sequence: AnnotatedMoveList,
    last_known_state: SliderState,
    recovering_to_mainline_index: number
  } = null

  private solution: AnnotatedMoveList = null

  private progress_overlay: LegacyOverlayGeometry = null
  private solving_overlay: LegacyOverlayGeometry = null
  private move_overlay: LegacyOverlayGeometry = null

  private last_overlay_render: number = -1

  private current_mainline_index: number | null = null

  private last_frame_state: SliderState = null
  private arrow_keys_inverted: boolean = false

  constructor(private parent: SliderSolving, public solver: Sliders.Solver) {
    super()

    this.puzzle = parent.puzzle.puzzle
  }

  private posToScreen(pos: number): Vector2 {
    return Vector2.add(
      this.parent.puzzle.reader.body.screenRectangle().origin,
      {x: 25, y: 25},
      {x: (pos % 5) * 56, y: Math.floor(pos / 5) * 56}
    )
  }

  capturingPaused(): boolean {
    return !this.solution && this.active_solving_process != null
  }

  setSolver(solver: Sliders.Solver) {
    this.solver = solver

    if (this.active_solving_process) {
      this.active_solving_process.solver.stop()
      this.active_solving_process = null
    }
  }

  area(): ScreenRectangle {
    return this.parent.puzzle.reader.screenRectangle(true);
  }

  private read(capture: CapturedImage): {
    result: Sliders.SliderPuzzle,
    state: SliderState,
    inverted_checkmark: boolean
  } {
    const capt = this.parent.puzzle.reader.recapture(true, capture)

    const read = capt.getPuzzle(this.puzzle.theme)

    if (read.match_score >= SlideReader.DETECTION_THRESHOLD_SCORE) {
      this.parent.modal.setImage(capt.body.getData())
    }

    const checkmark_found = capt.isInvertedArrowKeyCheckboxEnabled()

    return {
      result: read,
      state: SliderPuzzle.getState(read),
      inverted_checkmark: checkmark_found
    }
  }

  private updateProgressOverlay() {
    if (!this.progress_overlay) {
      this.progress_overlay = over()
    }

    this.progress_overlay.clear()

    const solution_length = this.solution?.length ?? this.active_solving_process?.solver?.getBest()?.length

    const center = Vector2.add(
      this.parent.puzzle.reader.body.screenRectangle().origin,
      {x: 137, y: -9}
    )

    if (this.solution && this.current_mainline_index >= solution_length) {
      const total_time = (this.solved_time - this.start_time) / 1000
      const solving_time = (this.solved_time - this.guiding_start_time) / 1000
      const moves_per_second = this.solution.length / solving_time

      const estimate_slider = this.settings.estimate_slider_speed

      this.progress_overlay.text(
        `Done! ${total_time.toFixed(1)}s, ${moves_per_second.toFixed(1)} moves/s`,
        center,
        {
          color: Alt1Color.white,
          centered: true,
          shadow: true,
          width: 12
        })

      if (estimate_slider) {
        const raw_solution = this.solution.map(s => s.move)

        const solution_with_multimoves = MoveList.compress(raw_solution)
        const small_step_solution = raw_solution.flatMap(Move.split)
        const partial_steps = small_step_solution.length - solution_with_multimoves.length
        const full_steps = small_step_solution.length - partial_steps
        const counted = partial_steps * 0.5 + full_steps

        const estimated_slider_speed = (solving_time - 0.5) / counted

        this.progress_overlay.text(
          `Slider Speed ${estimated_slider_speed.toFixed(3)}`,
          Vector2.add(center, {x: 0, y: 20}),
          {
            color: Alt1Color.white,
            centered: true,
            shadow: true,
            width: 12
          })
      }

    } else {
      const length = Math.min(2 * (solution_length ?? 120), 250)
      const progress = this.solution ? this.current_mainline_index / this.solution.length : 0

      this.progress_overlay.progressbar(center, length, progress, 5)

      if (solution_length) {
        this.progress_overlay.text(solution_length.toString(), Vector2.add(center, {x: length / 2 + 20, y: 0}), {
          color: Alt1Color.white,
          width: 12,
          shadow: true,
          centered: true
        })

        const now = Date.now()

        const total_time = (now - this.start_time) / 1000

        this.progress_overlay.text(`${total_time.toFixed(1)}s`, Vector2.add(center, {x: -(length / 2 + 25), y: 0}), {
          color: Alt1Color.white,
          width: 12,
          shadow: true,
          centered: true
        })

        if (this.solution && this.current_mainline_index >= 0) {
          const solving_time = (now - this.guiding_start_time) / 1000
          const moves_per_second = this.current_mainline_index / solving_time

          this.progress_overlay.text(`${moves_per_second.toFixed(1)}/s`, center, {
            color: Alt1Color.white,
            width: 12,
            shadow: true,
            centered: true
          })
        }
      }
    }

    this.progress_overlay.render()
  }

  private updateMoveOverlay() {
    if (!this.move_overlay) {
      this.move_overlay = over()
        .withTime(20000)
    }

    this.move_overlay.clear()

    if (!this.solution || !this.last_frame_state) return
    if (this.current_mainline_index == null) return;

    const LOOKAHEAD = this.settings.max_lookahead

    let moves: AnnotatedMoveList = []

    if (this.error_recovery_solution?.sequence) {
      moves.push(...this.error_recovery_solution.sequence)
    }

    moves.push(...this.solution.slice(this.current_mainline_index, this.current_mainline_index + LOOKAHEAD))

    const marker_geometry = over()

    let current_blank = SliderState.blank(this.last_frame_state)
    let last_size = 0

    const recovery_length = this.error_recovery_solution?.sequence?.length ?? 0

    const overlap_prevention_map = new Array(25).fill(false)
    overlap_prevention_map[current_blank] = true

    const move_overlays: LegacyOverlayGeometry[] = []

    for (let i = 0; i < moves.length; ++i) {
      const move = moves[i]
      const real_move = move.clicked_tile - current_blank

      if (this.settings.prevent_overlap) {
        if (overlap_prevention_map[move.clicked_tile]) break

        let blank = current_blank

        for (let m of Move.split(real_move)) {
          blank += m
          overlap_prevention_map[blank] = true
        }
      }

      const is_recovery_move = i < recovery_length
      const as_key = (this.settings.mode == "keyboard" || this.settings.mode == "hybrid") && Move.isSmallStep(real_move)

      const size = is_recovery_move ? 10 : 20 * (1 - (1 / LOOKAHEAD) * (i - recovery_length))

      const clicked_tile_center = this.posToScreen(move.clicked_tile)

      const STROKE = 3
      const CONTRAST_BORDER = 2
      const CONTRAST_COLOR = Alt1Color.black

      if (as_key) {
        const rotation = (() => {
          const arrow_move = this.arrow_keys_inverted ? -real_move : real_move

          switch (arrow_move) {
            case 1:
              return 2
            case -5:
              return 1
            case -1:
              return 0
            case 5:
              return 3
          }
        })()

        const ARROW_SHAFT_SIZE = size / 3

        const points: Vector2[] = [
          {x: -size, y: -ARROW_SHAFT_SIZE},
          {x: 0, y: -ARROW_SHAFT_SIZE},

          {x: 0, y: -size},
          {x: size, y: 0},
          {x: 0, y: size},

          {x: 0, y: ARROW_SHAFT_SIZE},
          {x: -size, y: ARROW_SHAFT_SIZE},
        ].map(p => Vector2.transform_point(
            p,
            Transform.chain(
              Transform.translation(clicked_tile_center),
              Transform.rotation(rotation),
            )
          )
        )

        move_overlays.push(
          over()
            .polyline(points, true, {width: STROKE + 2 * CONTRAST_BORDER, color: CONTRAST_COLOR})
            .polyline(points, true, {
                width: STROKE,
                color: Alt1Color.fromNumber(is_recovery_move
                  ? this.settings.color_recovery_move
                  : this.settings.color_mainline_move)
              }
            )
        )
      } else {
        move_overlays.push(
          over()
            .rect(
              Rectangle.centeredOn(this.posToScreen(move.clicked_tile), size + CONTRAST_BORDER),
              {width: STROKE + 2 * CONTRAST_BORDER, color: Alt1Color.black}
            )
            .rect(
              Rectangle.centeredOn(this.posToScreen(move.clicked_tile), size),
              {width: STROKE, color: is_recovery_move ? Alt1Color.fromNumber(this.settings.color_recovery_move) : Alt1Color.fromNumber(this.settings.color_mainline_move)}
            )
        )
      }

      const blank = move.clicked_tile

      const a = this.posToScreen(current_blank)
      const b = this.posToScreen(blank)

      if (a.x != b.x && a.y != b.y) {
        // This is not a straight line and therefore an error

        log().log(`Invalid Move detected on overlay! From ${current_blank} to ${blank}. Full sequence: ${moves.map(m => m.clicked_tile).join(",")}`, "Slider Solving")
      }

      const dir = Vector2.normalize(Vector2.sub(b, a))

      this.move_overlay.line(
        Vector2.add(a, Vector2.scale(last_size, dir)),
        Vector2.add(b, Vector2.scale(-size, dir)),
        {
          width: 4,
          color: CONTRAST_COLOR
        }
      )

      this.move_overlay.line(
        Vector2.add(a, Vector2.scale(last_size, dir)),
        Vector2.add(b, Vector2.scale(-size, dir)),
        {
          width: 2,
          color: is_recovery_move
            ? Alt1Color.fromNumber(this.settings.color_recovery_line)
            : Alt1Color.fromNumber(this.settings.color_mainline_line)
        }
      )

      current_blank = blank

      last_size = size
    }

    marker_geometry.add(...move_overlays.reverse())

    this.move_overlay.add(marker_geometry)

    this.move_overlay.render()
    this.last_overlay_render = Date.now()

    this.updateProgressOverlay()
  }

  private updateSolvingOverlay() {
    const TEXT_POSITION = {x: 143, y: 133}
    const BAR_POSITION = {x: 143, y: 153}

    if (!this.solving_overlay) {
      this.solving_overlay = over()
    }

    this.solving_overlay.clear()

    if (!this.solution && this.active_solving_process) {
      this.solving_overlay
        .text("Solving",
          Vector2.add(
            this.parent.puzzle.reader.body.screenRectangle().origin,
            TEXT_POSITION
          ),
          {color: Alt1Color.white, width: 20, centered: true, shadow: true}
        )

      this.solving_overlay.progressbar(Vector2.add(
        this.parent.puzzle.reader.body.screenRectangle().origin,
        BAR_POSITION,
      ), 100, this.active_solving_process.solver.getProgress(), 5)
    } else if (!this.solution) {
      this.solving_overlay
        .text("No solution found",
          Vector2.add(
            this.parent.puzzle.reader.body.screenRectangle().origin,
            TEXT_POSITION
          ),
          {color: Alt1Color.red, width: 20, centered: true, shadow: true}
        )
    }

    this.solving_overlay.render()
  }

  tick(capture: CapturedImage): Promise<void> {
    const read_result = this.read(capture)

    if (read_result.result.match_score < SlideReader.DETECTION_THRESHOLD_SCORE) {
      this.puzzleClosed()
      return
    }

    const frame_state = read_result.state

    if (!this.active_solving_process && !this.solution) {

      // Don't try to solve solved configurations - It's likely just the user hovering over 'Hint'
      if (SliderState.equals(frame_state, SliderState.SOLVED)) return

      this.initial_state = frame_state

      this.active_solving_process = {
        solver: this.instantiateSolver(frame_state)
          .onUpdate(solver => {
            this.updateSolvingOverlay()
            this.updateProgressOverlay()
          })
          .withTimeout(this.settings.solve_time_ms),
        solving_from: 0
      }

      this.active_solving_process.solver.run().then(initial_solution => {
        this.active_solving_process = null
        this.current_mainline_index = 0
        this.error_recovery_solution = {sequence: [], recovering_to_mainline_index: 0, last_known_state: null}

        this.guiding_start_time = Date.now()

        this.updateSolvingOverlay()

        if (initial_solution) {
          this.solution = Sliders.MoveList.annotate(frame_state, initial_solution, this.settings.mode != "keyboard")
        } else {
          this.stop()
        }

        this.updateSolvingOverlay()
      })

      return
    }

    if (!this.solution) return

    const LASOLVING = this.settings.max_lookahead + 7
    if (this.settings.continue_solving_after_initial_solve) {
      if (this.active_solving_process && this.current_mainline_index + this.settings.max_lookahead + 2 >= this.active_solving_process.solving_from) {
        // Getting close to the current start of the solving, stop the solving process
        this.active_solving_process.solver.stop()
        this.active_solving_process = null
      }

      if (!this.active_solving_process && (this.current_mainline_index + LASOLVING < this.solution.length)) {
        const solving_start_index = this.current_mainline_index + LASOLVING

        const solving_start_state = this.solution[solving_start_index - 1].post_state

        const process = this.instantiateSolver(solving_start_state)
          .registerSolution(this.solution.slice(solving_start_index).map(m => m.move))
          .withInterrupt(20, 10) // Cooperative interrupt behaviour
          .onFound(better => {
            if (process == this.active_solving_process?.solver
              && solving_start_index == this.active_solving_process?.solving_from
              && this.current_mainline_index < solving_start_index) {

              const new_sequence = Sliders.MoveList.combine(
                this.solution.slice(0, solving_start_index).map(m => m.move),
                better,
                this.settings.mode != "keyboard"
              )

              const old_solution = this.solution

              this.solution = MoveList.annotate(this.initial_state, new_sequence, this.settings.mode != "keyboard")

              if (index(this.solution, -1).clicked_tile != 24) {
                log().log("Bug detected after updating solution!")

                log().log(`Continuous solving found better solution, combining results`, "Slider Solving", {
                  better: better,
                  attached_to: this.solution.slice(0, solving_start_index).map(m => m.move),
                  combined: new_sequence
                })

                log().log(`Updated annotated move lists`, "Slider Solving", {
                  old: old_solution,
                  new: this.solution,
                })
              }
            }

            process.stop()

            if (process == this.active_solving_process?.solver) {
              this.active_solving_process = null
            }
          })

        this.active_solving_process = {
          solver: process,
          solving_from: solving_start_index
        }

        this.active_solving_process.solver.run()
      }
    }

    const inversion_changed = read_result.inverted_checkmark != this.arrow_keys_inverted
    this.arrow_keys_inverted = read_result.inverted_checkmark

    // Rerender move overlay at least every 10 seconds, so it does not expire
    if (inversion_changed || Date.now() - this.last_overlay_render > 10000) this.updateMoveOverlay()

    // Early exit if state has not changed
    if (this.last_frame_state && SliderState.equals(this.last_frame_state, frame_state)) {
      this.updateProgressOverlay()
      return
    }

    let mainline_index = findLastIndex(this.solution, a => a.pre_states.some(s => SliderState.equals(s, frame_state)))

    if (mainline_index == this.solution.length - 2 && SliderState.equals(frame_state, SliderState.SOLVED)) {
      mainline_index = this.solution.length

      this.solved_time = Date.now()
    }

    if (mainline_index >= 0) {

      // pre_states also includes all states that can be reached from the target state.
      // This causes a bug where a wrong mainline index is inferred
      // This case is fixed with the following hack
      /*if (mainline_index < this.solution.length - 1 && SliderState.equals(frame_state, this.solution[mainline_index + 1].post_state)) {
        mainline_index += 2
      }*/

      this.current_mainline_index = mainline_index
      this.error_recovery_solution = {sequence: [], recovering_to_mainline_index: mainline_index, last_known_state: frame_state}
    } else {
      let recovery_index = this.error_recovery_solution.sequence.findIndex(a => a.pre_states.some(s => SliderState.equals(s, frame_state)))

      if (recovery_index >= 0) {
        // Prune the recovery sequence to just contain the remaining steps
        this.error_recovery_solution.sequence = this.error_recovery_solution.sequence.slice(recovery_index)

        this.error_recovery_solution.last_known_state = frame_state

        this.current_mainline_index = this.error_recovery_solution.recovering_to_mainline_index
      } else {
        // The current state was not found in the recovery sequence

        let recovery_move: Move | null = null

        const target_state_candidates = this.error_recovery_solution?.last_known_state
          ? [this.error_recovery_solution.last_known_state]
          : this.solution[this.current_mainline_index].pre_states

        for (let target of target_state_candidates) {
          recovery_move = SliderState.findMove(frame_state, target)
          if (recovery_move) {
            break
          }
        }

        if (recovery_move != null) {
          let recovery = [recovery_move, ...MoveList.fromTileList(this.error_recovery_solution.sequence.map(s => s.clicked_tile), SliderState.blank(frame_state) + recovery_move)]

          if (this.settings.mode != "keyboard") recovery = MoveList.compress(recovery)
          else recovery = MoveList.expand(recovery)

          // Add recovery move to sequence
          this.error_recovery_solution.sequence =
            MoveList.annotate(frame_state, recovery, this.settings.mode != "keyboard")

          this.error_recovery_solution.last_known_state = frame_state

          this.current_mainline_index = this.error_recovery_solution.recovering_to_mainline_index
        } else {
          // Lost track. Start reset countdown or something

          this.current_mainline_index = null
        }
      }
    }

    this.last_frame_state = frame_state

    this.updateMoveOverlay()
  }

  private instantiateSolver(state: SliderState): SolvingProcess {
    return this.solver.instantiate(state)
      .setCombineStraights(this.settings.mode == "mouse" || this.settings.mode == "hybrid")
  }

  protected end() {
    super.end();

    this.move_overlay?.hide()
    this.solving_overlay?.hide()
    this.progress_overlay?.hide()
    this.active_solving_process?.solver?.stop()
  }

  private getLastKnownMove() {
    return this.error_recovery_solution?.sequence?.[0] ?? this.solution[this.current_mainline_index]
  }

  isDone(): boolean {
    return this.solution && this.current_mainline_index && this.current_mainline_index >= this.solution.length
  }
}

type PDBDesc = {
  is_default: boolean,
  id: string,
  name: string,
  version: number,
  file_count: number,
  description: RegionChainDistanceTable.Description
}

type StoredPDB = {
  description: PDBDesc,
  data: ArrayBuffer,
}

type PDBDownload = Observable<{
  is_done: boolean,
  progress: number,
  data?: RegionChainDistanceTable
}>

export class PDBManager {
  pdbs = async_lazy<PDBDesc[]>(async () => {
    return (await fetch("data/sliderpdb/pdbs.json")).json()
  })

  private cache: {
    description: PDBDesc,
    table: RegionChainDistanceTable
  } = null

  private downloader: Record<string, PDBDownload> = {}

  private constructor() {

  }

  public clearCache(): Promise<void> {
    return this.db.clear()
  }

  private download(desc: PDBDesc): PDBDownload {

    if (this.downloader[desc.id]) return this.downloader[desc.id]

    const res: PDBDownload = this.downloader[desc.id] = observe({
      is_done: false,
      progress: 0
    });

    (async () => {

      const buffer = new Uint8Array(RegionChainDistanceTable.Description.bytesize(desc.description))

      let offset = 0

      let loaded = 0

      for (let i = 0; i < desc.file_count; i++) {

        const response = await fetch(`data/sliderpdb/${desc.id}/v${desc.version}chunk${lodash.padStart(i.toString(), 2, "0")}`, {})

        if (!response.ok) return null;

        const chunk = new Uint8Array(await new Response(new ReadableStream({
          async start(controller) {
            const reader = response.body.getReader();
            for (; ;) {
              const {done, value} = await reader.read();
              if (done) break;
              loaded += value.byteLength;
              res.update2(p => {
                p.progress = loaded / buffer.length
              })
              controller.enqueue(value);
            }
            controller.close();
          },
        })).arrayBuffer())

        buffer.set(chunk, offset)
        offset += chunk.length

        res.update2(p => {
          p.progress = offset / buffer.length
        })
      }

      this.cache = {description: desc, table: new RegionChainDistanceTable(buffer)}
      await this.db.set(desc.id, {description: desc, data: buffer.buffer} satisfies StoredPDB)

      res.update2(o => {
        o.is_done = true
        o.data = this.cache.table
      })

      this.downloader[desc.id] = null
    })()

    return res
  }

  private db = new KeyValueStore("slider-pdbs")

  async find(multitile: boolean = undefined, id: string = undefined): Promise<PDBDesc> {
    const matches = (desc: PDBDesc): boolean => {
      return (multitile == undefined || desc.description.multitile == multitile)
        && (id == undefined || desc.id == id)
    }

    const pdbs = await this.pdbs.get()
    return pdbs.find(matches)
  }

  async findBest(multitile: boolean): Promise<PDBDesc> {
    const pdbs = await this.pdbs.get()

    return pdbs.find(d => d.description.multitile == multitile && d.is_default)
      ?? pdbs.find(d => d.description.multitile == multitile)
  }

  async getSimple(desc: PDBDesc): Promise<RegionChainDistanceTable> {
    const raw = await this.get(desc)

    if (raw.table) return raw.table
    else return new Promise(resolve => {
      raw.download.subscribe(r => {
        if (r.is_done) resolve(r.data)
      })
    })
  }

  async get(preferred: PDBDesc): Promise<{
    table?: RegionChainDistanceTable,
    download?: PDBDownload
  }> {
    if (this.cache?.description?.id != preferred.id || this.cache?.description?.version != preferred.version) {
      const existing_in_indexeddb = await profileAsync(async () => await this.db.get(preferred.id) as StoredPDB, "retrieve")

      if (existing_in_indexeddb && existing_in_indexeddb.description.version == preferred.version) {
        this.cache = {description: preferred, table: new RegionChainDistanceTable(new Uint8Array(existing_in_indexeddb.data))}
      } else {
        return {
          table: null,
          download: this.download(preferred)
        }
      }
    }

    return {table: this.cache.table}
  }

  static instance = lazy(() => new PDBManager())
}

export class SliderSolving extends AbstractPuzzleSolving<
  ClueReader.Result.Puzzle.Slider,
  SliderGuideProcess
> {
  constructor(parent: NeoSolvingBehaviour, public readonly puzzle: ClueReader.Result.Puzzle.Slider) {
    super(parent,
      puzzle,
      deps().app.settings.settings.solving.puzzles.sliders.autostart,
      "Slider Puzzle",
      "sliders"
    )
  }

  protected async constructProcess(): Promise<SliderGuideProcess> {
    const mngr = PDBManager.instance.get()

    const table = await mngr.get(await mngr.findBest(deps().app.settings.settings.solving.puzzles.sliders.mode != "keyboard"))

    const solver = table.table
      ? new PDBSolver(new RegionDistanceTable.RegionGraph(table.table.tables, true))
      : RandomSolver

    const process = new SliderGuideProcess(
      this,
      solver
    )

    if (table.download) {
      const progressbar = new ProgressBar()
        .setText("Downloading Database")

      this.modal.setStatus(progressbar)

      table.download.subscribe(p => {
        progressbar.setProgress(p.progress)

        if (p.is_done) {
          process.setSolver(new PDBSolver(new RegionDistanceTable.RegionGraph(p.data.tables, true)))
          progressbar.setText("Download finished")
          progressbar.setProgress(1)
        }
      }, true)
    }

    return process
  }

  protected begin() {
    super.begin();

    this.modal.setImage(this.puzzle.reader.body.getData())
  }

  pausesClueReader(): boolean {
    return this.process && !this.process.isDone()
  }
}

export namespace SlideGuider {
  export type Settings = {
    mode: "keyboard" | "mouse" | "hybrid",
    autostart: boolean,
    max_lookahead: number,
    prevent_overlap: boolean,
    display_recovery: boolean,
    color_mainline_move: number,
    color_mainline_line: number,
    color_recovery_move: number,
    color_recovery_line: number,
    solve_time_ms: number,
    estimate_slider_speed: boolean,
    improve_slider_matches_backtracking: boolean,
    continue_solving_after_initial_solve: boolean,
  }

  export namespace Settings {

    export const DEFAULT: Settings = {
      mode: "mouse",
      autostart: true,
      max_lookahead: 5,
      prevent_overlap: true,
      display_recovery: true,
      color_mainline_move: Alt1Color.fromHex("#5ca000").for_overlay,
      color_mainline_line: Alt1Color.fromHex("#41740e").for_overlay,
      color_recovery_move: Alt1Color.fromHex("#FF0000").for_overlay,
      color_recovery_line: Alt1Color.fromHex("#ff6600").for_overlay,
      solve_time_ms: 200,
      estimate_slider_speed: false,
      improve_slider_matches_backtracking: true,
      continue_solving_after_initial_solve: true
    }

    export function normalize(settings: Settings): Settings {
      if (!settings) return lodash.cloneDeep(DEFAULT)

      if (!["keyboard", "mouse", "hybrid"].includes(settings.mode)) settings.mode = DEFAULT.mode
      if (![true, false].includes(settings.autostart)) settings.autostart = DEFAULT.autostart
      if (typeof settings.max_lookahead != "number") settings.max_lookahead = DEFAULT.max_lookahead
      if (![true, false].includes(settings.prevent_overlap)) settings.prevent_overlap = DEFAULT.prevent_overlap
      if (![true, false].includes(settings.display_recovery)) settings.display_recovery = DEFAULT.display_recovery
      if (![true, false].includes(settings.display_recovery)) settings.display_recovery = DEFAULT.display_recovery
      if ((typeof settings.color_mainline_move) != "number") settings.color_mainline_move = DEFAULT.color_mainline_move
      if ((typeof settings.color_mainline_line) != "number") settings.color_mainline_line = DEFAULT.color_mainline_line
      if ((typeof settings.color_recovery_move) != "number") settings.color_recovery_move = DEFAULT.color_recovery_move
      if ((typeof settings.color_recovery_line) != "number") settings.color_recovery_line = DEFAULT.color_recovery_line
      if ((typeof settings.solve_time_ms) != "number") settings.solve_time_ms = DEFAULT.solve_time_ms
      if (![true, false].includes(settings.estimate_slider_speed)) settings.estimate_slider_speed = DEFAULT.estimate_slider_speed
      if (![true, false].includes(settings.improve_slider_matches_backtracking)) settings.improve_slider_matches_backtracking = DEFAULT.improve_slider_matches_backtracking
      if (![true, false].includes(settings.continue_solving_after_initial_solve)) settings.continue_solving_after_initial_solve = DEFAULT.continue_solving_after_initial_solve

      settings.solve_time_ms = lodash.clamp(settings.solve_time_ms, 100, 5000)

      return settings
    }
  }
}