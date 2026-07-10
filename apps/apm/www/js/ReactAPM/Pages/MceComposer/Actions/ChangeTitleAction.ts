import {UndoableAction} from '@/toolbox/ActionHistory';

export class ChangeTitleAction implements UndoableAction {

  executionTimestamp: number = -1;

  constructor(
    private oldTitle: string,
    private newTitle: string,
    private onUpdate: (title: string) => void
  ) {
  }

  get label() {
    return `Change title to "${this.newTitle}"`;
  }

  execute() {
    this.onUpdate(this.newTitle);
  }

  undo() {
    this.onUpdate(this.oldTitle);
  }
}
