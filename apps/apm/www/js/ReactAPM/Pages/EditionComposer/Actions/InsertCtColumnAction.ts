import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class InsertCtColumnAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly afterCol: number) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.insertColumnsAfter(newState.ctData, this.afterCol, 1);
    return newState;
  }

  description(): string {
    return this.afterCol < 0 ? 'Add column before first' : `Add column after ${this.afterCol + 1}`;
  }
}