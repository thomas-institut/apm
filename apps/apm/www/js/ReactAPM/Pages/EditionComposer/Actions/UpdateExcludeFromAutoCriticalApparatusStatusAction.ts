import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class UpdateExcludeFromAutoCriticalApparatusStatusAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(
    private readonly witnessIndex: number,
    private readonly newStatus: boolean,
  ) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.updateExcludeFromAutoCriticalApparatusStatus(newState.ctData, this.witnessIndex, this.newStatus);
    return newState;
  }

  description(): string {
    return `Update auto critical apparatus status for witness ${this.witnessIndex + 1}`;
  }
}