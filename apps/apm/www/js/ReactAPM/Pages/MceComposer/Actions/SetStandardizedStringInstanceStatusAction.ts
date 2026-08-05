import {MceData} from '@/MceData/MceData';
import {deepCopy} from '@/toolbox/Util';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';

import {StandardizedStringInstanceStatus} from "@/MceData/StandardizedString";

export class SetStandardizedStringInstanceStatusAction implements StateTransformAction<MceComposerHistoryState> {

  constructor(
    private readonly str: string,
    private readonly mainTextIndex: number,
    private readonly status: StandardizedStringInstanceStatus
  ) {}

  async execute(state: MceComposerHistoryState): Promise<MceComposerHistoryState> {
    const newState = deepCopy(state);
    if (this.status === 'accepted') {
      MceData.acceptStandardizedStringInstance(newState.mceData, this.str, this.mainTextIndex);
    } else if (this.status === 'rejected') {
      MceData.rejectStandardizedStringInstance(newState.mceData, this.str, this.mainTextIndex);
    } else {
      MceData.resetStandardizedStringInstance(newState.mceData, this.str, this.mainTextIndex);
    }
    return newState;
  }

  description(): string {
    return `Set status of standardized word '${this.str}' at index ${this.mainTextIndex} to ${this.status}`;
  }
}
