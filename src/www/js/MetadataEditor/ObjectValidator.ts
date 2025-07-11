

export class ObjectValidator {

  /**
   * Validates the provided object. This method is intended to be overridden in derived classes.
   *
   * @param {number|string} object The object to be validated. Can be a number or a string.
   * @return {string[]} An array of error messages or validation results. Returns a default message if called directly.
   */
  validateObject(object: number|string): string[] {
    console.error('Call to validate object on abstract class ObjectValidator')
    return ['Do not class this method directly'];
  }

  /**
   * Returns a help string
   * @return {string}
   */
  getHelp(): string {
    return ''
  }
}