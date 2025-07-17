


export class EditionWitnessInfo {

  constructor () {
    /** @member {string} siglum */
    this.siglum = ''
    /** @member {string} title */
    this.title = ''
  }

  /**
   *
   * @param {string }siglum
   * @return {EditionWitnessInfo}
   */
  setSiglum(siglum) {
    this.siglum = siglum
    return this
  }

  /**
   *
   * @param {string }title
   * @return {EditionWitnessInfo}
   */
  setTitle(title) {
    this.title = title
    return this
  }

}