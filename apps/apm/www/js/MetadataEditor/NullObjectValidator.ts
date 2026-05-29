import { ObjectValidator } from './ObjectValidator'

/**
 * A validator that does not check anything!
 */
export class NullObjectValidator extends ObjectValidator {
  validateObject (object: number|string):string[] {
    return [];
  }

  getHelp():string {
    return '';
  }
}