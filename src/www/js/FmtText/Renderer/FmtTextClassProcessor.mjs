


export class FmtTextClassProcessor {

  constructor () {
    this.className = ''
  }

  /**
   *
   * @return {string}
   */
  getClassName() {
    return this.className
  }

  /**
   * Applies the class associated with this processor to given target
   * using the information in the given token.
   * The processor assumes that all c
   * Returns false if the no more classes should be processed after this.
   * @param {FmtTextToken}token
   * @param {any }target
   * @return {boolean}
   */
  applyClass(token, target) {
    return true
  }

}