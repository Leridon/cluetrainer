import {util} from "./util";

export type TreeArray<LeafT, InnerT = LeafT> = TreeArray.InnerNode<LeafT, InnerT> | TreeArray.Leaf<LeafT>

export namespace TreeArray {

  export type InnerNode<LeafT, InnerT> = {
    type: "inner",
    value: InnerT,
    children: TreeArray<LeafT, InnerT>[]
  }

  export type Leaf<LeafT> = {
    type: "leaf",
    value: LeafT
  }

  export function init<Inner>(value: Inner): InnerNode<any, Inner> {
    return inner(value, [])
  }

  export function inner<Inner>(value: Inner, children: TreeArray<any, Inner>[] = []): InnerNode<any, Inner> {
    return {
      type: "inner",
      value: value,
      children: children
    }
  }

  export function leaf<LeafT>(value: LeafT): Leaf<LeafT> {
    return {
      type: "leaf",
      value: value
    }
  }

  export function leafs<LeafT>(value: LeafT[]): Leaf<LeafT>[] {
    return value.map(leaf)
  }

  export function add<Leaf, Inner, t extends TreeArray<Leaf, Inner>>(tree: InnerNode<Leaf, Inner>, node: t): t {
    tree.children.push(node)

    return node
  }


  export function index<Inner, Leaf>(node: TreeArray<Leaf, Inner>, indices: number[]): TreeArray<Leaf, Inner> {
    return util.index(getPath(node, indices), -1)
  }

  export function map<Inner, Leaf, U>(array: TreeArray<Leaf, Inner>, f: (el: Leaf) => U): TreeArray<U, Inner> {
    if (array.type == "leaf") return leaf(f(array.value))
    else return {
      type: "inner",
      value: array.value,
      children: array.children.map(c => map(c, f))
    }
  }

  export function forLeafs<Inner, Leaf>(array: TreeArray<Leaf, Inner>, f: (el: Leaf) => void): void {
    if (array.type == "leaf") f(array.value)
    else array.children.forEach(c => forLeafs(c, f))
  }

  export function fixIndex<Inner, Leaf>(node: TreeArray<Leaf, Inner>, indices: number[]): number[] {
    let result: number[] = []

    let i = 0

    let current_node = node

    while (true) {
      if (current_node?.type != "inner") return result
      else {
        let index = i < indices.length ? indices[i] : 0

        result.push(index)

        current_node = current_node.children[index]
      }

      i++
    }
  }

  export function getPath<Inner, Leaf>(node: TreeArray<Leaf, Inner>, indices: number[]): TreeArray<Leaf, Inner>[] {
    let nodes = [node]

    for (let i of indices) {
      if (node.type != "inner") break

      node = node.children[i]
      nodes.push(node)
    }

    return nodes
  }
}