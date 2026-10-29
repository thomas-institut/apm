import {describe, expect, it} from 'vitest';
import {CtDataInterface, WitnessTokenInterface} from '@/CtData/CtDataInterface.js';
import * as WitnessTokenType from '@/Witness/WitnessTokenType.js';
import {fromString} from '@thomas-inst/fmt-text';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer.js';
import {StateHistory} from '@/ReactAPM/ToolBox/StateHistory/StateHistory.js';
import {ShiftCtCellsAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ShiftCtCellsAction.js';
import {SetCtColumnGroupAction} from '@/ReactAPM/Pages/EditionComposer/Actions/SetCtColumnGroupAction.js';
import {InsertCtColumnAction} from '@/ReactAPM/Pages/EditionComposer/Actions/InsertCtColumnAction.js';
import {DeleteCtColumnAction} from '@/ReactAPM/Pages/EditionComposer/Actions/DeleteCtColumnAction.js';
import {CompactCtTableAction} from '@/ReactAPM/Pages/EditionComposer/Actions/CompactCtTableAction.js';
import {EditCtTokenTextAction} from '@/ReactAPM/Pages/EditionComposer/Actions/EditCtTokenTextAction.js';
import {ApplyAutomaticNormalizationsAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ApplyAutomaticNormalizationsAction.js';
import {NormalizerRegister} from '@/pages/common/NormalizerRegister.js';
import {ToLowerCaseNormalizer} from '@/normalizers/TokenNormalizer/ToLowerCaseNormalizer.js';

function createWitnessToken(text: string): WitnessTokenInterface {
  return {
    tokenClass: 'edition',
    tokenType: WitnessTokenType.WORD,
    text,
    fmtText: fromString(text)
  };
}

function createHistoryState(type: CtDataInterface['type'] = 'ctable'): EditionComposerHistoryState {
  return {
    ctData: {
      lang: 'en',
      witnesses: [{
        witnessType: type === 'edition' ? 'edition' : 'fullTx',
        ApmWitnessId: 'full-1',
        tokens: [createWitnessToken('A'), createWitnessToken('B')]
      }],
      editionWitnessIndex: 0,
      witnessTitles: ['Full text'],
      witnessOrder: [0],
      sigla: ['F'],
      siglaGroups: [],
      chunkId: 'chunk-1',
      tableId: 1,
      customApparatuses: [],
      schemaVersion: '1.5',
      type,
      title: 'Test table',
      collationMatrix: [[0, 1, -1]],
      groupedColumns: [],
      automaticNormalizationsApplied: [],
      excludeFromAutoCriticalApparatus: [],
      includeInAutoMarginalFoliation: [],
      archived: false
    }
  };
}

describe('collation table actions', () => {
  it('delegates each action to CtData without mutating the input state', async () => {
    const normalizerRegister = new NormalizerRegister();
    normalizerRegister.registerNormalizer('lower', new ToLowerCaseNormalizer());
    const editionState = createHistoryState('edition');
    const shiftState = createHistoryState();
    shiftState.ctData.collationMatrix[0] = [0, -1, 1];
    const actions = [
      [new ShiftCtCellsAction({witnessIndex: 0, firstCol: 0, lastCol: 0, direction: 'right'}), shiftState],
      [new SetCtColumnGroupAction(0, true), createHistoryState()],
      [new InsertCtColumnAction(-1), createHistoryState()],
      [new DeleteCtColumnAction(2), createHistoryState()],
      [new CompactCtTableAction(), createHistoryState()],
      [new EditCtTokenTextAction({witnessIndex: 0, tokenIndex: 0, newText: 'changed', normalizerRegister}), editionState],
      [new ApplyAutomaticNormalizationsAction(['lower'], normalizerRegister), createHistoryState()]
    ] as const;

    for (const [action, state] of actions) {
      const before = structuredClone(state);
      const result = await action.execute(state);

      expect(state).toEqual(before);
      expect(result).not.toBe(state);
      expect(result.ctData).not.toBe(state.ctData);
      expect(action.description()).toMatch(/\S/);
    }
  });

  it('produces the expected state for each operation', async () => {
    const normalizerRegister = new NormalizerRegister();
    normalizerRegister.registerNormalizer('lower', new ToLowerCaseNormalizer());

    const shiftState = createHistoryState();
    shiftState.ctData.collationMatrix[0] = [0, -1, 1];
    const shifted = await new ShiftCtCellsAction({
      witnessIndex: 0, firstCol: 0, lastCol: 0, direction: 'right'
    }).execute(shiftState);
    expect(shifted.ctData.collationMatrix[0]).toEqual([-1, 0, 1]);

    const grouped = await new SetCtColumnGroupAction(0, true).execute(createHistoryState());
    expect(grouped.ctData.groupedColumns).toEqual([0]);

    const inserted = await new InsertCtColumnAction(-1).execute(createHistoryState());
    expect(inserted.ctData.collationMatrix[0]).toEqual([-1, 0, 1, -1]);

    const deleted = await new DeleteCtColumnAction(2).execute(createHistoryState());
    expect(deleted.ctData.collationMatrix[0]).toEqual([0, 1]);

    const compactedState = createHistoryState();
    compactedState.ctData.collationMatrix[0] = [-1, 0, -1];
    const compacted = await new CompactCtTableAction().execute(compactedState);
    expect(compacted.ctData.collationMatrix[0]).toEqual([0]);

    const editedState = createHistoryState('edition');
    const edited = await new EditCtTokenTextAction({
      witnessIndex: 0, tokenIndex: 0, newText: 'Changed', normalizerRegister
    }).execute(editedState);
    expect(edited.ctData.witnesses[0].tokens[0].text).toBe('Changed');

    const normalized = await new ApplyAutomaticNormalizationsAction(['lower'], normalizerRegister)
      .execute(createHistoryState());
    expect(normalized.ctData.automaticNormalizationsApplied).toEqual(['lower']);
  });

  it('stores edits in StateHistory and restores them through undo and redo', async () => {
    const initialState = createHistoryState();
    const history = new StateHistory(initialState);

    const updatedState = await history.do(new InsertCtColumnAction(-1));
    expect(updatedState.ctData.collationMatrix[0]).toHaveLength(4);
    expect(history.undo().ctData.collationMatrix[0]).toEqual([0, 1, -1]);
    expect(history.redo().ctData.collationMatrix[0]).toEqual([-1, 0, 1, -1]);
    expect(history.getHistory()).toHaveLength(2);
  });

  it('has clear descriptions for the operations', () => {
    expect(new ShiftCtCellsAction({witnessIndex: 0, firstCol: 1, lastCol: 1, direction: 'left'}).description()).toBe('Shift cell left');
    expect(new SetCtColumnGroupAction(11, true).description()).toBe('Group column 12 with next');
    expect(new InsertCtColumnAction(-1).description()).toBe('Add column before first');
    expect(new DeleteCtColumnAction(0).description()).toBe('Delete column 1');
    expect(new CompactCtTableAction().description()).toBe('Compact collation table');
    expect(new ApplyAutomaticNormalizationsAction([], new NormalizerRegister()).description()).toBe('Turn off automatic normalizations');
  });
});