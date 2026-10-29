import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class SetCtColumnGroupAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly col: number, private readonly grouped: boolean) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.setColumnGroupedWithNext(newState.ctData, this.col, this.grouped);
    return newState;
  }

  description(): string {
    return `${this.grouped ? 'Group' : 'Ungroup'} column ${this.col + 1} ${this.grouped ? 'with next' : 'from next'}`;
  }
}