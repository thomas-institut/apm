import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class DeleteStandardizedStringAction implements StateTransformAction<MceComposerHistoryState> {

  constructor(
    private readonly original: string
  ) {}

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    MceData.deleteStandardizedString(newState.mceData, this.original);
    return newState;
  }

  description(): string {
    return `Delete standardized string '${this.original}'`;
  }
}
