import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';


export class SetSiglumAction implements StateTransformAction<MceComposerHistoryState> {
  private title: string;

  constructor(
    private readonly witnessIndex: number,
    private readonly newSiglum: string,
  ) {
    this.title = `Set siglum for witness ${witnessIndex + 1} to '${newSiglum}'`;
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {

    if (this.witnessIndex < 0 || this.witnessIndex >= state.mceData.witnesses.length) {
      throw `Witness index ${this.witnessIndex} is out of bounds`;
    }
    if (this.newSiglum.trim() === '') {
      throw `Siglum cannot be empty`;
    }
    const oldSiglum = state.mceData.sigla[this.witnessIndex];

    const newState = deepCopy(state);
    MceData.setSiglum(newState.mceData, this.witnessIndex, this.newSiglum);
    this.title = `Change siglum for ${newState.mceData.witnesses[this.witnessIndex].title} from '${oldSiglum}' to '${this.newSiglum}'`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}