import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class AcceptStandardizedStringAllAction implements StateTransformAction<MceComposerHistoryState> {

  constructor(
    private readonly str: string,
    private readonly mainTextIndices: number[]
  ) {}

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    MceData.acceptStandardizedStringInstanceAll(newState.mceData, this.str, this.mainTextIndices);
    return newState;
  }

  description(): string {
    return `Accept standardized string '${this.str}'`;
  }
}