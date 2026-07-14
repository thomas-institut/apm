import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {HistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class ChangeTitleAction implements StateTransformAction<HistoryState> {

  constructor(private readonly newTitle: string) {
  }

  execute(state: HistoryState): HistoryState {
    const newState = deepCopy(state);
    MceData.setTitle(newState.mceData, this.newTitle);
    return newState;
  }

  description(_state: HistoryState): string {
    return `Change title to "${this.newTitle}"`;
  }
}