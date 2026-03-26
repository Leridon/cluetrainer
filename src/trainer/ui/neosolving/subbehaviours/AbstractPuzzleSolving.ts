import {NeoSolvingSubBehaviour} from "../NeoSolvingSubBehaviour";
import NeoSolvingBehaviour from "../NeoSolvingBehaviour";
import {ClueReader} from "../cluereader/ClueReader";
import {PuzzleModal} from "../PuzzleModal";
import {AbstractPuzzleProcess} from "./AbstractPuzzleProcess";
import {SettingsEdit} from "../../settings/SettingsEdit";
import section_id = SettingsEdit.section_id;

export abstract class AbstractPuzzleSolving<
  PuzzleT extends ClueReader.Result.Puzzle.Puzzle,
  ProcessT extends AbstractPuzzleProcess
> extends NeoSolvingSubBehaviour {
  public process: ProcessT
  public modal: PuzzleModal

  protected constructor(
    name: string,
    parent: NeoSolvingBehaviour,
    public puzzle: PuzzleT,
    private autostart: boolean,
    private modal_title: string,
    public settings_id: section_id
  ) {
    super(name, parent, "clue");
  }

  protected abstract constructProcess(): ProcessT | Promise<ProcessT>

  async resetProcess(start: boolean) {
    if (this.process) {
      this.process.stop()
      this.process = null
    }

    if (start) {
      this.process = await this.constructProcess()
      this.process.puzzle_closed.on(() => this.endClue("Puzzle Process reported a closed puzzle"))
      this.process.start()
    }

    this.modal.update()
  }

  protected begin() {
    this.modal = new PuzzleModal(this)

    this.modal.title.set(this.modal_title)

    this.modal.hidden.on(() => this.endClue("Puzzle Modal hidden"))

    this.modal.show()

    if (this.autostart) this.resetProcess(true)
  }

  protected end() {
    this.resetProcess(false)
    this.modal.remove()
  }
}