

export class ObjectValidator {

  /**
   * Validates an object and returns a list of problems in the given object.
   *
   * If the returned array is empty, the object is valid
   * @param {int|string}object
   * @return { string[]}
   */
  validateObject(object) {
    console.error('Call to validate object on abstract class ObjectValidator')
    return ['Do not class this method directly'];
  }

  /**
   * Returns a help string
   * @return {string}
   */
  getHelp() {
    return ''
  }
}