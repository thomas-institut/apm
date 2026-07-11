import {UndoableAction} from '@/toolbox/ActionHistory';
import {MceDataInterface} from '@/MceData/MceDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {MceData} from '@/MceData/MceData';

export class ChangeTitleAction implements UndoableAction {

  executionTimestamp: number = -1;
  private readonly oldData: MceDataInterface;
  private readonly newData: MceDataInterface;

  constructor(
    mceData: MceDataInterface,
    newTitle: string,
    private onUpdate: (data: MceDataInterface) => void
  ) {
    this.oldData = deepCopy(mceData);
    this.newData = deepCopy(mceData);

    MceData.setTitle(this.newData, newTitle);
  }

  get label() {
    return `Change title to "${this.newData.title}"`;
  }

  execute() {
    this.onUpdate(this.newData);
  }

  undo() {
    this.onUpdate(this.oldData);
  }
}
