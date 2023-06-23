

export class ObjectUtil {

  /**
   * Deep traverses an object or an array to find all values at all levels for
   * the given key
   * @param {any}someVariable
   * @param {string}key
   * @return []
   */
  static deepGetValuesForKey(someVariable, key) {
    if (someVariable === null || typeof someVariable !== 'object') {
      return []
    }
    // ARRAY
    if (Array.isArray(someVariable)) {
      let values = []
      someVariable.forEach( (element) => {
        values.push(...this.deepGetValuesForKey(element, key))
      })
      return values
    }
    // OBJECT
    let values = []
    Object.keys(someVariable).forEach( (objectKey) => {
      if (objectKey === key) {
        values.push(someVariable[key])
      } else {
        // for any other object element, add up all found values inside the element
        values.push(...this.deepGetValuesForKey(someVariable[objectKey], key))
      }
    })
    return values
  }

}