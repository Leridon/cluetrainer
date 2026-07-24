import KeyValueStore from "../lib/util/KeyValueStore";
import { ClueSpotIndex } from "../../lib/cluetrainer-core/src/model/clues/ClueIndex";
import { Clues } from "../../lib/cluetrainer-core/src/model/Clues";
import { clue_data } from "../data/clues";
import { ewent } from "../lib/reactive";
import { util } from "../lib/util/util";
import { Log } from "../lib/util/Log";
var timestamp = util.timestamp;
var ClueSpot = Clues.ClueSpot;
var uuid = util.uuid;
var log = Log.log;
import { AugmentedMethod, MethodPack } from "../../lib/cluetrainer-core/src/model/MethodPack";
import { FakeLodash } from "../lib/coreutil/FakeLodash";
export var LocalMethodId;
(function (LocalMethodId) {
    function fromMethod(method) {
        return { local_pack_id: method.pack.local_id, method_id: method.method.id };
    }
    LocalMethodId.fromMethod = fromMethod;
    function equals(a, b) {
        return a.local_pack_id == b.local_pack_id && a.method_id == b.method_id;
    }
    LocalMethodId.equals = equals;
})(LocalMethodId || (LocalMethodId = {}));
export class MethodPackManager {
    initialized;
    local_pack_store = KeyValueStore.instance().variable("data/local_methods");
    default_packs;
    local_packs = [];
    pack_set_changed = ewent();
    saved = ewent();
    index_created;
    method_index = ClueSpotIndex.simple(clue_data.index).with(() => ({ methods: [] }));
    constructor() {
        this.initialized = (async () => {
            this.local_packs = (await this.local_pack_store.get()) ?? [];
            this.local_packs.forEach(pack => pack.is_real_default = undefined);
            this.default_packs = [
                await (await fetch("/data/method_packs/scans_zyklop.json")).json(),
                await (await fetch("/data/method_packs/easy_ngis.json")).json(),
                await (await fetch("/data/method_packs/medium_ngis.json")).json(),
                await (await fetch("/data/method_packs/hard_ngis.json")).json(),
                await (await fetch("/data/method_packs/master_ngis.json")).json(),
                await (await fetch("/data/method_packs/elite_compass_ngis.json")).json(),
                await (await fetch("/data/method_packs/tetras_ngis.json")).json(),
            ];
            this.default_packs.forEach(pack => pack.is_real_default = true);
        })();
        this.invalidateIndex();
        this.pack_set_changed.on(() => this.invalidateIndex());
    }
    async save() {
        await this.local_pack_store.set(this.local_packs);
        this.invalidateIndex();
        this.saved.trigger(null);
    }
    invalidateIndex() {
        this.index_created = new Promise(async (resolve) => {
            this.method_index.forEach(e => e.methods = []);
            (await this.all()).forEach(p => {
                p.methods.forEach(m => {
                    this.method_index.get(m.for, false)?.methods?.push(AugmentedMethod.create(m, p));
                });
            });
            resolve();
        });
    }
    async all() {
        await this.initialized;
        return [...this.default_packs.filter(pack => !this.local_packs.some(local_pack => local_pack.local_id == pack.local_id)), ...this.local_packs];
    }
    local() {
        return [...this.local_packs];
    }
    /**
     * Clones and saves the given pack locally.
     * The pack is copied and gets a new id.
     *
     * The copied and modified pack is returned
     *
     * @param pack
     * @param keep_identity
     */
    async create(pack, keep_identity = false) {
        pack = FakeLodash.cloneDeep(pack);
        pack.is_real_default = undefined;
        if (!keep_identity) {
            pack.local_id = uuid();
            pack.original_id = pack.local_id;
            pack.type = "local";
            pack.timestamp = timestamp();
        }
        this.local_packs.push(pack);
        await this.save();
        this.pack_set_changed.trigger(await this.all());
        return pack;
    }
    /**
     * Clones and saves the given pack locally as an imported pack.
     * The pack is copied, but keeps its id.
     *
     * The copied pack is returned
     *
     * @param pack
     * @param keep_identity
     */
    async import(pack, keep_identity = false) {
        pack = FakeLodash.cloneDeep(pack);
        if (!keep_identity) {
            pack.local_id = uuid();
            pack.type = "imported";
        }
        this.local_packs.push(pack);
        this.invalidateIndex();
        await this.save();
        this.pack_set_changed.trigger(await this.all());
        return pack;
    }
    async getPack(local_id) {
        return (await this.all()).find(p => p.local_id == local_id);
    }
    async deletePack(pack, save = true) {
        if (pack.is_real_default) {
            log().log("Attempting to delete default pack");
            return;
        }
        let i = this.local_packs.findIndex(p => p.local_id == pack.local_id);
        if (i < 0) {
            log().log("Attempting to delete non-existing pack");
            return;
        }
        this.local_packs.splice(i, 1);
        if (save) {
            await this.save();
            this.pack_set_changed.trigger(await this.all());
        }
    }
    async updatePack(pack, f) {
        if (pack.is_real_default)
            return;
        f(pack);
        pack.timestamp = timestamp();
        await this.save();
        return pack;
    }
    async replacePack(existing, updated) {
        await this.deletePack(existing, false);
        updated.local_id = existing.local_id;
        await this.create(updated, true);
    }
    async updateMethod(method) {
        const pack = this.local_packs.find(p => MethodPack.isEditable(p) && p.local_id == method.pack.local_id);
        const i = pack.methods.findIndex(m => m.id == method.method.id);
        if (i >= 0) {
            pack.methods[i] = method.method;
        }
        else {
            pack.methods.push(method.method);
        }
        method.method.timestamp = pack.timestamp = timestamp();
        this.save();
    }
    deleteMethod(method) {
        let pack = this.local_packs.find(p => MethodPack.isEditable(p) && p.local_id == method.pack.local_id);
        let i = pack.methods.findIndex(m => m.id == method.method.id);
        pack.methods.splice(i, 1);
        pack.timestamp = timestamp();
        this.save();
    }
    static _instance = null;
    static instance() {
        if (!MethodPackManager._instance)
            MethodPackManager._instance = new MethodPackManager();
        return MethodPackManager._instance;
    }
    async getForClue(id, pack_ids = undefined) {
        await this.index_created;
        const all_methods = this.method_index.get(id)?.methods ?? [];
        if (pack_ids) {
            return all_methods.filter(m => pack_ids.includes(m.pack.local_id));
        }
        else {
            return all_methods;
        }
    }
    async get(spot, pack_ids = undefined) {
        // TODO: Why would I need both this method and getForClue?
        return await this.getForClue(ClueSpot.toId(spot), pack_ids);
    }
    async getMethod(pack_id, method_id) {
        const pack = await this.getPack(pack_id);
        if (!pack)
            return null;
        return pack.methods.find(m => m.id == method_id);
    }
    async resolve(id) {
        const pack = (await this.all()).find(p => p.local_id == id.local_pack_id);
        if (!pack)
            return null;
        const method = pack.methods.find(m => m.id == id.method_id);
        if (!method)
            return null;
        return AugmentedMethod.create(method, pack);
    }
}
