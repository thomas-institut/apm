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
 *
 * Maintains a single chronological array of all executed actions,
 * with a currentIndex pointer for undo/redo navigation.
 */
export class ActionHistory {
  private actions: UndoableAction[] = [];
  private currentIndex: number = -1;
  private lastSavedIndex: number = -1;

  /**
   * Execute a new action and add it to the history.
   * Discards any future actions (those after currentIndex).
   * @param action
   */
  execute(action: UndoableAction): void {
    // Discard any future actions
    this.actions = this.actions.slice(0, this.currentIndex + 1);

    action.execute();
    action.executionTimestamp = Date.now();
    this.actions.push(action);
    this.currentIndex = this.actions.length - 1;
  }

  /**
   * Undo the last action.
   */
  undo(): void {
    if (this.currentIndex >= 0) {
      this.actions[this.currentIndex].undo();
      this.currentIndex--;
    }
  }

  /**
   * Redo the next undone action.
   */
  redo(): void {
    if (this.currentIndex < this.actions.length - 1) {
      this.currentIndex++;
      this.actions[this.currentIndex].execute();
    }
  }

  /**
   * Go to a specific point in history.
   * @param index The action index to go to (-1 means before any actions).
   */
  goTo(index: number): void {
    while (this.currentIndex > index) {
      this.undo();
    }
    while (this.currentIndex < index) {
      this.redo();
    }
  }

  /**
   * Mark the current state as saved.
   */
  markAsSaved(): void {
    this.lastSavedIndex = this.currentIndex;
  }

  /**
   * Check if there are unsaved changes.
   */
  isDirty(): boolean {
    return this.currentIndex !== this.lastSavedIndex;
  }

  /**
   * Get the list of executed actions (compat).
   */
  getUndoStack(): UndoableAction[] {
    return this.actions.slice(0, this.currentIndex + 1);
  }

  /**
   * Get the list of future (undone) actions (compat).
   */
  getRedoStack(): UndoableAction[] {
    return this.actions.slice(this.currentIndex + 1);
  }

  /**
   * Get all actions in chronological order.
   */
  getActions(): UndoableAction[] {
    return [...this.actions];
  }

  /**
   * Get the index of the current action (-1 if none).
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get the labels of unsaved actions.
   */
  getUnsavedActionLabels(): string[] {
    if (this.currentIndex > this.lastSavedIndex) {
      return this.actions
        .slice(this.lastSavedIndex + 1, this.currentIndex + 1)
        .map(a => a.label);
    } else if (this.currentIndex < this.lastSavedIndex) {
      return [`(Undone) ${this.lastSavedIndex - this.currentIndex} actions`];
    }
    return [];
  }

  /**
   * Get the index of the last saved state.
   */
  getLastSavedIndex(): number {
    return this.lastSavedIndex;
  }

  /**
   * Revert to the last saved state.
   */
  revertToSaved(): void {
    this.goTo(this.lastSavedIndex);
  }

  /**
   * Get a version number useful for triggering re-renders.
   */
  getVersion(): number {
    return this.currentIndex;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.actions = [];
    this.currentIndex = -1;
    this.lastSavedIndex = -1;
  }
}