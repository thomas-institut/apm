import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class AddStandardizedStringAction implements StateTransformAction<MceComposerHistoryState> {

  constructor(
    private readonly original: string,
    private readonly standardized: string
  ) {}

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    MceData.addStandardizedString(newState.mceData, this.original, this.standardized);
    return newState;
  }

  description(): string {
    return `Add standardized string '${this.original}'`;
  }
}
