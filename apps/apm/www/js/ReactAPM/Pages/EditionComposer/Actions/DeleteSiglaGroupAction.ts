import {CtData} from '@/CtData/CtData';
import {SiglaGroupUtil} from '@/CtData/SiglaGroupUtil';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {ValidationError} from '@/lib/Error/SystemError';

export class DeleteSiglaGroupAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly siglaGroupIndex: number) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const group = state.ctData.siglaGroups[this.siglaGroupIndex];
    if (group === undefined) {
      throw new ValidationError(`Sigla group at index ${this.siglaGroupIndex} does not exist`);
    }
    const newState = deepCopy(state);
    newState.ctData = CtData.deleteSiglaGroup(newState.ctData, this.siglaGroupIndex);
    return newState;
  }

  description(state: EditionComposerHistoryState): string {
    const group = state.ctData.siglaGroups[this.siglaGroupIndex];
    return group === undefined ? 'Delete sigla group' : `Delete sigla group ${SiglaGroupUtil.getSiglaGroupString(group, state.ctData.sigla)}`;
  }
}