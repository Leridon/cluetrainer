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
}