import {hashString} from "@/ReactAPM/ToolBox/Hash";

export interface StateTransformAction<T> {
  /**
   * Executes the action on the given state and returns the new state.
   *
   * Must throw an error if the action fails.
   *
   * @param state
   */
  execute(state:T): T;


  /**
   * Returns a description of the action that can be used to display the action in a history.
   *
   * @param state
   */
  description(state:T): string;
}

export interface StateHistoryItem<T> {
  state: T;
  signature: string;
  actionDescription: string;
  executionTimestamp: number;
}

export class StateHistory<T> {

  private stateHistory: StateHistoryItem<T>[];
  private currentStateIndex: number;

  constructor(initialState: T) {
    this.stateHistory = [{ state: initialState, signature: this.getStateSignature(initialState), actionDescription: 'Initial State', executionTimestamp: Date.now() }];
    this.currentStateIndex = 0;
  }

  getHistory() : StateHistoryItem<T>[] {
    return this.stateHistory;
  }

  getCurrentStateIndex(): number {
    return this.currentStateIndex;
  }

  getCurrentStateSignature(): string {
    return this.stateHistory[this.currentStateIndex].signature;
  }

  /**
   * Returns the minimal state history from a specific state to another.
   *
   * A minimal history is the shortest possible path between two states, including the states themselves.
   *
   * If one of the given states is not found, an empty array is returned.
   *
   * For example, assume the complete history has states with the following signatures: `[ a, x, a, c, d, x, e]`.
   *
   * - getHistory() = getHistory(a) = getHistory(a, e) = getHistory(null, e) = `[ a, c, d, x, e]` : from the latest _a_ in the history
   * - getHistory(c, d) = `[c, d]`
   * - getHistory(x, x) = `[x]`, the first x state will be returned
   * - getHistory(a, x) = `[a, x]`, which is shorter than `[a, c, d, x]`
   *
   * @param fromState signature or state object, defaults to the initial state
   * @param toState signature or state object, defaults to the last state
   *
   */
  getMinimalHistory(fromState: string|T|null= null, toState: string|T|null = null): StateHistoryItem<T>[] {
    const fromIndex = this.getStateIndex(fromState ?? 0);
    if (fromIndex < 0) {
      console.warn('fromState not found', fromState);
      return [];
    }
    const toIndex = this.getStateIndex(toState ?? this.stateHistory.length-1);
    if (toIndex < 0) {
      console.warn('toState not found', toState);
      return [];
    }

    const fromSignature = this.stateHistory[fromIndex].signature;
    const toSignature = this.stateHistory[toIndex].signature;
    if (fromSignature === toSignature) {
      return [ this.stateHistory[fromIndex]];
    }

    const histories: StateHistoryItem<T>[][] = [];

    let fsmState = 0;
    let currentHistory:StateHistoryItem<T>[] = [];
    for (let i = 0; i < this.stateHistory.length; i++) {
      const state = this.stateHistory[i];
      switch (fsmState) {
        case 0: // waiting for fromSignature
          if (state.signature === fromSignature) {
            currentHistory.push(state);
            fsmState = 1;
          }
          break;

        case 1: // waiting for toSignature
          if (state.signature === toSignature) {
            currentHistory.push(state);
            histories.push(currentHistory);
            fsmState = 0;
            currentHistory = [];
          }
          if (state.signature === fromSignature) {
            // found a later fromSignature, need to reset the current history
            currentHistory = [];
          }
          currentHistory.push(state)
          break;
      }
    }

    if (histories.length === 0) {
      return [];
    }
    if (histories.length === 1) {
      return histories[0];
    }
    // find the shortest
    histories.sort((a, b) => a.length - b.length);
    return histories[0];
  }

  /**
   * Goes to a specific state in the history.
   * @param stateIndex state index, signature or state object
   */
  goToState(stateIndex: number): T {
    if (stateIndex < 0 || stateIndex >= this.stateHistory.length) {
      throw new Error('Invalid state index');
    }
    this.currentStateIndex = stateIndex;
    return this.getCurrentState();
  }

  private getStateIndex(state: number|string|T) {
    if (typeof state === 'number') {
      return state;
    }
    if (typeof state === 'string') {
      return this.stateHistory.findIndex(s => s.signature === state);
    }
    const signature = this.getStateSignature(state);
    return this.stateHistory.findIndex(s => s.signature === signature);
  }

  do(action: StateTransformAction<T>): T {
    const initialState = this.getCurrentState();
    const newState = action.execute(initialState);
    const newSignature = this.getStateSignature(newState);
    const newActionDescription = action.description(initialState);

    if (newSignature === this.stateHistory[this.currentStateIndex].signature) {
      // the action did not change the state, do nothing
      console.warn(`Action did not change the state: '${newActionDescription}'`);
      return newState;
    }

    // check if the new state has the same signature as the next state and just move to it: this an effective redo
    if (this.currentStateIndex < this.stateHistory.length - 1 && newSignature === this.stateHistory[this.currentStateIndex + 1].signature) {
      this.currentStateIndex++;
      return newState;
    }

    // check if the new state has the same signature as the previous state and just move to it: this is an effective undo
    if (this.currentStateIndex > 0 && newSignature === this.stateHistory[this.currentStateIndex - 1].signature) {
      this.currentStateIndex--;
      return newState;
    }

    // completely new state: clip the history to current state and push the new state
    this.stateHistory = this.stateHistory.slice(0, this.currentStateIndex + 1);
    this.stateHistory.push({ state: newState, signature: newSignature, actionDescription: newActionDescription, executionTimestamp: Date.now()});
    this.currentStateIndex++;
    return newState;
  }

  undo(): T {
    if (this.currentStateIndex === 0) {
      throw new Error('Cannot undo further');
    }
    this.currentStateIndex--;
    return this.getCurrentState();
  }

  redo(): T {
    if (this.currentStateIndex === this.stateHistory.length - 1) {
      throw new Error('Cannot redo further');
    }
    this.currentStateIndex++;
    return this.getCurrentState();
  }

  getCurrentState(): T {
    return this.stateHistory[this.currentStateIndex].state;
  }

  private getStateSignature(state: T): string {
    return hashString(JSON.stringify(state));
  }

}
