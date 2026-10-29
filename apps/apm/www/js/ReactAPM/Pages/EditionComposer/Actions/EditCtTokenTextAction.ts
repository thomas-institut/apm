import {CtData, CtTokenTextEdit} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class EditCtTokenTextAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly edit: CtTokenTextEdit) {
    this.edit = {...edit};
  }

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.editWitnessTokenText(newState.ctData, this.edit);
    return newState;
  }

  description(): string {
    return `Edit edition witness token ${this.edit.tokenIndex + 1}`;
  }
}