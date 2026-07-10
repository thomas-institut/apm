import {UndoableAction} from '@/toolbox/ActionHistory';

export class SetChunkBreakAction implements UndoableAction {

  executionTimestamp: number = -1;
  constructor(
    private chunkIndex: number,
    private oldBreak: string,
    private newBreak: string,
    private onUpdate: (chunkIndex: number, breakAfter: string) => void
  ) {}

  execute() {
    this.onUpdate(this.chunkIndex, this.newBreak);
  }

  undo() {
    this.onUpdate(this.chunkIndex, this.oldBreak);
  }

  get label() {
    return `Set break after chunk to "${this.newBreak}"`;
  }
}
