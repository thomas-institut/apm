import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {SiglaGroupInterface} from '@/CtData/CtDataInterface';
import {SiglaGroupUtil} from '@/CtData/SiglaGroupUtil';

export class ChangeSiglaGroupAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;

  constructor(
    private readonly siglaGroupIndex: number,
    private readonly newGroup: SiglaGroupInterface,
  ) {
    this.title = 'Change sigla group';
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);

    if (this.siglaGroupIndex === -1) {
      MceData.addSiglaGroup(newState.mceData, this.newGroup);
      this.title = `Add sigla group ${SiglaGroupUtil.getSiglaGroupString(this.newGroup, state.mceData.sigla)}`;
      return newState;
    }

    const oldGroup = state.mceData.siglaGroups[this.siglaGroupIndex];
    MceData.updateSiglaGroup(newState.mceData, this.siglaGroupIndex, this.newGroup);

    this.title = `Change sigla group ${SiglaGroupUtil.getSiglaGroupString(oldGroup, state.mceData.sigla)} to ${SiglaGroupUtil.getSiglaGroupString(this.newGroup, state.mceData.sigla)}`;
    return newState;
  }

  description(_state: MceComposerHistoryState): string {
    return this.title;
  }
}