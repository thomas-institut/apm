import {UndoableAction} from '@/toolbox/ActionHistory';

export class MoveChunkAction implements UndoableAction {

  executionTimestamp: number = -1;

  constructor(
    private oldChunkOrder: number[],
    private newChunkOrder: number[],
    private onUpdate: (chunkOrder: number[]) => void
  ) {
  }

  get label() {
    return `Move chunk`;
  }

  execute() {
    this.onUpdate(this.newChunkOrder);
  }

  undo() {
    this.onUpdate(this.oldChunkOrder);
  }
}
