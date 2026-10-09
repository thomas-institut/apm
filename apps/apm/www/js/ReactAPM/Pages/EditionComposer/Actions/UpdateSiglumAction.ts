import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class UpdateSiglumAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(
    private readonly witnessIndex: number,
    private readonly newSiglum: string,
  ) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.updateSiglum(newState.ctData, this.witnessIndex, this.newSiglum);
    return newState;
  }

  description(): string {
    return `Update siglum for witness ${this.witnessIndex + 1}`;
  }
}