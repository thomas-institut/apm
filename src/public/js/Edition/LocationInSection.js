/**
 * An object representing the location of a main text token within a MainTextSection tree
 */


export class LocationInSection {
  /**
   *
   * @param {number[]} sectionLocation
   * @param {number} textIndex
   */
  constructor (sectionLocation = [], textIndex = -1) {
    /**
     *
     * @member {number[]}
     */
    this.section = sectionLocation
    this.textIndex = textIndex
  }

  /**
   *
   * @return {boolean}
   */
  isNull() {
    return this.section.length === 0
  }
}