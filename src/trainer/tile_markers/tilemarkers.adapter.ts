import { delay } from "lib/alt1gl/ts/util/util";
import NeoSolvingBehaviour from "../ui/neosolving/NeoSolvingBehaviour";

export class TileMarkersAdapter {
    private static instance: TileMarkersAdapter;
    private behaviour: NeoSolvingBehaviour | null = null;

    private constructor() {}

    static getInstance(): TileMarkersAdapter {
        if (!TileMarkersAdapter.instance) {
            TileMarkersAdapter.instance = new TileMarkersAdapter();
        }
        return TileMarkersAdapter.instance;
    }

    /**
     * Set the NeoSolvingBehaviour instance to track state from
     */
    setBehaviour(behaviour: NeoSolvingBehaviour): void {
        this.behaviour = behaviour;
    }

    private async loop(): Promise<void> {
        while(true) {
            const state = this.behaviour.active_method;

            console.log(state)
            await delay(600);
        }
    }
}