export type EntityName = {
  name: string,
  kind: EntityName.Kind
}

export namespace EntityName {
  export type Kind = "npc" | "static" | "item"
}