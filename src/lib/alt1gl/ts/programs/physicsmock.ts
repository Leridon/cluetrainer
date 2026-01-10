export class Character {
    id: number;
    x = 0;
    z = 0;
    config: CharacterConfig;
    constructor(id: number, config: CharacterConfig) {
        this.id = id;
        this.config = config;
    }

    stepTile(pos: WorldPoint) {
        this.x = pos.x;
        this.z = pos.z;
    }
    *tick() { }
}

export class World {
    npcs: Character[] = [];
    charidcounter = 1;
    xoffset = 0;
    zoffset = 0;
    width = 0;
    height = 0;

    cachedChunks: CachedChunk[] = [];

    constructor(level: number, xoffset: number, zoffset: number, w: number, h: number) {

    }

    async preloadChunks() {

    }
    loadFromPreloads() {

    }

    moveGrid(xoffset: number, zoffset: number, w: number, h: number) {
        this.xoffset = xoffset;
        this.zoffset = zoffset;
        this.width = w;
        this.height = h;
    }

    addCharacter(conf: CharacterConfig, pos: WorldPoint, prog?: any, progargs?: any) {
        let char = new Character(this.charidcounter++, conf);
        char.x = pos.x;
        char.z = pos.z;
        this.npcs.push(char);
        return char;
    }
    removeCharacter(chr: Character) {
        let index = this.npcs.indexOf(chr);
        if (index != -1) { this.npcs.splice(index, 1); }
    }


    *allCharacters() {
        yield* this.npcs;
        // yield* this.players;
    }
}

export type CachedChunk = {
    mapx: number,
    mapz: number,
    xsize: number, zsize: number,
    tiles: any[],
    backgrounds: any[],
    chunkmetas: {
        locdatas: Record<string, { name: string }>,
        locs: any[]
    }[]
}

export interface CharacterConfig {
    name: string,
    size: number
}

export type targetmode = "current" | "currentornone" | "none" | "clickground" | "clickentity" | "clickentityorground";

export type TargetRequest = {
    cb: (t: WorldTarget) => any,
    mode: targetmode
};


export type WorldTarget = {
    floor: WorldPoint | null,
    char: Character | null
};


export interface WorldPoint {
    x: number;
    z: number;
}


export type WorldUIApi = {
    getTarget: (req: TargetRequest) => void,
    refresh: () => void,
    addKeyListener: (cb: (e: KeyboardEvent) => boolean) => void,
    removeKeyListener: (cb: (e: KeyboardEvent) => boolean) => void,
}

export function renderWorld(ctx: CanvasRenderingContext2D, map: World, background = true) {

}

export function defaultCharacterConfig() {
    let r: CharacterConfig = {
        name: "",
        size: 1,
    };
    return r;
}

export function defaultPlayerConfig() {
    let r: CharacterConfig = {
        ...defaultCharacterConfig(),
        name: "player"
    }
    return r;
}
