import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class DeleteCtColumnAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly col: number) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.deleteColumn(newState.ctData, this.col);
    return newState;
  }

  description(): string {
    return `Delete column ${this.col + 1}`;
  }
}