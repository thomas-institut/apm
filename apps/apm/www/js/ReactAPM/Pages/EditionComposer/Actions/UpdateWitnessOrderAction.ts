import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class UpdateWitnessOrderAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly newWitnessOrder: number[]) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.updateWitnessOrder(newState.ctData, [...this.newWitnessOrder]);
    return newState;
  }

  description(): string {
    return 'Update witness order';
  }
}