import {UndoRedo} from "../../lib/UndoRedo";
import {observe} from "../../lib/reactive";
import {Path} from "../../lib/runescape/pathing";
import {PathStepEntity} from "../ui/map/entities/PathStepEntity";
import {GameLayer} from "../../lib/gamemap/GameLayer";
import * as lodash from "lodash";
import {util} from "../../lib/util/util";
import {TileArea} from "../../lib/runescape/coordinates/TileArea";
import movement_state = Path.movement_state;
import copyUpdate = util.copyUpdate;

export class PathBuilder {
  private commit_lock: Promise<void> = Promise.resolve()

  preview_layer: GameLayer
  undoredo: UndoRedo<PathBuilder.SavedState>

  cursor = 0

  committed_value = observe<PathBuilder.Value>(null)

  cursor_state = observe<PathBuilder.CursorState>(null)

  private path: Path = []

  constructor(private meta: {
                target?: TileArea.ActiveTileArea[],
                start_state?: movement_state
              } = {},
              initial_value: Path = []) {
    this.undoredo = new UndoRedo<PathBuilder.SavedState>(state => this.setState(state))

    this.preview_layer = new GameLayer()

    this.commit(initial_value.length, initial_value)
  }

  async commit(cursor: number | undefined, path: Path | undefined, save_state: boolean = true) {
    await this.commit_lock

    this.commit_lock = (async () => {
      // Update cursor
      const length = path !== undefined ? path.length : this.path.length
      this.cursor = Math.max(0, Math.min(length, cursor ?? this.cursor))

      if (path !== undefined) {
        this.path = path

        const augmented = await Path.augment(this.path, this.meta.start_state, this.meta.target)

        const steps = augmented.steps.map((step, index): PathBuilder.Step => {
          return new PathBuilder.Step(
            this,
            index,
            step,
          )
        })

        // Render previews
        {
          const layer = new GameLayer()

          steps.forEach(v => {
            v.associated_preview = new PathStepEntity(v.step.raw)
              .setInteractive()
              .addTo(layer)
          })

          this.preview_layer.clearLayers().add(layer)
        }

        this.committed_value.set({
          builder: this,
          path: augmented,
          steps: steps,
        })
      }

      if (save_state) this.saveState()

      this.cursor_state.set({
        state: Path.augmented.getState(this.committed_value.value().path, this.cursor),
        value: this.committed_value.value(),
        cursor: this.cursor
      })
    })()
  }

  setCursor(index: number): this {
    this.commit(index, undefined, false)

    return this
  }

  add(...steps: Path.Step[]): this {
    this.commit(
      this.cursor + steps.length,
      copyUpdate(this.path, path => {
        path.splice(this.cursor, 0, ...steps)
      })
    )

    return this
  }

  move(from: number, to: number): this {
    if (from == to || from + 1 == to) return

    let cursor_offset = 0

    if (from >= this.cursor && to < this.cursor) cursor_offset = 1
    if (from < this.cursor && to > this.cursor) cursor_offset = -1

    this.commit(
      this.cursor + cursor_offset,
      copyUpdate(this.path, path => {
        const [removed] = path.splice(from, 1)

        if (from <= to) to -= 1

        path.splice(to, 0, removed)
      })
    )

    return this
  }

  delete(index: number): this {
    if (index < 0 || index >= this.path.length) return this

    const isBeforeCursor = index < this.cursor

    this.commit(
      isBeforeCursor ? this.cursor - 1 : this.cursor,
      copyUpdate(this.path, path => {
        path.splice(index, 1)
      })
    )

    return this
  }

  updateCopy(index: number, f: (_: Path.Step) => void): this {
    const copy = lodash.cloneDeep(this.path[index])

    f(copy)

    return this.update(index, copy)
  }

  update(index: number, step: Path.Step): this {
    this.commit(
      undefined,
      copyUpdate(this.path, path => {
        path[index] = lodash.cloneDeep(step)
      })
    )

    return this
  }

  async set(path: Path, reset_history: boolean = false, cursor: number | undefined = undefined): Promise<this> {
    await this.commit_lock

    if (reset_history) {
      this.undoredo.stack.reset()
    }

    this.commit(
      cursor ?? path.length,
      path
    )

    return this
  }

  copyState(): PathBuilder.SavedState {
    return {
      cursor: this.cursor,
      path: lodash.cloneDeep(this.path)
    }
  }

  private saveState(): void {
    this.undoredo.stack.pushState(this.copyState())
  }

  private async setState(state: PathBuilder.SavedState): Promise<void> {
    this.commit(
      state.cursor,
      state.path,
      false
    )
  }

  get(): Path {
    return this.path
  }
}

export namespace PathBuilder {
  export class Step {
    associated_preview: PathStepEntity = null

    constructor(
      public parent: PathBuilder,
      public index: number,
      public step: Path.augmented_step,
    ) {}

    update<T extends Path.Step>(f: (_: T) => void): void {
      this.parent.updateCopy(this.index, f)
    }

    delete(): void {
      this.parent.delete(this.index)
    }
  }

  export type CursorState = {
    cursor: number,
    state: movement_state,
    value: Value
  }

  export type Value = {
    builder: PathBuilder,
    path: Path.augmented,
    steps: PathBuilder.Step[]
  }

  export type SavedState = {
    cursor: number,
    path: Path.raw
  }
}
