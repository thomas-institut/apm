import {describe, expect, it} from 'vitest';
import {fromString} from '@thomas-inst/fmt-text';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface';
import * as WitnessTokenType from '@/Witness/WitnessTokenType';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {StateHistory} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {EditMainTextAction} from '@/ReactAPM/Pages/EditionComposer/Actions/EditMainTextAction';
import {MainTextEditChange} from '@/Edition/MainTextEditChanges';

function token(text: string): WitnessTokenInterface {
  return {tokenClass: 'edition', tokenType: WitnessTokenType.WORD, text, fmtText: fromString(text)};
}

function historyState(): EditionComposerHistoryState {
  return {
    ctData: {
      lang: 'la', witnesses: [{ApmWitnessId: 'edition-1', witnessType: 'edition', tokens: [token('old')]}],
      editionWitnessIndex: 0, witnessTitles: ['Edition'], witnessOrder: [0], sigla: ['E'], siglaGroups: [],
      chunkId: 'chunk-1', tableId: 1, customApparatuses: [], schemaVersion: '1.5', type: 'edition',
      title: 'Test edition', collationMatrix: [[0]], groupedColumns: [], automaticNormalizationsApplied: [],
      excludeFromAutoCriticalApparatus: [], includeInAutoMarginalFoliation: [], archived: false
    } as CtDataInterface
  };
}

describe('EditMainTextAction', () => {
  it('applies all text changes as one undoable history update', async () => {
    const state = historyState();
    const baseTokens = structuredClone(state.ctData.witnesses[0].tokens!);
    const changes: MainTextEditChange[] = [
      {change: 'replace', index: 0, currentToken: baseTokens[0], index2: 0, newToken: token('new')}
    ];
    const history = new StateHistory(state);

    const updatedState = await history.do(new EditMainTextAction(changes, baseTokens));

    expect(updatedState.ctData.witnesses[0].tokens?.[0].text).toBe('new');
    expect(history.getHistory()).toHaveLength(2);
    expect(history.undo().ctData.witnesses[0].tokens?.[0].text).toBe('old');
    expect(history.redo().ctData.witnesses[0].tokens?.[0].text).toBe('new');
  });

  it('rejects changes when the edition witness no longer matches the diff base', async () => {
    const state = historyState();
    const baseTokens = [token('stale')];
    const changes: MainTextEditChange[] = [
      {change: 'replace', index: 0, currentToken: baseTokens[0], index2: 0, newToken: token('new')}
    ];

    await expect(new EditMainTextAction(changes, baseTokens).execute(state)).rejects.toThrow(/changed while/);
  });
});