import {CtData} from '@/CtData/CtData';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister';
import {deepCopy} from '@/toolbox/Util';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateTransformAction} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

export class ApplyAutomaticNormalizationsAction implements StateTransformAction<EditionComposerHistoryState> {
  constructor(private readonly normalizers: string[], private readonly normalizerRegister: NormalizerRegister) {
    this.normalizers = [...normalizers];
  }

  async execute(state: EditionComposerHistoryState): Promise<EditionComposerHistoryState> {
    const newState = deepCopy(state);
    newState.ctData = CtData.applyAutomaticNormalizations(newState.ctData, this.normalizerRegister, this.normalizers);
    return newState;
  }

  description(): string {
    return this.normalizers.length === 0 ? 'Turn off automatic normalizations' : 'Apply automatic normalizations';
  }
}