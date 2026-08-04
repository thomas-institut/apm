import {describe, expect, it} from 'vitest';
import {MceData} from '@/MceData/MceData';
import {MceComposerHistoryState} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {SetStandardizedStringInstanceStatusAction} from '@/ReactAPM/Pages/MceComposer/Actions/SetStandardizedStringInstanceStatusAction';

const buildState = (): MceComposerHistoryState => ({
  mceData: {
    ...MceData.createEmpty(),
    standardizedStrings: [
      {
        original: 'Word',
        standardized: 'Wrd',
        instances: []
      }
    ]
  },
});

describe('Standardized string actions', () => {
  it('sets status to accepted', async () => {
    const state = buildState();
    const action = new SetStandardizedStringInstanceStatusAction('Word', 10, 'accepted');

    const newState = await action.execute(state);

    expect(newState.mceData.standardizedStrings[0].instances).toEqual([
      {mainTextIndex: 10, status: 'accepted'}
    ]);
    expect(state.mceData.standardizedStrings[0].instances).toEqual([]);
    expect(action.description()).toBe("Set status of standardized word 'Word' at index 10 to accepted");
  });

  it('sets status to rejected', async () => {
    const state = buildState();
    const action = new SetStandardizedStringInstanceStatusAction('Word', 10, 'rejected');

    const newState = await action.execute(state);

    expect(newState.mceData.standardizedStrings[0].instances).toEqual([
      {mainTextIndex: 10, status: 'rejected'}
    ]);
  });

  it('resets status (removes instance)', async () => {
    const state = buildState();
    state.mceData.standardizedStrings[0].instances = [{mainTextIndex: 10, status: 'accepted'}];
    const action = new SetStandardizedStringInstanceStatusAction('Word', 10, 'notReviewed');

    const newState = await action.execute(state);

    expect(newState.mceData.standardizedStrings[0].instances).toEqual([]);
  });
});
