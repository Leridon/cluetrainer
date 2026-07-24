import { SolvingMethods } from "../../lib/cluetrainer-core/src/model/SolvingMethods";
import { Clues } from "../../lib/cluetrainer-core/src/model/Clues";
import { Ewent } from "../lib/reactive";
import Method = SolvingMethods.Method;
import ClueSpot = Clues.ClueSpot;
import { AugmentedMethod, MethodPack } from "../../lib/cluetrainer-core/src/model/MethodPack";
export type LocalMethodId = {
    local_pack_id: string;
    method_id: string;
};
export declare namespace LocalMethodId {
    function fromMethod(method: AugmentedMethod): LocalMethodId;
    function equals(a: LocalMethodId, b: LocalMethodId): boolean;
}
export declare class MethodPackManager {
    initialized: Promise<void>;
    readonly local_pack_store: import("../lib/util/KeyValueStore").KeyValueStoreVariable<MethodPack[]>;
    private default_packs;
    private local_packs;
    pack_set_changed: Ewent.Real<MethodPack[]>;
    saved: Ewent.Real<null>;
    private index_created;
    private method_index;
    private constructor();
    private save;
    private invalidateIndex;
    all(): Promise<MethodPack[]>;
    local(): MethodPack[];
    /**
     * Clones and saves the given pack locally.
     * The pack is copied and gets a new id.
     *
     * The copied and modified pack is returned
     *
     * @param pack
     * @param keep_identity
     */
    create(pack: MethodPack, keep_identity?: boolean): Promise<MethodPack>;
    /**
     * Clones and saves the given pack locally as an imported pack.
     * The pack is copied, but keeps its id.
     *
     * The copied pack is returned
     *
     * @param pack
     * @param keep_identity
     */
    import(pack: MethodPack, keep_identity?: boolean): Promise<MethodPack>;
    getPack(local_id: string): Promise<MethodPack>;
    deletePack(pack: MethodPack, save?: boolean): Promise<void>;
    updatePack(pack: MethodPack, f: (_: MethodPack) => any): Promise<MethodPack>;
    replacePack(existing: MethodPack, updated: MethodPack): Promise<void>;
    updateMethod(method: AugmentedMethod): Promise<void>;
    deleteMethod(method: AugmentedMethod): void;
    static _instance: MethodPackManager;
    static instance(): MethodPackManager;
    getForClue(id: ClueSpot.Id, pack_ids?: string[]): Promise<AugmentedMethod[]>;
    get(spot: ClueSpot, pack_ids?: string[]): Promise<AugmentedMethod[]>;
    getMethod(pack_id: string, method_id: string): Promise<Method>;
    resolve(id: LocalMethodId): Promise<AugmentedMethod>;
}
