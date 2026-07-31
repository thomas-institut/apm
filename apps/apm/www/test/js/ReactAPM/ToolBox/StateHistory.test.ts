import { describe, expect, it, vi } from 'vitest';
import { StateHistory, StateTransformAction } from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

type TestState = { value: string };


const actionTo = (nextState: TestState, description = `to ${nextState.value}`): StateTransformAction<TestState> => ({
  // @ts-ignore
  execute: () => nextState,
  description: () => description,
});

const buildHistoryWithRepeatedStates = async (): Promise<StateHistory<TestState>> => {
  const history = new StateHistory<TestState>({ value: 'a' });
  await history.do(actionTo({ value: 'x' }, 'a->x'));
  await history.do(actionTo({ value: 'b' }, 'x->b'));
  await history.do(actionTo({ value: 'a' }, 'b->a'));
  await history.do(actionTo({ value: 'c' }, 'a->c'));
  await history.do(actionTo({ value: 'd' }, 'c->d'));
  await history.do(actionTo({ value: 'x' }, 'd->x'));
  await history.do(actionTo({ value: 'e' }, 'x->e'));
  return history;
};

const buildHistoryWithRepeatedTargetBeforeNextSource = async (): Promise<StateHistory<TestState>> => {
  const history = new StateHistory<TestState>({ value: 'd' });
  await history.do(actionTo({ value: 'p' }, 'd->p'));
  await history.do(actionTo({ value: 'q' }, 'p->q'));
  await history.do(actionTo({ value: 'r' }, 'q->r'));
  await history.do(actionTo({ value: 'b' }, 'r->b'));
  await history.do(actionTo({ value: 'd' }, 'b->d'));
  await history.do(actionTo({ value: 'z' }, 'd->z'));
  await history.do(actionTo({ value: 'b' }, 'z->b'));
  return history;
};

describe('StateHistory', () => {
  it('should initialize with one history item and current state', () => {
    const initialState = { value: 'initial' };
    const history = new StateHistory(initialState);

    expect(history.getCurrentState()).toEqual(initialState);
    expect(history.getHistory()).toHaveLength(1);
    expect(history.getHistory()[0]).toEqual({
      state: initialState,
      actionDescription: 'Initial State',
      signature: expect.any(String),
      executionTimestamp: expect.any(Number),
    });
  });

  it('should append a new state and action description when do changes the state', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    const execute = vi.fn().mockResolvedValue({ value: 'b' });
    const description = vi.fn().mockReturnValue('a->b');

    const newState = await history.do({ execute, description });

    expect(newState).toEqual({ value: 'b' });
    expect(history.getCurrentState()).toEqual({ value: 'b' });
    expect(history.getHistory()).toHaveLength(2);
    expect(history.getHistory()[1].actionDescription).toBe('a->b');
    expect(execute).toHaveBeenCalledWith({ value: 'a' });
    expect(description).toHaveBeenCalledWith({ value: 'a' });
  });

  it('should not append history when do does not change state signature', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const newState = await history.do(actionTo({ value: 'a' }, 'no-op'));

    expect(newState).toEqual({ value: 'a' });
    expect(history.getCurrentState()).toEqual({ value: 'a' });
    expect(history.getHistory()).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalledWith("Action did not change the state: 'no-op'");

    consoleSpy.mockRestore();
  });

  it('should throw and keep history intact when action execute fails', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    await history.do(actionTo({ value: 'b' }, 'a->b'));

    const executeError = new Error('execute failed');
    const execute = vi.fn().mockImplementation(async () => {
      throw executeError;
    });
    const description = vi.fn().mockReturnValue('should not be used');

    await expect(history.do({ execute, description })).rejects.toThrow(executeError);
    expect(history.getCurrentState()).toEqual({ value: 'b' });
    expect(history.getHistory()).toHaveLength(2);
    expect(history.getHistory().map(item => item.state.value)).toEqual(['a', 'b']);
    expect(description).not.toHaveBeenCalled();
  });

  it('should undo and redo, and throw when boundaries are exceeded', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    await history.do(actionTo({ value: 'b' }, 'a->b'));
    await history.do(actionTo({ value: 'c' }, 'b->c'));

    expect(history.undo()).toEqual({ value: 'b' });
    expect(history.undo()).toEqual({ value: 'a' });
    expect(() => history.undo()).toThrow('Cannot undo further');

    expect(history.redo()).toEqual({ value: 'b' });
    expect(history.redo()).toEqual({ value: 'c' });
    expect(() => history.redo()).toThrow('Cannot redo further');
  });

  it('should detect an effective redo when do reaches the next state', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    await history.do(actionTo({ value: 'b' }, 'a->b'));
    await history.do(actionTo({ value: 'c' }, 'b->c'));
    history.undo();

    const newState = await history.do(actionTo({ value: 'c' }, 'b->c again'));

    expect(newState).toEqual({ value: 'c' });
    expect(history.getCurrentState()).toEqual({ value: 'c' });
    expect(history.getCurrentStateIndex()).toBe(2);
    expect(history.getHistory()).toHaveLength(3);
    expect(history.getHistory().map(item => item.state.value)).toEqual(['a', 'b', 'c']);
    expect(history.getHistory()[2].actionDescription).toBe('b->c');
  });

  it('should detect an effective undo when do reaches the previous state', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    await history.do(actionTo({ value: 'b' }, 'a->b'));
    await history.do(actionTo({ value: 'c' }, 'b->c'));

    const newState = await history.do(actionTo({ value: 'b' }, 'c->b again'));

    expect(newState).toEqual({ value: 'b' });
    expect(history.getCurrentState()).toEqual({ value: 'b' });
    expect(history.getCurrentStateIndex()).toBe(1);
    expect(history.getHistory()).toHaveLength(3);
    expect(history.getHistory().map(item => item.state.value)).toEqual(['a', 'b', 'c']);
    expect(history.getHistory()[1].actionDescription).toBe('a->b');
  });

  it('should erase future history and append at the end for a divergent do action', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    await history.do(actionTo({ value: 'b' }, 'a->b'));
    await history.do(actionTo({ value: 'c' }, 'b->c'));
    history.undo();

    const newState = await history.do(actionTo({ value: 'd' }, 'b->d'));

    expect(newState).toEqual({ value: 'd' });
    expect(history.getCurrentState()).toEqual({ value: 'd' });
    expect(history.getCurrentStateIndex()).toBe(2);
    expect(history.getHistory()).toHaveLength(3);
    expect(history.getHistory().map(item => item.state.value)).toEqual(['a', 'b', 'd']);
    expect(history.getHistory()[2].actionDescription).toBe('b->d');
  });

  it('should go to a valid state index and throw for invalid indices', async () => {
    const history = new StateHistory<TestState>({ value: 'a' });
    await history.do(actionTo({ value: 'b' }, 'a->b'));
    await history.do(actionTo({ value: 'c' }, 'b->c'));

    expect(history.goToState(1)).toEqual({ value: 'b' });
    expect(history.getCurrentState()).toEqual({ value: 'b' });

    expect(() => history.goToState(-1)).toThrow('Invalid state index');
    expect(() => history.goToState(99)).toThrow('Invalid state index');
  });

  it('should return expected minimal history for defaults and single-candidate path', async () => {
    const history = await buildHistoryWithRepeatedStates();

    expect(history.getMinimalHistory().map(item => item.state.value)).toEqual(['a', 'c', 'd', 'x', 'e']);
    expect(history.getMinimalHistory({ value: 'c' }, { value: 'd' }).map(item => item.state.value)).toEqual(['c', 'd']);
  });

  it('should return one state when from and to signatures are the same', async () => {
    const history = await buildHistoryWithRepeatedStates();
    const xSignature = history.getHistory().find(item => item.state.value === 'x')!.signature;
    const firstMatchingState = history.getHistory().find(item => item.signature === xSignature)!;

    const minimal = history.getMinimalHistory(xSignature, xSignature);

    expect(minimal).toHaveLength(1);
    expect(minimal[0].state.value).toBe('x');
    expect(minimal[0]).toBe(firstMatchingState);
  });

  it('should choose the shortest path when several minimal histories exist', async () => {
    const history = await buildHistoryWithRepeatedStates();

    expect(history.getMinimalHistory({ value: 'a' }, { value: 'x' }).map(item => item.state.value)).toEqual(['a', 'x']);
  });

  it('should return a minimal path that starts at source when target signature repeats', async () => {
    const history = await buildHistoryWithRepeatedTargetBeforeNextSource();

    expect(history.getMinimalHistory({ value: 'd' }, { value: 'b' }).map(item => item.state.value)).toEqual(['d', 'z', 'b']);
  });

  it('should return empty array and warn when from or to state is not found', async () => {
    const history = await buildHistoryWithRepeatedStates();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(history.getMinimalHistory('missing-from', { value: 'x' })).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('fromState not found', 'missing-from');

    expect(history.getMinimalHistory({ value: 'a' }, 'missing-to')).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('toState not found', 'missing-to');

    consoleSpy.mockRestore();
  });
});
