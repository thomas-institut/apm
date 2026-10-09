import {CtData} from '@/CtData/CtData';
import {SiglaGroupInterface} from '@/CtData/CtDataInterface';
import {SiglaGroupUtil} from '@/CtData/SiglaGroupUtil';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class ChangeSiglaGroupAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(
    private readonly siglaGroupIndex: number,
    private readonly newGroup: SiglaGroupInterface,
  ) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    if (this.siglaGroupIndex === -1) {
      newState.ctData = CtData.addSiglaGroup(newState.ctData, this.newGroup);
    } else {
      newState.ctData = CtData.updateSiglaGroup(newState.ctData, this.siglaGroupIndex, this.newGroup);
    }
    return newState;
  }

  description(state: EditionComposerHistoryState): string {
    const groupDescription = SiglaGroupUtil.getSiglaGroupString(this.newGroup, state.ctData.sigla);
    return this.siglaGroupIndex === -1 ? `Add sigla group ${groupDescription}` : `Update sigla group ${groupDescription}`;
  }
}