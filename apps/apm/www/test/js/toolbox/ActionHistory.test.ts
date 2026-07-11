import { describe, expect, it } from 'vitest';
import {ActionHistory, actionSuccess, UndoableAction} from '@/toolbox/ActionHistory';

class MockAction implements UndoableAction {
  executedCount = 0;
  undoneCount = 0;
  executionTimestamp = -1;
  constructor(public label: string) {}
  execute() { this.executedCount++; return actionSuccess(); }
  undo() { this.undoneCount++; return actionSuccess(); }
}

describe('ActionHistory', () => {
  it('should execute and undo an action', () => {
    const history = new ActionHistory();
    const action = new MockAction('Action 1');

    history.execute(action);
    expect(action.executedCount).toBe(1);
    expect(history.getUndoStack().length).toBe(1);
    expect(history.isDirty()).toBe(true);

    history.undo();
    expect(action.undoneCount).toBe(1);
    expect(history.getUndoStack().length).toBe(0);
    expect(history.getRedoStack().length).toBe(1);
  });

  it('should redo an action', () => {
    const history = new ActionHistory();
    const action = new MockAction('Action 1');

    history.execute(action);
    history.undo();
    history.redo();

    expect(action.executedCount).toBe(2);
    expect(history.getUndoStack().length).toBe(1);
    expect(history.getRedoStack().length).toBe(0);
  });

  it('should clear redo stack on new execute', () => {
    const history = new ActionHistory();
    const action1 = new MockAction('Action 1');
    const action2 = new MockAction('Action 2');

    history.execute(action1);
    history.undo();
    expect(history.getRedoStack().length).toBe(1);

    history.execute(action2);
    expect(history.getRedoStack().length).toBe(0);
    expect(history.getUndoStack().length).toBe(1);
    expect(history.getUndoStack()[0]).toBe(action2);
  });

  it('should handle goTo correctly', () => {
    const history = new ActionHistory();
    const a1 = new MockAction('A1');
    const a2 = new MockAction('A2');
    const a3 = new MockAction('A3');

    history.execute(a1);
    history.execute(a2);
    history.execute(a3);

    expect(history.getUndoStack().length).toBe(3);

    history.goTo(0); // Should keep only a1
    expect(history.getUndoStack().length).toBe(1);
    expect(a3.undoneCount).toBe(1);
    expect(a2.undoneCount).toBe(1);
    expect(a1.undoneCount).toBe(0);

    history.goTo(2); // Should redo a2 and a3
    expect(history.getUndoStack().length).toBe(3);
    expect(a2.executedCount).toBe(2);
    expect(a3.executedCount).toBe(2);

    history.goTo(-1); // Should undo all
    expect(history.getUndoStack().length).toBe(0);
  });

  it('should track dirty state', () => {
    const history = new ActionHistory();
    const a1 = new MockAction('A1');

    expect(history.isDirty()).toBe(false);
    history.execute(a1);
    expect(history.isDirty()).toBe(true);

    history.markAsSaved();
    expect(history.isDirty()).toBe(false);

    history.undo();
    expect(history.isDirty()).toBe(true);

    history.redo();
    expect(history.isDirty()).toBe(false);
  });
});
