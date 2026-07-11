import {UndoableAction} from '@/toolbox/ActionHistory';
import {MceDataInterface} from '@/MceData/MceDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {MceData} from '@/MceData/MceData';

export class SetChunkBreakAction implements UndoableAction {

  executionTimestamp: number = -1;
  private readonly oldData: MceDataInterface;
  private readonly newData: MceDataInterface;
  private readonly description: string;

  constructor(
    mceData: MceDataInterface,
    chunkIndex: number,
    newBreak: string,
    private onUpdate: (data: MceDataInterface) => void
  ) {
    this.oldData = deepCopy(mceData);
    this.newData = deepCopy(mceData);
    this.description = `Set chunk ${chunkIndex} break to '${newBreak}'`;

    MceData.setChunkBreak(this.newData, chunkIndex, newBreak);
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
