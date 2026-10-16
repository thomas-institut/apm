import {CtData} from '@/CtData/CtData';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {CustomApparatusEntryInterface} from '@/CtData/CtDataInterface';

export class UpdateApparatusEntryAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(
    private readonly apparatusType: string,
    private readonly customEntry: CustomApparatusEntryInterface,
    private readonly lemmaText: string,
  ) {}

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.updateCustomApparatuses(newState.ctData, this.apparatusType, deepCopy(this.customEntry));
    return newState;
  }

  description(): string {
    return `Update ${this.apparatusType} apparatus entry '${this.lemmaText}'`;
  }
}
