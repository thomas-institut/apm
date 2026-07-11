/**
 * Interface for actions that can be undone and redone.
 */
export interface UndoableAction {
  /**
   * Execute the action.
   */
  execute(): void;

  /**
   * Undo the action.
   */
  undo(): void;

  /**
   * Human-readable label for the action.
   */
  label: string;

  /**
   * Timestamp when the action was executed.
   */
  executionTimestamp: number;
}

/**
 * Manages a history of undoable actions.
 */
export class ActionHistory {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private lastSavedIndex: number = 0;
  private currentVersion: number = 0;

  /**
   * Execute a new action and add it to the undo stack.
   * Clears the redo stack.
   * @param action
   */
  execute(action: UndoableAction): void {
    action.execute();
    action.executionTimestamp = Date.now();
    this.undoStack.push(action); // more recently executed action is always at the end of the undo array
    this.redoStack = [];
    this.currentVersion++;
  }

  /**
   * Undo the last action.
   */
  undo(): void {
    const action = this.undoStack.pop();
    if (action) {
      action.undo();
      this.redoStack.push(action); // oldest action is at the end of the redo array
      this.currentVersion++;
    }
  }

  /**
   * Redo the last undone action.
   */
  redo(): void {
    const action = this.redoStack.pop();
    if (action) {
      action.execute();
      this.undoStack.push(action);
      this.currentVersion++;
    }
  }

  /**
   * Go to a specific point in history.
   * @param index The index in the undo stack to go to (-1 means empty stack).
   */
  goTo(index: number): void {
    while (this.undoStack.length - 1 > index) {
      this.undo();
    }
    while (this.undoStack.length - 1 < index && this.redoStack.length > 0) {
      this.redo();
    }
  }

  /**
   * Mark the current state as saved.
   */
  markAsSaved(): void {
    this.lastSavedIndex = this.undoStack.length;
  }

  /**
   * Check if there are unsaved changes.
   */
  isDirty(): boolean {
    return this.undoStack.length !== this.lastSavedIndex;
  }

  /**
   * Get the list of actions in the undo stack.
   */
  getUndoStack(): UndoableAction[] {
    return [...this.undoStack];
  }

  /**
   * Get the list of actions in the redo stack.
   */
  getRedoStack(): UndoableAction[] {
    return [...this.redoStack];
  }

  /**
   * Get the number of unsaved actions.
   */
  getUnsavedActionsCount(): number {
    return Math.abs(this.undoStack.length - this.lastSavedIndex);
  }

  /**
   * Get the labels of unsaved actions.
   */
  getUnsavedActionLabels(): string[] {
    if (this.undoStack.length > this.lastSavedIndex) {
      return this.undoStack.slice(this.lastSavedIndex).map(a => a.label);
    } else if (this.undoStack.length < this.lastSavedIndex) {
      // User undone past the last saved point
      return [`(Undone) ${this.lastSavedIndex - this.undoStack.length} actions`];
    }
    return [];
  }

  /**
   * Get the index of the last saved state in the undo stack.
   */
  getLastSavedIndex(): number {
    return this.lastSavedIndex;
  }

  /**
   * Revert to the last saved state.
   */
  revertToSaved(): void {
    this.goTo(this.lastSavedIndex - 1);
  }

  /**
   * Get a version number that increments on every change.
   * Useful for triggering React re-renders.
   */
  getVersion(): number {
    return this.currentVersion;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastSavedIndex = 0;
    this.currentVersion++;
  }
}
