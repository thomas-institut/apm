import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {getSiglaGroupString} from '@/ReactAPM/Pages/MceComposer/SiglaGroupUtil';

export class DeleteSiglaGroupAction implements StateTransformAction<HistoryState> {

  private title: string;

  constructor(private readonly siglaGroupIndex: number) {
    this.title = 'Delete sigla group';
  }

  execute(state: HistoryState): HistoryState {
    const group = state.mceData.siglaGroups[this.siglaGroupIndex];
    if (!group) {
      throw `Sigla group at index ${this.siglaGroupIndex} does not exist`;
    }

    const newState = deepCopy(state);
    MceData.deleteSiglaGroup(newState.mceData, this.siglaGroupIndex);
    this.title = `Delete sigla group ${getSiglaGroupString(group, state.mceData.sigla)}`;
    return newState;
  }

  description(_state: HistoryState): string {
    return this.title;
  }
}