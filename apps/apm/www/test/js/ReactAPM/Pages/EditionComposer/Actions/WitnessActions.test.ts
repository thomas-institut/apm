import {describe, expect, it} from 'vitest';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {ChangeSiglaGroupAction} from '@/ReactAPM/Pages/EditionComposer/Actions/ChangeSiglaGroupAction';
import {DeleteSiglaGroupAction} from '@/ReactAPM/Pages/EditionComposer/Actions/DeleteSiglaGroupAction';
import {UpdateExcludeFromAutoCriticalApparatusStatusAction} from '@/ReactAPM/Pages/EditionComposer/Actions/UpdateExcludeFromAutoCriticalApparatusStatusAction';
import {UpdateIncludeInAutoMarginalFoliationStatusAction} from '@/ReactAPM/Pages/EditionComposer/Actions/UpdateIncludeInAutoMarginalFoliationStatusAction';
import {UpdateSiglumAction} from '@/ReactAPM/Pages/EditionComposer/Actions/UpdateSiglumAction';
import {UpdateWitnessOrderAction} from '@/ReactAPM/Pages/EditionComposer/Actions/UpdateWitnessOrderAction';
import {EditionComposerHistoryState} from '@/ReactAPM/Pages/EditionComposer/EditionComposer';

const makeState = (): EditionComposerHistoryState => ({
  ctData: {
    witnesses: [{}, {}, {}],
    sigla: ['A', 'B', 'C'],
    witnessOrder: [0, 1, 2],
    witnessTitles: ['Witness A', 'Witness B', 'Witness C'],
    excludeFromAutoCriticalApparatus: [],
    includeInAutoMarginalFoliation: [],
    siglaGroups: [{siglum: 'G1', witnesses: [0, 1]}],
    type: 'edition',
  } as unknown as CtDataInterface
});

describe('EditionComposer witness actions', () => {
  it('updates witness order on a copied CtData state', async () => {
    const state = makeState();
    const newState = await new UpdateWitnessOrderAction([2, 0, 1]).execute(state);

    expect(newState.ctData.witnessOrder).toEqual([2, 0, 1]);
    expect(state.ctData.witnessOrder).toEqual([0, 1, 2]);
  });

  it('updates sigla and both automatic apparatus statuses through CtData', async () => {
    const state = makeState();
    const siglumState = await new UpdateSiglumAction(0, 'X').execute(state);
    const excludeState = await new UpdateExcludeFromAutoCriticalApparatusStatusAction(1, true).execute(state);
    const marginalState = await new UpdateIncludeInAutoMarginalFoliationStatusAction(2, true).execute(state);

    expect(siglumState.ctData.sigla[0]).toBe('X');
    expect(excludeState.ctData.excludeFromAutoCriticalApparatus).toEqual([1]);
    expect(marginalState.ctData.includeInAutoMarginalFoliation).toEqual([2]);
    expect(state.ctData.sigla).toEqual(['A', 'B', 'C']);
    expect(state.ctData.excludeFromAutoCriticalApparatus).toEqual([]);
    expect(state.ctData.includeInAutoMarginalFoliation).toEqual([]);
  });

  it('adds, edits and deletes sigla groups through CtData', async () => {
    const state = makeState();
    const addedState = await new ChangeSiglaGroupAction(-1, {siglum: 'G2', witnesses: [1, 2]}).execute(state);
    const editedState = await new ChangeSiglaGroupAction(0, {siglum: 'G3', witnesses: [0, 2]}).execute(state);
    const deletedState = await new DeleteSiglaGroupAction(0).execute(state);

    expect(addedState.ctData.siglaGroups).toEqual([
      {siglum: 'G1', witnesses: [0, 1]},
      {siglum: 'G2', witnesses: [1, 2]}
    ]);
    expect(editedState.ctData.siglaGroups).toEqual([{siglum: 'G3', witnesses: [0, 2]}]);
    expect(deletedState.ctData.siglaGroups).toEqual([]);
    expect(state.ctData.siglaGroups).toEqual([{siglum: 'G1', witnesses: [0, 1]}]);
  });
});