

export class SubEntryWitnessInfo {

  /**
   *
   * @param {number} witnessIndex
   */
  constructor (witnessIndex = -1) {
    this.witnessIndex = witnessIndex
    this.hand = 0
    // TODO: add more stuff here: location, technique, etc
  }

  /**
   *
   * @param {number} witnessIndex
   * @returns {SubEntryWitnessInfo}
   */
  setWitnessIndex(witnessIndex) {
    this.witnessIndex = witnessIndex
    return this
  }

  /**
   *
   * @param {number} hand
   * @returns {SubEntryWitnessInfo}
   */
  setHand(hand) {
    this.hand = hand
    return this
  }
}