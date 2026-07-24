import {Observable, observe} from "./reactive";
import {identity} from "lodash";

export class StateStack<T> {
  canUndo: Observable<boolean> = observe(false)
  canRedo: Observable<boolean> = observe(false)

  private state: { current_state: T, undo: T[], redo: T[] } = {
    current_state: undefined,
    undo: [],
    redo: []
  }

  private update() {
    this.canUndo.set(this.state.undo.length > 0)
    this.canRedo.set(this.state.redo.length > 0)
  }

  pushState(value: T) {
    if (this.state.current_state !== undefined) {
      this.state.undo.push(this.state.current_state)
    }

    this.state.current_state = value

    this.state.redo = []

    this.update()
  }

  undo(): T {
    if (this.state.undo.length > 0) {
      this.state.redo.push(this.state.current_state)

      this.state.current_state = this.state.undo.pop()

      this.update()

      return this.state.current_state
    }
  }

  redo(): T {

    if (this.state.redo.length > 0) {
      this.state.undo.push(this.state.current_state)

      this.state.current_state = this.state.redo.pop()

      this.update()

      return this.state.current_state
    }
  }

  reset() {
    this.state.undo = []
    this.state.redo = []
    this.state.current_state = undefined

    this.update()
  }
}

export class UndoRedo<T> {
  stack = new StateStack<T>()

  canUndo = this.stack.canUndo.map(identity)
  canRedo = this.stack.canRedo.map(identity)

  constructor(private apply_state: (state: T) => any | Promise<any>) {}

  undo(): void | Promise<void> {
    if (this.stack.canUndo.value()) {
      return this.apply_state(this.stack.undo())
    }
  }

  redo(): void | Promise<void> {
    if (this.stack.canRedo.value()) {
      return this.apply_state(this.stack.redo())
    }
  }
}