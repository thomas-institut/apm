import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';


export class SetIncludeInAutoMarginalFoliationAction implements StateTransformAction<HistoryState> {
  private title: string;

  constructor(
    private readonly witnessIndex: number,
    private readonly newIncludeState: boolean,
  ) {
    this.title = `${newIncludeState ? 'Include' : 'Exclude'} witness ${this.witnessIndex + 1} ${newIncludeState ? 'in' : 'from'} auto marginal foliation`;
  }

  execute(state: HistoryState): HistoryState {

    if (this.witnessIndex < 0 || this.witnessIndex >= state.mceData.witnesses.length) {
      throw `Witness index ${this.witnessIndex} is out of bounds`;
    }

    const newState = deepCopy(state);
    MceData.setAutoMarginalFoliation(newState.mceData, this.witnessIndex, this.newIncludeState);
    this.title = `${this.newIncludeState ? 'Include' : 'Exclude'} ${newState.mceData.witnesses[this.witnessIndex].title} ${this.newIncludeState ? 'in' : 'from'} auto marginal foliation`;
    return newState;
  }

  description(): string {
    return this.title;
  }
}