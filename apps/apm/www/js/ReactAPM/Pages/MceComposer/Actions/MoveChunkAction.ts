import {UndoableAction} from '@/toolbox/ActionHistory';
import {MceDataInterface} from '@/MceData/MceDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {MceData} from '@/MceData/MceData';

export class MoveChunkAction implements UndoableAction {

  executionTimestamp: number = -1;
  private readonly oldData: MceDataInterface;
  private readonly newData: MceDataInterface;
  private readonly description: string;

  constructor(
    mceData: MceDataInterface,
    chunkIndex: number,
    direction: 'forwards' | 'backwards',
    private onUpdate: (data: MceDataInterface) => void
  ) {
    this.oldData = deepCopy(mceData);
    this.newData = deepCopy(mceData);

    this.description = `Move chunk ${this.oldData.chunks[chunkIndex].chunkId} at position ${chunkIndex+1} ${direction}`;

    MceData.moveChunk(this.newData, chunkIndex, direction);
  }

  get label() {
    return this.description;
  }

  execute() {
    this.onUpdate(this.newData);
  }

  undo() {
    this.onUpdate(this.oldData);
  }
}
