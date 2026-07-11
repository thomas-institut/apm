import {ActionResultInterface, actionFailure, actionSuccess, UndoableAction} from '@/toolbox/ActionHistory';
import {deepCopy} from '@/toolbox/Util';

/**
 * Abstract base class for actions that edit a data object of type T.
 *
 * Handles the common pattern:
 * 1. Deep copy old/new data
 * 2. Run transform on the new data copy
 * 3. Compute description from old/new data
 * 4. Catch errors and report them via execute()
 */
export abstract class DataEditAction<T> implements UndoableAction {
  executionTimestamp: number = -1;
  protected readonly oldData: T;
  protected readonly newData: T;
  private readonly description: string;
  private readonly errors: string[] = [];
  private readonly onUpdate: (data: T) => void;

  protected constructor(
    data: T,
    onUpdate: (data: T) => void,
    transform: (data: T) => void,
    fallbackLabel: string,
    descriptionFactory: (oldData: T, newData: T) => string
  ) {
    this.oldData = deepCopy(data);
    this.newData = deepCopy(data);
    this.onUpdate = onUpdate;

    try {
      transform(this.newData);
      this.description = descriptionFactory(this.oldData, this.newData);
    } catch (e) {
      this.errors = [String(e)];
      this.description = fallbackLabel;
    }
  }

  get label() {
    return this.description;
  }

  execute(): ActionResultInterface {
    if (this.errors.length > 0) {
      return actionFailure(this.errors);
    }
    this.onUpdate(this.newData);
    return actionSuccess();
  }

  undo(): ActionResultInterface {
    if (this.errors.length > 0) {
      return actionFailure(this.errors);
    }
    this.onUpdate(this.oldData);
    return actionSuccess();
  }
}