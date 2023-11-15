import * as leaflet from "leaflet"
import {GameMap} from "./GameMap";
import {LayerGroup} from "leaflet";
import {GameMapContextMenuEvent, GameMapKeyboardEvent, GameMapMouseEvent} from "./MapEvents";
import {TileMarker} from "./TileMarker";
import {EwentHandlerPool} from "../reactive/EwentHandlerPool";

export default class GameLayer extends leaflet.FeatureGroup {
    public handler_pool: EwentHandlerPool = new EwentHandlerPool()

    protected parent: GameLayer | null = null
    protected map: GameMap | null = null

    constructor() {
        super();
        new TileMarker({x: 0, y: 0, level: 0}).withMarker().addTo(this)
    }

    isRootLayer(): boolean {
        return this.parent == null
    }

    getMap(): GameMap {
        return this.map
    }

    remove(): this {
        if (this.parent) this.parent.removeLayer(this)
        else super.remove()

        return this
    }

    add(layer: GameLayer): this {
        this.addLayer(layer)

        layer.parent = this

        return this
    }

    addTo(layer: GameMap | LayerGroup | GameLayer): this {
        if (layer instanceof GameLayer) layer.add(this)
        else if (layer instanceof GameMap) layer.addGameLayer(this)
        else super.addTo(layer)

        return this
    }

    onAdd(map: GameMap): this {
        this.map = map

        return super.onAdd(map)
    }

    onRemove(map: GameMap): this {
        this.map = null

        this.handler_pool.kill()

        return super.onRemove(map);
    }

    eventContextMenu(event: GameMapContextMenuEvent) {}

    eventClick(event: GameMapMouseEvent) {}

    eventHover(event: GameMapMouseEvent) {}

    eventMouseUp(event: GameMapMouseEvent) {}

    eventMouseDown(event: GameMapMouseEvent) {}

    eventKeyDown(event: GameMapKeyboardEvent) {}

    eventKeyUp(event: GameMapKeyboardEvent) {}
}