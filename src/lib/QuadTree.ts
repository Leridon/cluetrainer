import * as lodash from "lodash";
import {Rectangle, Vector2} from "./math";

export class QuadTree<T extends QuadTree.Element<T>> {
  elements: T[] = []
  private subdivisions: QuadTree<T>[] = []
  private is_dirty = false

  private cull_rectangle: Rectangle = null
  private is_culled = false

  private constructor(private parent: QuadTree<T>,
                      private rect: Rectangle) {

  }

  private propagateCulled(rect: Rectangle, is_culled: boolean, per_element_culling: boolean = false) {
    this.cull_rectangle = rect

    const was_culled = this.is_culled

    if (is_culled && !was_culled) {
      this.is_culled = is_culled

      this.elements.forEach(e => e.setCulled(true))
      this.subdivisions.forEach(sub => sub.propagateCulled(rect, true))
    } else if (!is_culled) {
      this.is_culled = is_culled

      if (per_element_culling) {
        this.elements.forEach(e => e.setCulled(!Rectangle.overlaps(e.bounds(), rect)))
      } else {
        this.elements.forEach(e => e.setCulled(false))
      }

      this.subdivisions.forEach(sub => {
        sub.cull(rect, per_element_culling)
      })
    }
  }

  cull(rect: Rectangle, per_element_culling: boolean = false) {
    if (!rect) return

    this.propagateCulled(rect, !Rectangle.overlaps(rect, this.rect), per_element_culling)
  }

  private createSubdivisions() {
    this.is_dirty = false

    if (Rectangle.width(this.rect) <= 32) return;
    if (this.subdivisions.length > 0) return

    const center = Rectangle.center(this.rect)

    this.subdivisions = [
      Rectangle.from(this.rect.topleft, Vector2.add(center, {x: 0, y: 1})),
      Rectangle.from(Rectangle.topRight(this.rect), Vector2.add(center, {x: 1, y: 1})),
      Rectangle.from(this.rect.botright, Vector2.add(center, {x: 1, y: 0})),
      Rectangle.from(Rectangle.bottomLeft(this.rect), center),
    ].map(s => new QuadTree<T>(this, s))

    // Resort elements
    const elements = this.elements
    this.elements = []

    this.cull(this.cull_rectangle)

    elements.forEach(e => this.insert(e))
  }

  insert(...elements: T[]) {
    const affectedNodes = elements.map(element => {
      const bounds = element.bounds()

      function pushDown(self: QuadTree<T>): QuadTree<T> {
        // Find eligible subdivision
        const next = self.subdivisions.find(s => Rectangle.containsRect(s.rect, bounds))

        if (next) return pushDown(next)
        else {
          element.setCulled(self.is_culled)

          self.elements.push(element)

          element.spatial = self

          self.is_dirty = true

          return self
        }
      }

      return pushDown(this)
    })

    affectedNodes.forEach(node => {
      if (node.is_dirty) {
        if (node.elements.length > 10) node.createSubdivisions()

        node.is_dirty = false
      }
    })
  }

  remove(...elements: T[]) {
    this.elements = this.elements.filter(e => !elements.includes(e))

    elements.forEach(e => {
      e.spatial = null
      e.setCulled(false)
    })
  }

  forEachVisible(f: (_: T) => void): void {
    if (this.is_culled) return

    this.elements.forEach(f)

    this.subdivisions.forEach(sub => sub.forEachVisible(f))
  }

  isLeaf(): boolean {
    return this.subdivisions.length == 0
  }

  bounds(): Rectangle {
    return lodash.cloneDeep(this.rect)
  }

  isCulled(): boolean {
    return this.is_culled
  }

  getChildren(): QuadTree<T>[] {
    return [...this.subdivisions] // Create a copy of the array to prevent modification to internals
  }

  getElements(): T[] {
    return [...this.elements] // Create a copy of the array to prevent modification to internals
  }

  static init<T extends QuadTree.Element<T>>(rect: Rectangle): QuadTree<T> {
    return new QuadTree<T>(null, rect)
  }
}

export namespace QuadTree {
  export interface Element<T> {
    spatial: QuadTree<Element<T>>

    bounds(): Rectangle

    setCulled(v: boolean): void
  }
}