import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class CompactCtTableAction implements StateTransformAction<EditionComposerHistoryState> {
  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.compactTable(newState.ctData);
    return newState;
  }

  description(): string {
    return 'Compact collation table';
  }
}