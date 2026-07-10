import {UndoableAction} from '@/toolbox/ActionHistory';
import {MceDataInterface} from '@/MceData/MceDataInterface';
import {deepCopy} from '@/toolbox/Util';

export class DeleteChunkAction implements UndoableAction {

  executionTimestamp: number = -1;
  private readonly oldData: MceDataInterface;
  private readonly newData: MceDataInterface;

  constructor(
    mceData: MceDataInterface,
    chunkIndex: number,
    private onUpdate: (data: MceDataInterface) => void
  ) {
    this.oldData = deepCopy(mceData);
    this.newData = deepCopy(mceData);

    // Perform deletion on newData
    // 1. Remove from chunks
    const deletedChunk = this.newData.chunks.splice(chunkIndex, 1)[0];

    // 2. Update chunkOrder
    if (this.newData.chunkOrder) {
      // Find the position in chunkOrder that points to this chunkIndex
      const orderIndex = this.newData.chunkOrder.indexOf(chunkIndex);
      if (orderIndex !== -1) {
        this.newData.chunkOrder.splice(orderIndex, 1);
      }

      // All indices in chunkOrder that were > chunkIndex must be decremented
      this.newData.chunkOrder = this.newData.chunkOrder.map(idx => idx > chunkIndex ? idx - 1 : idx);
    }
  }

  get label() {
    return `Delete chunk`;
  }

  execute() {
    this.onUpdate(this.newData);
  }

  undo() {
    this.onUpdate(this.oldData);
  }
}
