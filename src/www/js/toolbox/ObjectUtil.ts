

export function deepAreEqual(obj1:any, obj2:any) {
  return JSON.stringify(obj1)=== JSON.stringify(obj2);
}

/**
 * Deep traverses an object or an array to find all values at all levels for
 * the given key
 * @param {any}someVariable
 * @param {string}key
 * @return []
 */
export function deepGetValuesForKey(someVariable: any, key: string): any[] {
  if (someVariable === null || typeof someVariable !== 'object') {
    return []
  }
  // ARRAY
  if (Array.isArray(someVariable)) {
    let values: any[] = []
    someVariable.forEach( (element) => {
      values.push(...deepGetValuesForKey(element, key))
    })
    return values
  }
  // OBJECT
  let values: any[] = []
  Object.keys(someVariable).forEach( (objectKey) => {
    if (objectKey === key) {
      values.push(someVariable[key])
    } else {
      // for any other object element, add up all found values inside the element
      values.push(...deepGetValuesForKey(someVariable[objectKey], key))
    }
  })
  return values
}