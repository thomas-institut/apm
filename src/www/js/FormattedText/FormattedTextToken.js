import { KeyCache } from '../toolbox/KeyCache'

class FormattedTextToken {

  /**
   *
   * @param {string | {}}someThing
   */
  constructor (someThing = '') {
     this.__fromAnything(someThing)
  }

  /**
   *
   * @param {string}someString
   * @return {FormattedTextToken}
   */
  setText(someString) {
    this.text = someString
    return this
  }

  /**
   *
   * @param {object} someObject
   * @return {FormattedTextToken}
   */
  setAttributes(someObject) {
    this.__copyAttributes(someObject)
    return this
  }

  /**
   *
   * @return {FormattedTextToken}
   */
  resetAttributes() {
    this.__resetAttributes()
    return this
  }

  __resetAttributes () {
    this.attributes = {}
  }


  __fromAnything(someThing) {
    if (typeof someThing === 'string') {
      this.__fromString(someThing)
    }
    if (typeof someThing === 'object' && someThing !== null && !Array.isArray(someThing)) {
      this.__fromObject(someThing)
    } else {
      throw new Error('Trying to construct a FormattedTextToken from something other than a string or an object')
    }
    return this
  }

  /**
   *
   * @param {string} someString
   * @private
   */
  __fromString(someString){
    this.text = someString
    this.attributes = { }
  }

  /**
   *
   * @param { object }someObject
   * @private
   */
  __fromObject(someObject) {
    if (someObject['text'] === undefined || typeof  someObject !== 'string') {
      throw new Error('Given object to create FormattedTextToken does not have a string text field')
    }
    this.text = someObject['text']
    this.__resetAttributes()
    this.__copyAttributes(someObject)
  }

  /**
   *
   * @param {object} someObject
   * @private
   */
  __copyAttributes(someObject) {
    Object.keys(someObject).forEach( (key) => {
      if (key !== 'text') {
        this.attributes[key] = someObject[key]
      }
    })
  }

}