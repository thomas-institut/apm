import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {SiglaGroupUtil} from '@/CtData/SiglaGroupUtil';
import {ValidationError} from "@/lib/Error/SystemError";

export class DeleteSiglaGroupAction implements StateTransformAction<MceComposerHistoryState> {

  private title: string;

  constructor(private readonly siglaGroupIndex: number) {
    this.title = 'Delete sigla group';
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const group = state.mceData.siglaGroups[this.siglaGroupIndex];
    if (!group) {
      throw new ValidationError(`Sigla group at index ${this.siglaGroupIndex} does not exist`);
    }

    const newState = deepCopy(state);
    MceData.deleteSiglaGroup(newState.mceData, this.siglaGroupIndex);
    this.title = `Delete sigla group ${SiglaGroupUtil.getSiglaGroupString(group, state.mceData.sigla)}`;
    return newState;
  }

  description(_state: MceComposerHistoryState): string {
    return this.title;
  }
}