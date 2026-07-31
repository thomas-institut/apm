import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

export class ChangeTitleAction implements StateTransformAction<MceComposerHistoryState> {

  constructor(private readonly newTitle: string) {
  }

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    MceData.setTitle(newState.mceData, this.newTitle);
    return newState;
  }

  description(_state: MceComposerHistoryState): string {
    return `Change title to "${this.newTitle}"`;
  }
}