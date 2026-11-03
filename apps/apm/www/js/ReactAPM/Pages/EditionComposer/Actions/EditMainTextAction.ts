import {WitnessTokenInterface} from '@/CtData/CtDataInterface';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {OperationalError} from '@/lib/Error/SystemError';
import {
  applyMainTextChangesToCtData,
  MainTextEditChange
} from '@/Edition/MainTextEditChanges';

export class EditMainTextAction implements StateTransformAction<EditionComposerHistoryState> {

  constructor(
    private readonly changes: MainTextEditChange[],
    private readonly baseTokens: WitnessTokenInterface[]
  ) {
  }

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const ctData = state.ctData;
    const currentTokens = ctData.witnesses[ctData.editionWitnessIndex]?.tokens;
    if (ctData.type !== 'edition' || currentTokens === undefined ||
      JSON.stringify(currentTokens) !== JSON.stringify(this.baseTokens)) {
      throw new OperationalError('The edition witness changed while the main text was being edited');
    }

    const newState = deepCopy(state);
    newState.ctData = applyMainTextChangesToCtData(newState.ctData, this.changes);
    return newState;
  }

  description(): string {
    return `Edit main text (${this.changes.length} changes)`;
  }
}