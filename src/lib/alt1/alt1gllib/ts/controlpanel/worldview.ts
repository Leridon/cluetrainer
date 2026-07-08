import { getRenderFunc, getUniformValue, MeshSprite, renderToSprite } from "../render/renderprogram";
import { convertRendersToGLTF, convertCallsToRenderfuncs } from "../render/modelviewer/meshbuilder";
import { GameState, WorldObject, getGameState, tilesize, modelToScreen, WorldMesh, WorldPosition2d } from "../render/reflect3d";
import { Matrix3, Matrix4, Vector2, Vector3 } from "three";
import { BufferCache, CharacterRef, FilteredGameState } from "../programs/filteredstate"
import { KnownBuffer, saveKnowBuffer } from "../render/assetcache";
import { arrayEnum, mat3ToCtxArgs, newDragHandler } from "../util/util";
import * as physics from "../programs/physicsmock";

declare var requestIdleCallback: any;
const spritePixelsPerUnit = 64 / tilesize;

type ModelCallback = (mode: Uint8Array, name: string) => any;

var camModes = arrayEnum(["char", "abs"]);
var viewmodes = arrayEnum(["renders", "mixed", "world"]);

type TopdownRenderState = {
	playing: boolean,
	showBorders: boolean,
	cammode: typeof camModes[number],
	viewmode: typeof viewmodes[number],
	pxpertile: number,
	selectedMesh: WorldObject | null,
	selectedCharacter: CharacterRef | null,
	targetRequest: physics.TargetRequest | null,
	selectedPosition: Matrix4 | null,
	sparse: boolean
}

function characterUI(chr: physics.Character | null | undefined, api: physics.WorldUIApi) {
	// TODO fix multirepo react situation with physics
	// if (chr) {
	// 	return chr.programStack.map((q, i) => {
	// 		return <div className="ph-menubar__program" key={i}>{q.program.name} {!q.program.ui ? programStateText(q.state) : <q.program.ui chr={chr} api={api} state={q.state} />}</div>;
	// 	});
	// }
	return null;
}
function programStateText(obj: object) {
	let str = "";
	for (let prop in obj) {
		if (str) { str += ", "; }
		str += prop + ": " + obj[prop];
	}
	return str;
}

function getObjectVisual(obj: WorldObject) {
	if (!obj.typeMatch.spriteProm) {
		let renders = obj.meshes.map(q => q.render);
		obj.typeMatch.spriteProm = new Promise<MeshSprite>(done => {
			requestIdleCallback(() => renderToSprite(convertCallsToRenderfuncs(renders), spritePixelsPerUnit).then(sprite => {
				obj.typeMatch.sprite = sprite;
				done(sprite);
			}));
		});
	}

	let r: WorldPosition2d & { match: KnownBuffer } = {
		...obj.master.position2d,
		match: obj.typeMatch
	};
	return r;
}

function modelspaceToWorld2d(model: WorldPosition2d) {
	return new Matrix3()
		.rotate(-model.yRotation)
		.translate(model.xnew * tilesize, model.znew * tilesize);
}
