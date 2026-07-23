import {describe, expect, it} from 'vitest';
import {MceData} from '@/MceData/MceData';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {ChangeSiglaGroupAction} from '@/ReactAPM/Pages/MceComposer/Actions/ChangeSiglaGroupAction';
import {DeleteSiglaGroupAction} from '@/ReactAPM/Pages/MceComposer/Actions/DeleteSiglaGroupAction';

const buildState = (): MceComposerHistoryState => ({
  mceData: {
    ...MceData.createEmpty(),
    witnesses: [{witnessId: 'w0'} as any, {witnessId: 'w1'} as any, {witnessId: 'w2'} as any],
    sigla: ['A', 'B', 'C'],
    siglaGroups: [
      {siglum: 'G1', witnesses: [0, 1]},
      {siglum: 'G2', witnesses: [1, 2]},
    ],
  },
  ctDataStatusArray: [],
});

describe('Sigla group actions', () => {
  it('changes an existing sigla group', async () => {
    const state = buildState();
    const action = new ChangeSiglaGroupAction(0, {siglum: 'G3', witnesses: [0, 2]});

    const newState = await action.execute(state);

    expect(newState.mceData.siglaGroups).toEqual([
      {siglum: 'G3', witnesses: [0, 2]},
      {siglum: 'G2', witnesses: [1, 2]},
    ]);
    expect(state.mceData.siglaGroups).toEqual([
      {siglum: 'G1', witnesses: [0, 1]},
      {siglum: 'G2', witnesses: [1, 2]},
    ]);
    expect(action.description(state)).toBe('Change sigla group G1 => AB to G3 => AC');
  });

  it('adds a sigla group when index is -1', async () => {
    const state = buildState();
    const action = new ChangeSiglaGroupAction(-1, {siglum: 'G3', witnesses: [0, 2]});

    const newState = await action.execute(state);

    expect(newState.mceData.siglaGroups).toEqual([
      {siglum: 'G1', witnesses: [0, 1]},
      {siglum: 'G2', witnesses: [1, 2]},
      {siglum: 'G3', witnesses: [0, 2]},
    ]);
    expect(action.description(state)).toBe('Add sigla group G3 => AC');
  });

  it('deletes a sigla group', async () => {
    const state = buildState();
    const action = new DeleteSiglaGroupAction(0);

    const newState = await action.execute(state);

    expect(newState.mceData.siglaGroups).toEqual([{siglum: 'G2', witnesses: [1, 2]}]);
    expect(state.mceData.siglaGroups).toEqual([
      {siglum: 'G1', witnesses: [0, 1]},
      {siglum: 'G2', witnesses: [1, 2]},
    ]);
    expect(action.description(state)).toBe('Delete sigla group G1 => AB');
  });

  it('throws when deleting a non-existing sigla group', async () => {
    const state = buildState();
    const action = new DeleteSiglaGroupAction(5);

    await expect(action.execute(state)).rejects.toBe('Sigla group at index 5 does not exist');
  });
});