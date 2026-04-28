import Behaviour from "../../../lib/ui/Behaviour";
import type MethodEditor from "./MethodEditor";
import {SolvingMethods} from "../../model/SolvingMethods";
import {Observable, observe} from "../../../lib/reactive";
import {GameLayer} from "../../../lib/gamemap/GameLayer";
import TransportLayer from "../map/TransportLayer";
import ClueAssumptions = SolvingMethods.ClueAssumptions;

export default abstract class MethodSubEditor extends Behaviour {
  public layer: GameLayer

  assumptions: Observable<ClueAssumptions> = observe(ClueAssumptions.init())

  protected constructor(protected parent: MethodEditor) {
    super();
  }

  protected begin() {
    this.layer.add(new TransportLayer(true))
  }

  setAssumptions(assumptions: ClueAssumptions): this {
    this.assumptions.set(assumptions)

    return this
  }
}
